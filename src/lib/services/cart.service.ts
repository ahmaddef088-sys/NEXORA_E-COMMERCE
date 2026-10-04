/**
 * Cart service — shopping cart management.
 *
 * Security contract:
 * - All operations require authentication.
 * - Cart is user-scoped — users can only access their own cart.
 * - Product existence, active state, and stock availability are validated server-side.
 * - Prices are NEVER taken from the frontend — only current DB prices are used.
 * - Quantities are validated against current stock on every mutation.
 */

import { prisma } from '@/lib/db/prisma';
import { ForbiddenError, InsufficientStockError, NotFoundError } from '@/lib/errors/HttpError';
import { logger } from '@/lib/logger';
import type { AddCartItemInput, UpdateCartItemInput } from '@/lib/validation/cart.schema';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CartItemDetail = {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    slug: string;
    sku: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    price: any; // Prisma Decimal
    stock: number;
    isActive: boolean;
    categoryId: string | null;
  };
};

export type CartDetail = {
  id: string;
  userId: string;
  items: CartItemDetail[];
};

// ─── Selectors ────────────────────────────────────────────────────────────────

const cartItemSelect = {
  id: true,
  cartId: true,
  productId: true,
  quantity: true,
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      sku: true,
      price: true,
      stock: true,
      isActive: true,
      categoryId: true,
    },
  },
} as const;

// ─── Get or create cart ───────────────────────────────────────────────────────

async function getOrCreateCart(userId: string) {
  const existing = await prisma.cart.findUnique({
    where: { userId },
    select: { id: true, userId: true },
  });

  if (existing) return existing;

  return prisma.cart.create({
    data: { userId },
    select: { id: true, userId: true },
  });
}

// ─── Get cart ─────────────────────────────────────────────────────────────────

export async function getCart(userId: string): Promise<CartDetail> {
  const cart = await getOrCreateCart(userId);

  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    select: cartItemSelect,
    orderBy: { createdAt: 'asc' },
  });

  return {
    id: cart.id,
    userId: cart.userId,
    items: items as CartItemDetail[],
  };
}

// ─── Add item to cart ─────────────────────────────────────────────────────────

export async function addCartItem(
  userId: string,
  input: AddCartItemInput
): Promise<CartDetail> {
  return prisma.$transaction(async (tx) => {
    // Validate product exists, is active, and has enough stock
    const product = await tx.product.findUnique({
      where: { id: input.productId },
      select: { id: true, name: true, stock: true, isActive: true },
    });

    if (!product || !product.isActive) {
      throw NotFoundError('Product');
    }

    if (product.stock < input.quantity) {
      throw InsufficientStockError(product.name);
    }

    // Get or create cart for this user
    const cart = await tx.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
      select: { id: true, userId: true },
    });

    // Check if item already exists in cart
    const existingItem = await tx.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId: input.productId } },
      select: { id: true, quantity: true },
    });

    if (existingItem) {
      // Update existing item quantity
      const newQuantity = existingItem.quantity + input.quantity;

      if (product.stock < newQuantity) {
        throw InsufficientStockError(product.name);
      }

      await tx.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });
    } else {
      await tx.cartItem.create({
        data: {
          cartId: cart.id,
          productId: input.productId,
          quantity: input.quantity,
        },
      });
    }

    // Return updated cart
    const items = await tx.cartItem.findMany({
      where: { cartId: cart.id },
      select: cartItemSelect,
      orderBy: { createdAt: 'asc' },
    });

    logger.info('Cart item added', { userId, productId: input.productId, quantity: input.quantity });

    return {
      id: cart.id,
      userId: cart.userId,
      items: items as CartItemDetail[],
    };
  });
}

// ─── Update cart item quantity ────────────────────────────────────────────────

export async function updateCartItem(
  userId: string,
  itemId: string,
  input: UpdateCartItemInput
): Promise<CartDetail> {
  return prisma.$transaction(async (tx) => {
    // Find the cart item and verify ownership via cart → user
    const cartItem = await tx.cartItem.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        cartId: true,
        productId: true,
        quantity: true,
        cart: { select: { userId: true } },
        product: { select: { id: true, name: true, stock: true, isActive: true } },
      },
    });

    if (!cartItem) {
      throw NotFoundError('Cart item');
    }

    // Ownership check
    if (cartItem.cart.userId !== userId) {
      throw ForbiddenError('Access denied');
    }

    // Re-validate product state and stock
    if (!cartItem.product.isActive) {
      throw NotFoundError('Product');
    }

    if (cartItem.product.stock < input.quantity) {
      throw InsufficientStockError(cartItem.product.name);
    }

    await tx.cartItem.update({
      where: { id: itemId },
      data: { quantity: input.quantity },
    });

    const items = await tx.cartItem.findMany({
      where: { cartId: cartItem.cartId },
      select: cartItemSelect,
      orderBy: { createdAt: 'asc' },
    });

    logger.info('Cart item updated', { userId, itemId, quantity: input.quantity });

    return {
      id: cartItem.cartId,
      userId,
      items: items as CartItemDetail[],
    };
  });
}

// ─── Remove cart item ─────────────────────────────────────────────────────────

export async function removeCartItem(userId: string, itemId: string): Promise<CartDetail> {
  return prisma.$transaction(async (tx) => {
    const cartItem = await tx.cartItem.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        cartId: true,
        cart: { select: { userId: true } },
      },
    });

    if (!cartItem) {
      throw NotFoundError('Cart item');
    }

    if (cartItem.cart.userId !== userId) {
      throw ForbiddenError('Access denied');
    }

    await tx.cartItem.delete({ where: { id: itemId } });

    const items = await tx.cartItem.findMany({
      where: { cartId: cartItem.cartId },
      select: cartItemSelect,
      orderBy: { createdAt: 'asc' },
    });

    logger.info('Cart item removed', { userId, itemId });

    return {
      id: cartItem.cartId,
      userId,
      items: items as CartItemDetail[],
    };
  });
}

// ─── Clear cart ───────────────────────────────────────────────────────────────

export async function clearCart(userId: string): Promise<void> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!cart) return; // Cart doesn't exist — nothing to clear

  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

  logger.info('Cart cleared', { userId });
}
