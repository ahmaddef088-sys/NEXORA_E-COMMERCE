/**
 * Zod validation schemas for Reviews & Ratings (Phase 14).
 */

import { z } from 'zod';
import { paginationSchema } from './index';

// ─── Create review ────────────────────────────────────────────────────────────

export const createReviewSchema = z.object({
  rating: z
    .number()
    .int('Rating must be an integer')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must be at most 5'),
  comment: z
    .string()
    .max(2000, 'Comment must be at most 2000 characters')
    .optional()
    .nullable(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

// ─── Update review ────────────────────────────────────────────────────────────

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(2000).optional().nullable(),
});

export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;

// ─── Review query ─────────────────────────────────────────────────────────────

export const reviewQuerySchema = paginationSchema.extend({
  /** Filter by approval status (admin only) */
  isApproved: z
    .string()
    .optional()
    .transform((v) => {
      if (v === 'true') return true;
      if (v === 'false') return false;
      return undefined;
    }),
  sortBy: z.enum(['createdAt', 'rating']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type ReviewQuery = z.infer<typeof reviewQuerySchema>;
