/**
 * Inventory service — stock management, adjustments, and movement tracking.
 *
 * Security contract:
 * - All write operations require ADMIN role (enforced by route handlers).
 * - Negative stock is prevented at the database level and here.
 * - All stock changes go through transactions to prevent race conditions.
 * - Stock movements provide a full audit trail.
 */

import { prisma } from '@/lib/db/prisma';
import { BadRequestError, NotFoundError, UnprocessableError } from '@/lib/errors/HttpError';
import { logger } from '@/lib/logger';
import { buildPaginationMeta } from '@/lib/api/response';
import type { StockAdjustmentInput, InventoryQuery } from '@/lib/validation/inventory.schema';
import type { PaginationMeta } from '@/lib/api/response';

// ─── Constants ────────────────────────────────────────────────────────────────

const LOW_STOCK_THRESHOLD = 10;

// ─── Types ────────────────────────────────────────────────────────────────────

export type InventoryRecord = {
  id: string;
  productId: string;
  quantity: number;
  reserved: number;
  available: number; // computed: quantity - reserved
  updatedAt: Date;
  product: {
    id: string;
    name: string;
    sku: string;
    stock: number;
  };
};

export type StockMovementRecord = {
  id: string;
  productId: string;
  type: string;
  quantity: number;
  reason: string | null;
  createdAt: Date;
};

// ─── Get or create inventory record ──────────────────────────────────────────

async function getOrCreateInventory(productId: string) {
  return prisma.inventory.upsert({
    where: { productId },
    create: { productId, quantity: 0, reserved: 0 },
    update: {},
    select: { id: true, productId: true, quantity: true, reserved: true, updatedAt: true },
  });
}

// ─── Get inventory for product ────────────────────────────────────────────────

export async function getProductInventory(productId: string): Promise<InventoryRecord> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, sku: true, stock: true },
  });

  if (!product) {
    throw NotFoundError('Product');
  }

  const inventory = await getOrCreateInventory(productId);

  return {
    id: inventory.id,
    productId: inventory.productId,
    quantity: inventory.quantity,
    reserved: inventory.reserved,
    available: inventory.quantity - inventory.reserved,
    updatedAt: inventory.updatedAt,
    product,
  };
}

// ─── List inventory ───────────────────────────────────────────────────────────

export async function listInventory(query: InventoryQuery): Promise<{
  data: InventoryRecord[];
  meta: PaginationMeta;
}> {
  const { page, limit, productId, lowStock, sortOrder } = query;
  const skip = (page - 1) * limit;

  // Build inventory query
  const where = {
    ...(productId ? { productId } : {}),
    ...(lowStock ? { quantity: { lte: LOW_STOCK_THRESHOLD } } : {}),
  };

  const [inventories, total] = await prisma.$transaction([
    prisma.inventory.findMany({
      where,
      select: {
        id: true,
        productId: true,
        quantity: true,
        reserved: true,
        updatedAt: true,
        product: { select: { id: true, name: true, sku: true, stock: true } },
      },
      orderBy: { updatedAt: sortOrder },
      skip,
      take: limit,
    }),
    prisma.inventory.count({ where }),
  ]);

  const data: InventoryRecord[] = inventories.map((inv) => ({
    id: inv.id,
    productId: inv.productId,
    quantity: inv.quantity,
    reserved: inv.reserved,
    available: inv.quantity - inv.reserved,
    updatedAt: inv.updatedAt,
    product: inv.product,
  }));

  return { data, meta: buildPaginationMeta(page, limit, total) };
}

// ─── Adjust stock ─────────────────────────────────────────────────────────────

export async function adjustStock(
  productId: string,
  input: StockAdjustmentInput
): Promise<InventoryRecord> {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, sku: true, stock: true },
    });

    if (!product) {
      throw NotFoundError('Product');
    }

    const inventory = await tx.inventory.upsert({
      where: { productId },
      create: { productId, quantity: 0, reserved: 0 },
      update: {},
      select: { id: true, productId: true, quantity: true, reserved: true, updatedAt: true },
    });

    let newQuantity = inventory.quantity;
    let newProductStock = product.stock;

    switch (input.type) {
      case 'IN':
        newQuantity = inventory.quantity + input.quantity;
        newProductStock = product.stock + input.quantity;
        break;
      case 'OUT':
        newQuantity = inventory.quantity - input.quantity;
        newProductStock = product.stock - input.quantity;
        if (newQuantity < 0 || newProductStock < 0) {
          throw UnprocessableError(
            `Cannot remove ${input.quantity} units — only ${Math.min(inventory.quantity, product.stock)} available`
          );
        }
        break;
      case 'ADJUSTMENT':
        // Direct quantity set
        newQuantity = input.quantity;
        newProductStock = input.quantity;
        break;
      case 'RETURN':
        newQuantity = inventory.quantity + input.quantity;
        newProductStock = product.stock + input.quantity;
        break;
      default:
        throw BadRequestError(`Unknown stock movement type`);
    }

    // Update inventory record
    const updated = await tx.inventory.update({
      where: { productId },
      data: { quantity: newQuantity },
      select: { id: true, productId: true, quantity: true, reserved: true, updatedAt: true },
    });

    // Update product stock (keeping them in sync)
    await tx.product.update({
      where: { id: productId },
      data: { stock: newProductStock },
    });

    // Record the stock movement for audit trail
    await tx.stockMovement.create({
      data: {
        productId,
        type: input.type,
        quantity: input.quantity,
        reason: input.reason ?? null,
      },
    });

    // Check if stock is now low
    if (newQuantity <= LOW_STOCK_THRESHOLD) {
      logger.warn('Low stock alert', { productId, productName: product.name, stock: newQuantity });
    }

    logger.info('Stock adjusted', {
      productId,
      type: input.type,
      quantity: input.quantity,
      newStock: newQuantity,
    });

    return {
      id: updated.id,
      productId: updated.productId,
      quantity: updated.quantity,
      reserved: updated.reserved,
      available: updated.quantity - updated.reserved,
      updatedAt: updated.updatedAt,
      product: { id: product.id, name: product.name, sku: product.sku, stock: newProductStock },
    };
  });
}

// ─── Get stock movements ──────────────────────────────────────────────────────

export async function getStockMovements(
  productId: string,
  limit = 50
): Promise<StockMovementRecord[]> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });

  if (!product) {
    throw NotFoundError('Product');
  }

  const movements = await prisma.stockMovement.findMany({
    where: { productId },
    select: {
      id: true,
      productId: true,
      type: true,
      quantity: true,
      reason: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return movements as StockMovementRecord[];
}

// ─── Get low stock products ───────────────────────────────────────────────────

export async function getLowStockProducts(threshold = LOW_STOCK_THRESHOLD): Promise<InventoryRecord[]> {
  const inventories = await prisma.inventory.findMany({
    where: { quantity: { lte: threshold } },
    select: {
      id: true,
      productId: true,
      quantity: true,
      reserved: true,
      updatedAt: true,
      product: { select: { id: true, name: true, sku: true, stock: true } },
    },
    orderBy: { quantity: 'asc' },
  });

  return inventories.map((inv) => ({
    id: inv.id,
    productId: inv.productId,
    quantity: inv.quantity,
    reserved: inv.reserved,
    available: inv.quantity - inv.reserved,
    updatedAt: inv.updatedAt,
    product: inv.product,
  }));
}
