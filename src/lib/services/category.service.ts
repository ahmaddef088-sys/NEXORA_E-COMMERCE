/**
 * Category service — CRUD operations for product categories.
 *
 * Security contract:
 * - Read operations are public (GET).
 * - Write operations (POST, PATCH) require ADMIN role — enforced by route handlers.
 * - Slug uniqueness is enforced at the database level and validated here.
 */

import { prisma } from '@/lib/db/prisma';
import { ConflictError, NotFoundError } from '@/lib/errors/HttpError';
import { logger } from '@/lib/logger';
import { buildPaginationMeta } from '@/lib/api/response';
import type { CreateCategoryInput, UpdateCategoryInput, CategoryQuery } from '@/lib/validation/category.schema';
import type { PaginationMeta } from '@/lib/api/response';
import type { Prisma } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SafeCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CategoryListResult = {
  data: SafeCategory[];
  meta: PaginationMeta;
};

// ─── Selectors ────────────────────────────────────────────────────────────────

const categorySelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  image: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ─── List categories ──────────────────────────────────────────────────────────

export async function listCategories(query: CategoryQuery): Promise<CategoryListResult> {
  const { page, limit, search, isActive, sortBy, sortOrder } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.CategoryWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  const [data, total] = await prisma.$transaction([
    prisma.category.findMany({
      where,
      select: categorySelect,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.category.count({ where }),
  ]);

  return {
    data: data as SafeCategory[],
    meta: buildPaginationMeta(page, limit, total),
  };
}

// ─── Get category by ID ───────────────────────────────────────────────────────

export async function getCategoryById(id: string): Promise<SafeCategory> {
  const category = await prisma.category.findUnique({
    where: { id },
    select: categorySelect,
  });

  if (!category) {
    throw NotFoundError('Category');
  }

  return category as SafeCategory;
}

// ─── Get category by slug ─────────────────────────────────────────────────────

export async function getCategoryBySlug(slug: string): Promise<SafeCategory> {
  const category = await prisma.category.findUnique({
    where: { slug },
    select: categorySelect,
  });

  if (!category) {
    throw NotFoundError('Category');
  }

  return category as SafeCategory;
}

// ─── Create category ──────────────────────────────────────────────────────────

export async function createCategory(input: CreateCategoryInput): Promise<SafeCategory> {
  // Check slug uniqueness
  const existing = await prisma.category.findUnique({ where: { slug: input.slug } });
  if (existing) {
    throw ConflictError(`A category with slug "${input.slug}" already exists`);
  }

  const category = await prisma.category.create({
    data: {
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      image: input.image ?? null,
      isActive: input.isActive ?? true,
    },
    select: categorySelect,
  });

  logger.info('Category created', { categoryId: category.id, slug: category.slug });

  return category as SafeCategory;
}

// ─── Update category ──────────────────────────────────────────────────────────

export async function updateCategory(
  id: string,
  input: UpdateCategoryInput
): Promise<SafeCategory> {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) {
    throw NotFoundError('Category');
  }

  // Check slug uniqueness if changing slug
  if (input.slug && input.slug !== existing.slug) {
    const slugConflict = await prisma.category.findUnique({ where: { slug: input.slug } });
    if (slugConflict) {
      throw ConflictError(`A category with slug "${input.slug}" already exists`);
    }
  }

  const updated = await prisma.category.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.image !== undefined ? { image: input.image } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
    select: categorySelect,
  });

  logger.info('Category updated', { categoryId: id });

  return updated as SafeCategory;
}
