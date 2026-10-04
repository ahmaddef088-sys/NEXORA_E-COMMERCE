/**
 * Zod validation schemas for account and address operations.
 */

import { z } from 'zod';

// ─── Update account/profile ───────────────────────────────────────────────────

export const updateAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters').optional(),
  email: z.string().email('Email must be a valid email address').optional(),
});

export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

// ─── Create address ───────────────────────────────────────────────────────────

export const createAddressSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(100),
  phone: z.string().min(1, 'Phone is required').max(30),
  country: z.string().min(1, 'Country is required').max(100),
  city: z.string().min(1, 'City is required').max(100),
  addressLine: z.string().min(1, 'Address line is required').max(255),
  postalCode: z.string().max(20).optional(),
  isDefault: z.boolean().optional().default(false),
});

export type CreateAddressInput = z.infer<typeof createAddressSchema>;

// ─── Update address ───────────────────────────────────────────────────────────

export const updateAddressSchema = z.object({
  fullName: z.string().min(1).max(100).optional(),
  phone: z.string().min(1).max(30).optional(),
  country: z.string().min(1).max(100).optional(),
  city: z.string().min(1).max(100).optional(),
  addressLine: z.string().min(1).max(255).optional(),
  postalCode: z.string().max(20).optional().nullable(),
  isDefault: z.boolean().optional(),
});

export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
