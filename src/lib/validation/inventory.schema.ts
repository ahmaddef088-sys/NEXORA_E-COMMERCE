/**
 * Zod validation schemas for inventory operations.
 */

import { z } from 'zod';
import { paginationSchema } from './index';

// ─── Stock adjustment ─────────────────────────────────────────────────────────

export const stockAdjustmentSchema = z
  .object({
    type: z.enum(['IN', 'OUT', 'ADJUSTMENT', 'RETURN']),
    quantity: z
      .number()
      .int('Quantity must be an integer')
      .min(0, 'Quantity cannot be negative'),
    reason: z.string().max(255, 'Reason must be at most 255 characters').optional(),
  })
  .refine((data) => data.type === 'ADJUSTMENT' || data.quantity > 0, {
    message: 'Quantity must be positive for IN, OUT, and RETURN movements',
    path: ['quantity'],
  });

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;

// ─── Inventory query params ───────────────────────────────────────────────────

export const inventoryQuerySchema = paginationSchema.extend({
  productId: z.string().uuid().optional(),
  lowStock: z
    .string()
    .optional()
    .transform((v) => {
      if (v === 'true') return true;
      if (v === 'false') return false;
      return undefined;
    }),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type InventoryQuery = z.infer<typeof inventoryQuerySchema>;
