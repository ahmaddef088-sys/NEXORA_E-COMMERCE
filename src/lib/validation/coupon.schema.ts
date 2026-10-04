/**
 * Zod validation schemas for Coupons & Discounts (Phase 15).
 */

import { z } from 'zod';
import { paginationSchema } from './index';

// ─── Create coupon ────────────────────────────────────────────────────────────

export const createCouponSchema = z
  .object({
    code: z
      .string()
      .min(3, 'Code must be at least 3 characters')
      .max(50, 'Code must be at most 50 characters')
      .regex(
        /^[A-Z0-9_-]+$/i,
        'Code must contain only letters, numbers, underscores, and hyphens'
      )
      .transform((v) => v.toUpperCase()),
    type: z.enum(['PERCENTAGE', 'FIXED']),
    value: z
      .number()
      .positive('Value must be greater than 0')
      .multipleOf(0.01, 'Value must have at most 2 decimal places'),
    minOrderAmount: z
      .number()
      .nonnegative('Minimum order amount cannot be negative')
      .multipleOf(0.01)
      .optional()
      .nullable(),
    maxDiscount: z
      .number()
      .positive('Max discount must be greater than 0')
      .multipleOf(0.01)
      .optional()
      .nullable(),
    startsAt: z.string().datetime().optional().nullable(),
    expiresAt: z.string().datetime().optional().nullable(),
    usageLimit: z
      .number()
      .int()
      .positive('Usage limit must be a positive integer')
      .optional()
      .nullable(),
    isActive: z.boolean().optional().default(true),
  })
  .superRefine((data, ctx) => {
    // Percentage coupons cannot exceed 100%
    if (data.type === 'PERCENTAGE' && data.value > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Percentage discount cannot exceed 100',
        path: ['value'],
      });
    }
    // Expiry must be after start
    if (data.startsAt && data.expiresAt && data.expiresAt <= data.startsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Expiry date must be after start date',
        path: ['expiresAt'],
      });
    }
  });

export type CreateCouponInput = z.infer<typeof createCouponSchema>;

// ─── Update coupon ────────────────────────────────────────────────────────────

export const updateCouponSchema = z
  .object({
    code: z
      .string()
      .min(3)
      .max(50)
      .regex(/^[A-Z0-9_-]+$/i)
      .transform((v) => v.toUpperCase())
      .optional(),
    type: z.enum(['PERCENTAGE', 'FIXED']).optional(),
    value: z.number().positive().multipleOf(0.01).optional(),
    minOrderAmount: z.number().nonnegative().multipleOf(0.01).optional().nullable(),
    maxDiscount: z.number().positive().multipleOf(0.01).optional().nullable(),
    startsAt: z.string().datetime().optional().nullable(),
    expiresAt: z.string().datetime().optional().nullable(),
    usageLimit: z.number().int().positive().optional().nullable(),
    isActive: z.boolean().optional(),
  });

export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;

// ─── Apply coupon ─────────────────────────────────────────────────────────────

export const applyCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required').transform((v) => v.toUpperCase().trim()),
  orderAmount: z
    .number()
    .positive('Order amount must be positive')
    .multipleOf(0.01),
});

export type ApplyCouponInput = z.infer<typeof applyCouponSchema>;

// ─── Coupon query ─────────────────────────────────────────────────────────────

export const couponQuerySchema = paginationSchema.extend({
  isActive: z
    .string()
    .optional()
    .transform((v) => {
      if (v === 'true') return true;
      if (v === 'false') return false;
      return undefined;
    }),
  search: z.string().optional(),
});

export type CouponQuery = z.infer<typeof couponQuerySchema>;
