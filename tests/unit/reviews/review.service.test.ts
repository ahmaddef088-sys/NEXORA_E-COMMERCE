/**
 * Unit tests for review.service.ts — Phase 14 Reviews & Ratings
 */

import {
  listProductReviews,
  getProductRatingSummary,
  createReview,
  updateReview,
  deleteReview,
  setReviewApproval,
  getUserReviewForProduct,
} from '@/lib/services/review.service';
import { HttpError } from '@/lib/errors/HttpError';

// ─── Mock prisma ──────────────────────────────────────────────────────────────

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    product: {
      findUnique: jest.fn(),
    },
    review: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { prisma } from '@/lib/db/prisma';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockProduct = { id: 'prod-1', isActive: true };

const mockReview = {
  id: 'review-1',
  userId: 'user-1',
  productId: 'prod-1',
  rating: 4,
  comment: 'Great product!',
  isApproved: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  user: { id: 'user-1', name: 'Alice' },
};

const defaultQuery = {
  page: 1,
  limit: 20,
  sortBy: 'createdAt' as const,
  sortOrder: 'desc' as const,
};

// ─── listProductReviews ───────────────────────────────────────────────────────

describe('listProductReviews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
    (prisma.$transaction as jest.Mock).mockResolvedValue([[mockReview], 1]);
  });

  it('returns approved reviews for public view', async () => {
    const result = await listProductReviews('prod-1', defaultQuery, false);
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it('returns all reviews for admin view', async () => {
    const result = await listProductReviews('prod-1', defaultQuery, true);
    expect(result.data).toHaveLength(1);
  });

  it('throws NotFoundError when product does not exist', async () => {
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(listProductReviews('nonexistent', defaultQuery)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('returns empty list when no reviews', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([[], 0]);
    const result = await listProductReviews('prod-1', defaultQuery, false);
    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });
});

// ─── getProductRatingSummary ──────────────────────────────────────────────────

describe('getProductRatingSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
  });

  it('returns summary with correct average', async () => {
    (prisma.review.findMany as jest.Mock).mockResolvedValue([
      { rating: 5 },
      { rating: 4 },
      { rating: 3 },
    ]);

    const summary = await getProductRatingSummary('prod-1');
    expect(summary.totalReviews).toBe(3);
    expect(summary.averageRating).toBe(4);
    expect(summary.distribution[5]).toBe(1);
    expect(summary.distribution[4]).toBe(1);
    expect(summary.distribution[3]).toBe(1);
  });

  it('returns zeroed summary when no reviews', async () => {
    (prisma.review.findMany as jest.Mock).mockResolvedValue([]);
    const summary = await getProductRatingSummary('prod-1');
    expect(summary.averageRating).toBe(0);
    expect(summary.totalReviews).toBe(0);
  });

  it('throws NotFoundError when product does not exist', async () => {
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(getProductRatingSummary('nonexistent')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── createReview ─────────────────────────────────────────────────────────────

describe('createReview', () => {
  const validInput = { rating: 5, comment: 'Excellent!' };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
    (prisma.review.findUnique as jest.Mock).mockResolvedValue(null); // No existing review
    (prisma.review.create as jest.Mock).mockResolvedValue(mockReview);
  });

  it('creates a review successfully', async () => {
    const result = await createReview('user-1', 'prod-1', validInput);
    expect(result.id).toBe('review-1');
    expect(prisma.review.create).toHaveBeenCalledTimes(1);
  });

  it('sets isApproved=false by default', async () => {
    await createReview('user-1', 'prod-1', validInput);
    const callArgs = (prisma.review.create as jest.Mock).mock.calls[0][0];
    expect(callArgs.data.isApproved).toBe(false);
  });

  it('throws ConflictError when review already exists', async () => {
    (prisma.review.findUnique as jest.Mock).mockResolvedValue(mockReview);
    await expect(createReview('user-1', 'prod-1', validInput)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(prisma.review.create).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when product is inactive', async () => {
    (prisma.product.findUnique as jest.Mock).mockResolvedValue({ ...mockProduct, isActive: false });
    await expect(createReview('user-1', 'prod-1', validInput)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('throws NotFoundError when product does not exist', async () => {
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(createReview('user-1', 'nonexistent', validInput)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

// ─── updateReview ─────────────────────────────────────────────────────────────

describe('updateReview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.review.findUnique as jest.Mock).mockResolvedValue(mockReview);
    (prisma.review.update as jest.Mock).mockResolvedValue({ ...mockReview, rating: 3, isApproved: false });
  });

  it('updates review rating successfully', async () => {
    const result = await updateReview('review-1', 'user-1', { rating: 3 });
    expect(result.rating).toBe(3);
  });

  it('resets isApproved=false on update', async () => {
    await updateReview('review-1', 'user-1', { comment: 'Updated comment' });
    const callArgs = (prisma.review.update as jest.Mock).mock.calls[0][0];
    expect(callArgs.data.isApproved).toBe(false);
  });

  it('throws ForbiddenError when user does not own the review', async () => {
    await expect(updateReview('review-1', 'other-user', { rating: 2 })).rejects.toBeInstanceOf(HttpError);
    await expect(updateReview('review-1', 'other-user', { rating: 2 })).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('throws NotFoundError when review does not exist', async () => {
    (prisma.review.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(updateReview('nonexistent', 'user-1', { rating: 3 })).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

// ─── deleteReview ─────────────────────────────────────────────────────────────

describe('deleteReview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.review.findUnique as jest.Mock).mockResolvedValue(mockReview);
    (prisma.review.delete as jest.Mock).mockResolvedValue(mockReview);
  });

  it('allows owner to delete their review', async () => {
    await deleteReview('review-1', 'user-1', false);
    expect(prisma.review.delete).toHaveBeenCalledTimes(1);
  });

  it('allows admin to delete any review', async () => {
    await deleteReview('review-1', 'admin-user', true);
    expect(prisma.review.delete).toHaveBeenCalledTimes(1);
  });

  it('throws ForbiddenError when non-owner tries to delete', async () => {
    await expect(deleteReview('review-1', 'other-user', false)).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(prisma.review.delete).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when review does not exist', async () => {
    (prisma.review.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(deleteReview('nonexistent', 'user-1', false)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

// ─── setReviewApproval ────────────────────────────────────────────────────────

describe('setReviewApproval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.review.findUnique as jest.Mock).mockResolvedValue({ ...mockReview, isApproved: false });
    (prisma.review.update as jest.Mock).mockResolvedValue({ ...mockReview, isApproved: true });
  });

  it('approves a review', async () => {
    const result = await setReviewApproval('review-1', true);
    expect(result.isApproved).toBe(true);
    const callArgs = (prisma.review.update as jest.Mock).mock.calls[0][0];
    expect(callArgs.data.isApproved).toBe(true);
  });

  it('rejects a review', async () => {
    (prisma.review.update as jest.Mock).mockResolvedValue({ ...mockReview, isApproved: false });
    const result = await setReviewApproval('review-1', false);
    expect(result.isApproved).toBe(false);
  });

  it('throws NotFoundError when review does not exist', async () => {
    (prisma.review.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(setReviewApproval('nonexistent', true)).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── getUserReviewForProduct ──────────────────────────────────────────────────

describe('getUserReviewForProduct', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the user review for a product', async () => {
    (prisma.review.findUnique as jest.Mock).mockResolvedValue(mockReview);
    const result = await getUserReviewForProduct('user-1', 'prod-1');
    expect(result?.id).toBe('review-1');
  });

  it('returns null when user has not reviewed the product', async () => {
    (prisma.review.findUnique as jest.Mock).mockResolvedValue(null);
    const result = await getUserReviewForProduct('user-1', 'prod-1');
    expect(result).toBeNull();
  });
});
