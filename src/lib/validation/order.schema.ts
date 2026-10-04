/**
 * Zod validation schemas for checkout and order operations.
 */

import { z } from 'zod';
import { paginationSchema } from './index';

// ─── Checkout request ─────────────────────────────────────────────────────────

export const checkoutSchema = z.object({
  shippingAddressId: z.string().uuid('Shipping address ID must be a valid UUID'),
  notes: z.string().max(500, 'Notes must be at most 500 characters').optional(),
  couponCode: z.string().optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

// ─── Order query params ───────────────────────────────────────────────────────

export const orderQuerySchema = paginationSchema.extend({
  status: z
    .enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type OrderQuery = z.infer<typeof orderQuerySchema>;

// ─── Admin order status update ────────────────────────────────────────────────

export const updateOrderStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
  notes: z.string().max(500).optional(),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
