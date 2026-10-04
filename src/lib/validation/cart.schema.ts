/**
 * Zod validation schemas for shopping cart operations.
 */

import { z } from 'zod';

// ─── Add item to cart ─────────────────────────────────────────────────────────

export const addCartItemSchema = z.object({
  productId: z.string().uuid('Product ID must be a valid UUID'),
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .positive('Quantity must be at least 1')
    .max(999, 'Quantity cannot exceed 999'),
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;

// ─── Update cart item ─────────────────────────────────────────────────────────

export const updateCartItemSchema = z.object({
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .positive('Quantity must be at least 1')
    .max(999, 'Quantity cannot exceed 999'),
});

export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
