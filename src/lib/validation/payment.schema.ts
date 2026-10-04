/**
 * Zod validation schemas for payment operations.
 */

import { z } from 'zod';

// ─── Create payment ───────────────────────────────────────────────────────────

export const createPaymentSchema = z.object({
  orderId: z.string().uuid('Order ID must be a valid UUID'),
  method: z.enum(['CARD', 'CASH', 'BANK_TRANSFER', 'PAYPAL']),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

// ─── Payment webhook / callback ───────────────────────────────────────────────

export const paymentCallbackSchema = z.object({
  paymentId: z.string().uuid(),
  status: z.enum(['PAID', 'FAILED']),
  transactionId: z.string().optional(),
  // Metadata from the payment provider
  metadata: z.record(z.unknown()).optional(),
});

export type PaymentCallbackInput = z.infer<typeof paymentCallbackSchema>;
