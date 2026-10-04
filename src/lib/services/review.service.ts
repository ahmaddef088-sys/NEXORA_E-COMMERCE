/**
 * Review service — Reviews & Ratings for products (Phase 14).
 *
 * Security contract:
 * - Only authenticated customers can create/update/delete their own reviews.
 * - One review per user per product (enforced by DB unique constraint).
 * - Reviews default to isApproved=false; admin must approve.
 * - Public listing shows only approved reviews.
 * - Admin listing can see all reviews.
 * - Users can only edit/delete their own reviews.
 * - Admins can approve/reject any review.
 */

import { prisma } from '@/lib/db/prisma';
import { ConflictError, NotFoundError, ForbiddenError } from '@/lib/errors/HttpError';
import { logger } from '@/lib/logger';
import { buildPaginationMeta } from '@/lib/api/response';
import type { CreateReviewInput, UpdateReviewInput, ReviewQuery } from '@/lib/validation/review.schema';
import type { PaginationMeta } from '@/lib/api/response';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SafeReview = {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  comment: string | null;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
  };
};

export type ReviewListResult = {
  data: SafeReview[];
  meta: PaginationMeta;
};

export type ProductRatingSummary = {
  averageRating: number;
  totalReviews: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

// ─── Selectors ────────────────────────────────────────────────────────────────

const reviewSelect = {
  id: true,
  userId: true,
  productId: true,
  rating: true,
  comment: true,
  isApproved: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

// ─── List reviews for a product ───────────────────────────────────────────────

export async function listProductReviews(
  productId: string,
  query: ReviewQuery,
  adminView = false
): Promise<ReviewListResult> {
  const { page, limit, isApproved, sortBy, sortOrder } = query;
  const skip = (page - 1) * limit;

  // Verify the product exists
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) {
    throw NotFoundError('Product');
  }

  const where: {
    productId: string;
    isApproved?: boolean;
  } = { productId };

  if (!adminView) {
    // Public view: only approved reviews
    where.isApproved = true;
  } else if (isApproved !== undefined) {
    where.isApproved = isApproved;
  }

  const [data, total] = await prisma.$transaction([
    prisma.review.findMany({
      where,
      select: reviewSelect,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.review.count({ where }),
  ]);

  return {
    data: data as SafeReview[],
    meta: buildPaginationMeta(page, limit, total),
  };
}

// ─── Get rating summary ───────────────────────────────────────────────────────

export async function getProductRatingSummary(productId: string): Promise<ProductRatingSummary> {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) {
    throw NotFoundError('Product');
  }

  const reviews = await prisma.review.findMany({
    where: { productId, isApproved: true },
    select: { rating: true },
  });

  if (reviews.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;

  for (const r of reviews) {
    const rating = r.rating as 1 | 2 | 3 | 4 | 5;
    distribution[rating] = (distribution[rating] ?? 0) + 1;
    sum += r.rating;
  }

  return {
    averageRating: Math.round((sum / reviews.length) * 10) / 10,
    totalReviews: reviews.length,
    distribution,
  };
}

// ─── Create review ────────────────────────────────────────────────────────────

export async function createReview(
  userId: string,
  productId: string,
  input: CreateReviewInput
): Promise<SafeReview> {
  // Verify product exists and is active
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, isActive: true },
  });
  if (!product || !product.isActive) {
    throw NotFoundError('Product');
  }

  // Check for duplicate review
  const existing = await prisma.review.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (existing) {
    throw ConflictError('You have already reviewed this product');
  }

  const review = await prisma.review.create({
    data: {
      userId,
      productId,
      rating: input.rating,
      comment: input.comment ?? null,
      isApproved: false, // Requires admin approval
    },
    select: reviewSelect,
  });

  logger.info('Review created', { reviewId: review.id, userId, productId });

  return review as SafeReview;
}

// ─── Update own review ────────────────────────────────────────────────────────

export async function updateReview(
  reviewId: string,
  userId: string,
  input: UpdateReviewInput
): Promise<SafeReview> {
  const existing = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!existing) {
    throw NotFoundError('Review');
  }

  // Ownership check
  if (existing.userId !== userId) {
    throw ForbiddenError('You can only edit your own reviews');
  }

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: {
      ...(input.rating !== undefined ? { rating: input.rating } : {}),
      ...(input.comment !== undefined ? { comment: input.comment } : {}),
      // Reset approval when review content changes
      isApproved: false,
    },
    select: reviewSelect,
  });

  logger.info('Review updated', { reviewId, userId });

  return updated as SafeReview;
}

// ─── Delete own review (or admin) ─────────────────────────────────────────────

export async function deleteReview(
  reviewId: string,
  userId: string,
  isAdmin: boolean
): Promise<void> {
  const existing = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!existing) {
    throw NotFoundError('Review');
  }

  if (!isAdmin && existing.userId !== userId) {
    throw ForbiddenError('You can only delete your own reviews');
  }

  await prisma.review.delete({ where: { id: reviewId } });

  logger.info('Review deleted', { reviewId, userId, isAdmin });
}

// ─── Admin: approve or reject review ─────────────────────────────────────────

export async function setReviewApproval(
  reviewId: string,
  isApproved: boolean
): Promise<SafeReview> {
  const existing = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!existing) {
    throw NotFoundError('Review');
  }

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: { isApproved },
    select: reviewSelect,
  });

  logger.info('Review approval updated', { reviewId, isApproved });

  return updated as SafeReview;
}

// ─── Get user's own review for a product ─────────────────────────────────────

export async function getUserReviewForProduct(
  userId: string,
  productId: string
): Promise<SafeReview | null> {
  const review = await prisma.review.findUnique({
    where: { userId_productId: { userId, productId } },
    select: reviewSelect,
  });

  return review as SafeReview | null;
}
