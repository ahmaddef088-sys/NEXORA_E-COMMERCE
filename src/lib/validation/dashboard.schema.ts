/**
 * Zod schemas for Admin Dashboard and Reports.
 */

import { z } from 'zod';
import { paginationSchema } from './index';

export const reportQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d', 'year']).optional().default('30d'),
});

export type ReportQuery = z.infer<typeof reportQuerySchema>;

export const adminCustomerQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type AdminCustomerQuery = z.infer<typeof adminCustomerQuerySchema>;

export const adminPaymentQuerySchema = paginationSchema.extend({
  status: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED']).optional(),
  method: z.enum(['CARD', 'CASH', 'BANK_TRANSFER', 'PAYPAL']).optional(),
  orderId: z.string().uuid().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type AdminPaymentQuery = z.infer<typeof adminPaymentQuerySchema>;
