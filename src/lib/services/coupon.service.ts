/**
 * Coupon service — Coupons & Discounts (Phase 15).
 *
 * Security contract:
 * - Only admins can create/update/delete coupons.
 * - Validation applies coupons server-side — never trust frontend discount values.
 * - Per-user-per-coupon usage is enforced (one use per coupon per user).
 * - Discount is recalculated server-side from the order total.
 * - Percentage discounts are capped at 100% and respect maxDiscount.
 * - Fixed discounts are capped at the order amount (never negative total).
 * - Coupon validity: isActive, date range, usageLimit are all checked.
 */

import { prisma } from '@/lib/db/prisma';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors/HttpError';
import { logger } from '@/lib/logger';
import { buildPaginationMeta } from '@/lib/api/response';
import type { CreateCouponInput, UpdateCouponInput, CouponQuery, ApplyCouponInput } from '@/lib/validation/coupon.schema';
import type { PaginationMeta } from '@/lib/api/response';
import type { Prisma } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SafeCoupon = {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any; // Prisma Decimal
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  minOrderAmount: any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  maxDiscount: any | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CouponListResult = {
  data: SafeCoupon[];
  meta: PaginationMeta;
};

export type CouponApplicationResult = {
  code: string;
  discountAmount: number;
  finalAmount: number;
  type: 'PERCENTAGE' | 'FIXED';
  couponId: string;
};

// ─── Selectors ────────────────────────────────────────────────────────────────

const couponSelect = {
  id: true,
  code: true,
  type: true,
  value: true,
  minOrderAmount: true,
  maxDiscount: true,
  startsAt: true,
  expiresAt: true,
  usageLimit: true,
  usageCount: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ─── List coupons (admin) ─────────────────────────────────────────────────────

export async function listCoupons(query: CouponQuery): Promise<CouponListResult> {
  const { page, limit, isActive, search } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.CouponWhereInput = {};

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (search) {
    where.code = { contains: search, mode: 'insensitive' };
  }

  const [data, total] = await prisma.$transaction([
    prisma.coupon.findMany({ where, select: couponSelect, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.coupon.count({ where }),
  ]);

  return {
    data: data as SafeCoupon[],
    meta: buildPaginationMeta(page, limit, total),
  };
}

// ─── Get coupon by ID ─────────────────────────────────────────────────────────

export async function getCouponById(id: string): Promise<SafeCoupon> {
  const coupon = await prisma.coupon.findUnique({ where: { id }, select: couponSelect });
  if (!coupon) throw NotFoundError('Coupon');
  return coupon as SafeCoupon;
}

// ─── Create coupon (admin) ────────────────────────────────────────────────────

export async function createCoupon(input: CreateCouponInput): Promise<SafeCoupon> {
  // Check code uniqueness
  const existing = await prisma.coupon.findUnique({ where: { code: input.code } });
  if (existing) {
    throw ConflictError(`Coupon code "${input.code}" already exists`);
  }

  const coupon = await prisma.coupon.create({
    data: {
      code: input.code,
      type: input.type,
      value: input.value,
      minOrderAmount: input.minOrderAmount ?? null,
      maxDiscount: input.maxDiscount ?? null,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      usageLimit: input.usageLimit ?? null,
      isActive: input.isActive,
    },
    select: couponSelect,
  });

  logger.info('Coupon created', { couponId: coupon.id, code: coupon.code });

  return coupon as SafeCoupon;
}

// ─── Update coupon (admin) ────────────────────────────────────────────────────

export async function updateCoupon(id: string, input: UpdateCouponInput): Promise<SafeCoupon> {
  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) throw NotFoundError('Coupon');

  // Check code uniqueness if changing
  if (input.code && input.code !== existing.code) {
    const codeConflict = await prisma.coupon.findUnique({ where: { code: input.code } });
    if (codeConflict) {
      throw ConflictError(`Coupon code "${input.code}" already exists`);
    }
  }

  const updated = await prisma.coupon.update({
    where: { id },
    data: {
      ...(input.code !== undefined ? { code: input.code } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.value !== undefined ? { value: input.value } : {}),
      ...(input.minOrderAmount !== undefined ? { minOrderAmount: input.minOrderAmount } : {}),
      ...(input.maxDiscount !== undefined ? { maxDiscount: input.maxDiscount } : {}),
      ...(input.startsAt !== undefined ? { startsAt: input.startsAt ? new Date(input.startsAt) : null } : {}),
      ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt ? new Date(input.expiresAt) : null } : {}),
      ...(input.usageLimit !== undefined ? { usageLimit: input.usageLimit } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
    select: couponSelect,
  });

  logger.info('Coupon updated', { couponId: id });

  return updated as SafeCoupon;
}

// ─── Delete coupon (admin) ────────────────────────────────────────────────────

export async function deleteCoupon(id: string): Promise<void> {
  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) throw NotFoundError('Coupon');

  await prisma.coupon.delete({ where: { id } });

  logger.info('Coupon deleted', { couponId: id });
}

// ─── Validate and apply coupon ────────────────────────────────────────────────

/**
 * Server-side coupon validation and discount calculation.
 * This is the authoritative source for discount values — NEVER trust client input.
 *
 * Returns the computed discount amount and final amount after discount.
 * Does NOT record usage — that happens at order creation in a transaction.
 */
export async function validateCoupon(
  input: ApplyCouponInput,
  userId: string
): Promise<CouponApplicationResult> {
  const { code, orderAmount } = input;
  const now = new Date();

  const coupon = await prisma.coupon.findUnique({ where: { code } });

  if (!coupon || !coupon.isActive) {
    throw ValidationError('Coupon code is invalid or inactive', { code: ['Invalid coupon code'] });
  }

  // Date range check
  if (coupon.startsAt && coupon.startsAt > now) {
    throw ValidationError('Coupon is not yet valid', { code: ['Coupon not yet active'] });
  }

  if (coupon.expiresAt && coupon.expiresAt < now) {
    throw ValidationError('Coupon has expired', { code: ['Coupon has expired'] });
  }

  // Usage limit check
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    throw ValidationError('Coupon usage limit has been reached', { code: ['Coupon exhausted'] });
  }

  // Per-user usage check
  const userUsage = await prisma.couponUsage.findUnique({
    where: { couponId_userId: { couponId: coupon.id, userId } },
  });
  if (userUsage) {
    throw ValidationError('You have already used this coupon', { code: ['Already used'] });
  }

  // Minimum order amount check
  const minAmount = coupon.minOrderAmount ? parseFloat(coupon.minOrderAmount.toString()) : null;
  if (minAmount !== null && orderAmount < minAmount) {
    throw ValidationError(
      `Order must be at least $${minAmount.toFixed(2)} to use this coupon`,
      { code: [`Minimum order amount: $${minAmount.toFixed(2)}`] }
    );
  }

  // Calculate discount
  const couponValue = parseFloat(coupon.value.toString());
  let discountAmount: number;

  if (coupon.type === 'PERCENTAGE') {
    discountAmount = (orderAmount * couponValue) / 100;
    // Apply maxDiscount cap if set
    const maxDisc = coupon.maxDiscount ? parseFloat(coupon.maxDiscount.toString()) : null;
    if (maxDisc !== null && discountAmount > maxDisc) {
      discountAmount = maxDisc;
    }
  } else {
    // FIXED
    discountAmount = couponValue;
  }

  // Discount cannot exceed order amount
  discountAmount = Math.min(discountAmount, orderAmount);
  discountAmount = Math.round(discountAmount * 100) / 100;

  const finalAmount = Math.round((orderAmount - discountAmount) * 100) / 100;

  return {
    code: coupon.code,
    discountAmount,
    finalAmount,
    type: coupon.type as 'PERCENTAGE' | 'FIXED',
    couponId: coupon.id,
  };
}

/**
 * Record coupon usage after a successful order.
 * Must be called within the order creation transaction.
 */
export async function recordCouponUsage(
  couponId: string,
  userId: string,
  orderId: string,
  tx: Prisma.TransactionClient
): Promise<void> {
  await tx.couponUsage.create({
    data: { couponId, userId, orderId },
  });

  await tx.coupon.update({
    where: { id: couponId },
    data: { usageCount: { increment: 1 } },
  });
}
