/**
 * Zod validation schemas for category operations.
 */

import { z } from 'zod';
import { slugSchema, paginationSchema } from './index';

// ─── Create category ──────────────────────────────────────────────────────────

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  slug: slugSchema,
  description: z.string().max(500, 'Description must be at most 500 characters').optional(),
  image: z.string().url('Image must be a valid URL').optional(),
  isActive: z.boolean().optional().default(true),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

// ─── Update category ──────────────────────────────────────────────────────────

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: slugSchema.optional(),
  description: z.string().max(500).optional(),
  image: z.string().url('Image must be a valid URL').optional().nullable(),
  isActive: z.boolean().optional(),
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

// ─── Category query params ────────────────────────────────────────────────────

export const categoryQuerySchema = paginationSchema.extend({
  isActive: z
    .string()
    .optional()
    .transform((v) => {
      if (v === 'true') return true;
      if (v === 'false') return false;
      return undefined;
    }),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type CategoryQuery = z.infer<typeof categoryQuerySchema>;
