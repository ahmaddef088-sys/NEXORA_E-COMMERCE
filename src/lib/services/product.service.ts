/**
 * Product service — CRUD operations for the product catalog.
 *
 * Security contract:
 * - Read operations are public (GET) with optional active filtering.
 * - Write operations (POST, PATCH) require ADMIN role — enforced by route handlers.
 * - Prices and stock are always recalculated server-side.
 */

import { prisma } from '@/lib/db/prisma';
import { ConflictError, NotFoundError } from '@/lib/errors/HttpError';
import { logger } from '@/lib/logger';
import { buildPaginationMeta } from '@/lib/api/response';
import type { CreateProductInput, UpdateProductInput, ProductQuery } from '@/lib/validation/product.schema';
import type { PaginationMeta } from '@/lib/api/response';
import type { Prisma } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

// Prisma returns Decimal objects for @db.Decimal fields; we expose them as-is.
// Serialization to JSON (via Next.js) converts them to string representations.
export type SafeProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sku: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  price: any; // Prisma Decimal — serialized as string in API responses
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  compareAtPrice: any | null; // Prisma Decimal | null
  stock: number;
  isActive: boolean;
  image: string | null;
  categoryId: string | null;
  createdAt: Date;
  updatedAt: Date;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

export type ProductListResult = {
  data: SafeProduct[];
  meta: PaginationMeta;
};

// ─── Selectors ────────────────────────────────────────────────────────────────

const productSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  sku: true,
  price: true,
  compareAtPrice: true,
  stock: true,
  isActive: true,
  image: true,
  categoryId: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
} as const;

// ─── List products ────────────────────────────────────────────────────────────

export async function listProducts(
  query: ProductQuery,
  adminView = false
): Promise<ProductListResult> {
  const {
    page,
    limit,
    search,
    categoryId,
    isActive,
    minPrice,
    maxPrice,
    sortBy,
    sortOrder,
    inStock,
    hasDiscount,
  } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = {};

  // Non-admin callers can only see active products
  if (!adminView) {
    where.isActive = true;
  } else if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {
      ...(minPrice !== undefined ? { gte: minPrice } : {}),
      ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
    };
  }

  if (inStock !== undefined) {
    if (inStock) {
      where.stock = { gt: 0 };
    } else {
      where.stock = { lte: 0 };
    }
  }

  if (hasDiscount) {
    where.compareAtPrice = { not: null };
  }

  const [data, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      select: productSelect,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    data: data as SafeProduct[],
    meta: buildPaginationMeta(page, limit, total),
  };
}

// ─── Get related products ─────────────────────────────────────────────────────

export async function getRelatedProducts(
  productId: string,
  limit = 4
): Promise<SafeProduct[]> {
  const current = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, categoryId: true },
  });

  if (!current) {
    throw NotFoundError('Product');
  }

  // 1. Fetch products from the same category
  const related = await prisma.product.findMany({
    where: {
      id: { not: productId },
      isActive: true,
      ...(current.categoryId ? { categoryId: current.categoryId } : {}),
    },
    select: productSelect,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  // 2. If fewer than limit found and category was filtered, backfill with general active products
  if (related.length < limit && current.categoryId) {
    const existingIds = [productId, ...related.map((p) => p.id)];
    const additional = await prisma.product.findMany({
      where: {
        id: { notIn: existingIds },
        isActive: true,
      },
      select: productSelect,
      orderBy: { createdAt: 'desc' },
      take: limit - related.length,
    });
    return [...related, ...additional] as SafeProduct[];
  }

  return related as SafeProduct[];
}

// ─── Get featured products ────────────────────────────────────────────────────

export async function getFeaturedProducts(limit = 8): Promise<SafeProduct[]> {
  const featured = await prisma.product.findMany({
    where: {
      isActive: true,
      stock: { gt: 0 },
    },
    select: productSelect,
    orderBy: [{ compareAtPrice: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  });

  return featured as SafeProduct[];
}

// ─── Get product by ID ────────────────────────────────────────────────────────

export async function getProductById(
  id: string,
  adminView = false
): Promise<SafeProduct> {
  const product = await prisma.product.findUnique({
    where: { id },
    select: productSelect,
  });

  if (!product) {
    throw NotFoundError('Product');
  }

  if (!adminView && !product.isActive) {
    throw NotFoundError('Product');
  }

  return product as SafeProduct;
}

// ─── Get product by slug ──────────────────────────────────────────────────────

export async function getProductBySlug(
  slug: string,
  adminView = false
): Promise<SafeProduct> {
  const product = await prisma.product.findUnique({
    where: { slug },
    select: productSelect,
  });

  if (!product) {
    throw NotFoundError('Product');
  }

  if (!adminView && !product.isActive) {
    throw NotFoundError('Product');
  }

  return product as SafeProduct;
}

// ─── Create product ───────────────────────────────────────────────────────────

export async function createProduct(input: CreateProductInput): Promise<SafeProduct> {
  // Check SKU uniqueness
  const skuConflict = await prisma.product.findUnique({ where: { sku: input.sku } });
  if (skuConflict) {
    throw ConflictError(`A product with SKU "${input.sku}" already exists`);
  }

  // Check slug uniqueness
  const slugConflict = await prisma.product.findUnique({ where: { slug: input.slug } });
  if (slugConflict) {
    throw ConflictError(`A product with slug "${input.slug}" already exists`);
  }

  const product = await prisma.product.create({
    data: {
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      sku: input.sku,
      price: input.price,
      compareAtPrice: input.compareAtPrice ?? null,
      stock: input.stock ?? 0,
      isActive: input.isActive ?? true,
      image: input.image ?? null,
      categoryId: input.categoryId ?? null,
    },
    select: productSelect,
  });

  logger.info('Product created', { productId: product.id, sku: product.sku });

  return product as SafeProduct;
}

// ─── Update product ───────────────────────────────────────────────────────────

export async function updateProduct(
  id: string,
  input: UpdateProductInput
): Promise<SafeProduct> {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    throw NotFoundError('Product');
  }

  // Check SKU uniqueness if changing
  if (input.sku && input.sku !== existing.sku) {
    const skuConflict = await prisma.product.findUnique({ where: { sku: input.sku } });
    if (skuConflict) {
      throw ConflictError(`A product with SKU "${input.sku}" already exists`);
    }
  }

  // Check slug uniqueness if changing
  if (input.slug && input.slug !== existing.slug) {
    const slugConflict = await prisma.product.findUnique({ where: { slug: input.slug } });
    if (slugConflict) {
      throw ConflictError(`A product with slug "${input.slug}" already exists`);
    }
  }

  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.sku !== undefined ? { sku: input.sku } : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.compareAtPrice !== undefined ? { compareAtPrice: input.compareAtPrice } : {}),
      ...(input.stock !== undefined ? { stock: input.stock } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.image !== undefined ? { image: input.image } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
    },
    select: productSelect,
  });

  logger.info('Product updated', { productId: id });

  return updated as SafeProduct;
}
