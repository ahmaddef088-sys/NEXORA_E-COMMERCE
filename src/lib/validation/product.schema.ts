/**
 * Zod validation schemas for product operations.
 */

import { z } from 'zod';
import { slugSchema, paginationSchema } from './index';

// ─── Create product ───────────────────────────────────────────────────────────

export const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name must be at most 200 characters'),
  slug: slugSchema,
  description: z.string().max(2000, 'Description must be at most 2000 characters').optional(),
  sku: z
    .string()
    .min(1, 'SKU is required')
    .max(100, 'SKU must be at most 100 characters')
    .regex(/^[A-Z0-9_-]+$/i, 'SKU must contain only letters, numbers, underscores, and hyphens'),
  price: z
    .number()
    .positive('Price must be greater than 0')
    .multipleOf(0.01, 'Price must have at most 2 decimal places'),
  compareAtPrice: z
    .number()
    .positive('Compare-at price must be greater than 0')
    .multipleOf(0.01)
    .optional()
    .nullable(),
  stock: z.number().int().nonnegative('Stock cannot be negative').default(0),
  isActive: z.boolean().optional().default(true),
  image: z.string().url('Image must be a valid URL').optional().nullable(),
  categoryId: z.string().uuid('Category ID must be a valid UUID').optional().nullable(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

// ─── Update product ───────────────────────────────────────────────────────────

export const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: slugSchema.optional(),
  description: z.string().max(2000).optional().nullable(),
  sku: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[A-Z0-9_-]+$/i)
    .optional(),
  price: z.number().positive().multipleOf(0.01).optional(),
  compareAtPrice: z.number().positive().multipleOf(0.01).optional().nullable(),
  stock: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
  image: z.string().url().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

// ─── Product query params ─────────────────────────────────────────────────────

export const productQuerySchema = paginationSchema.extend({
  search: z
    .string()
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  categoryId: z
    .string()
    .optional()
    .transform((v) => (v === '' ? undefined : v))
    .pipe(z.string().uuid().optional()),
  isActive: z
    .string()
    .optional()
    .transform((v) => {
      if (v === 'true') return true;
      if (v === 'false') return false;
      return undefined;
    }),
  minPrice: z
    .string()
    .optional()
    .transform((v) => (v !== undefined && v !== '' ? parseFloat(v) : undefined))
    .pipe(z.number().positive().optional()),
  maxPrice: z
    .string()
    .optional()
    .transform((v) => (v !== undefined && v !== '' ? parseFloat(v) : undefined))
    .pipe(z.number().positive().optional()),
  sortBy: z.enum(['name', 'price', 'createdAt', 'stock']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  inStock: z
    .string()
    .optional()
    .transform((v) => {
      if (v === 'true') return true;
      if (v === 'false') return false;
      return undefined;
    }),
  hasDiscount: z
    .string()
    .optional()
    .transform((v) => {
      if (v === 'true') return true;
      if (v === 'false') return false;
      return undefined;
    }),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;
