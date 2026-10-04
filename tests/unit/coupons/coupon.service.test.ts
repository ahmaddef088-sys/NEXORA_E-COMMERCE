/**
 * Unit tests for coupon.service.ts — Phase 15 Coupons & Discounts
 */

import {
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  getCouponById,
} from '@/lib/services/coupon.service';
import { HttpError } from '@/lib/errors/HttpError';

// ─── Mock prisma ──────────────────────────────────────────────────────────────

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    coupon: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    couponUsage: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { prisma } from '@/lib/db/prisma';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const now = new Date();
const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

const mockPercentageCoupon = {
  id: 'coupon-1',
  code: 'SAVE20',
  type: 'PERCENTAGE',
  value: { toString: () => '20' },
  minOrderAmount: null,
  maxDiscount: null,
  startsAt: null,
  expiresAt: null,
  usageLimit: null,
  usageCount: 0,
  isActive: true,
  createdAt: now,
  updatedAt: now,
};

const mockFixedCoupon = {
  id: 'coupon-2',
  code: 'SAVE10',
  type: 'FIXED',
  value: { toString: () => '10' },
  minOrderAmount: { toString: () => '50' },
  maxDiscount: null,
  startsAt: null,
  expiresAt: null,
  usageLimit: 100,
  usageCount: 5,
  isActive: true,
  createdAt: now,
  updatedAt: now,
};

const defaultQuery = { page: 1, limit: 20 };

// ─── listCoupons ──────────────────────────────────────────────────────────────

describe('listCoupons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockResolvedValue([[mockPercentageCoupon], 1]);
  });

  it('returns paginated coupons', async () => {
    const result = await listCoupons(defaultQuery);
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it('returns empty when no coupons', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([[], 0]);
    const result = await listCoupons(defaultQuery);
    expect(result.data).toHaveLength(0);
  });
});

// ─── getCouponById ────────────────────────────────────────────────────────────

describe('getCouponById', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns coupon by ID', async () => {
    (prisma.coupon.findUnique as jest.Mock).mockResolvedValue(mockPercentageCoupon);
    const result = await getCouponById('coupon-1');
    expect(result.id).toBe('coupon-1');
  });

  it('throws NotFoundError when coupon does not exist', async () => {
    (prisma.coupon.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(getCouponById('nonexistent')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── createCoupon ─────────────────────────────────────────────────────────────

describe('createCoupon', () => {
  const validPercentage = {
    code: 'SAVE20',
    type: 'PERCENTAGE' as const,
    value: 20,
    isActive: true,
  };

  const validFixed = {
    code: 'SAVE10',
    type: 'FIXED' as const,
    value: 10,
    minOrderAmount: 50,
    isActive: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.coupon.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.coupon.create as jest.Mock).mockResolvedValue(mockPercentageCoupon);
  });

  it('creates a percentage coupon successfully', async () => {
    const result = await createCoupon(validPercentage);
    expect(result.id).toBe('coupon-1');
    expect(prisma.coupon.create).toHaveBeenCalledTimes(1);
  });

  it('creates a fixed coupon successfully', async () => {
    (prisma.coupon.create as jest.Mock).mockResolvedValue(mockFixedCoupon);
    const result = await createCoupon(validFixed);
    expect(result.code).toBe('SAVE10');
  });

  it('throws ConflictError when code already exists', async () => {
    (prisma.coupon.findUnique as jest.Mock).mockResolvedValue(mockPercentageCoupon);
    await expect(createCoupon(validPercentage)).rejects.toMatchObject({ statusCode: 409 });
    expect(prisma.coupon.create).not.toHaveBeenCalled();
  });
});

// ─── updateCoupon ─────────────────────────────────────────────────────────────

describe('updateCoupon', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.coupon.findUnique as jest.Mock).mockResolvedValue(mockPercentageCoupon);
    (prisma.coupon.update as jest.Mock).mockResolvedValue({ ...mockPercentageCoupon, isActive: false });
  });

  it('deactivates a coupon', async () => {
    const result = await updateCoupon('coupon-1', { isActive: false });
    expect(result.isActive).toBe(false);
  });

  it('throws NotFoundError when coupon does not exist', async () => {
    (prisma.coupon.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(updateCoupon('nonexistent', { isActive: false })).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('throws ConflictError when new code already exists', async () => {
    (prisma.coupon.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockPercentageCoupon) // existing by id
      .mockResolvedValueOnce({ id: 'other-coupon', code: 'NEWCODE' }); // code conflict
    await expect(updateCoupon('coupon-1', { code: 'NEWCODE' })).rejects.toMatchObject({
      statusCode: 409,
    });
  });
});

// ─── deleteCoupon ─────────────────────────────────────────────────────────────

describe('deleteCoupon', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.coupon.findUnique as jest.Mock).mockResolvedValue(mockPercentageCoupon);
    (prisma.coupon.delete as jest.Mock).mockResolvedValue(mockPercentageCoupon);
  });

  it('deletes a coupon successfully', async () => {
    await deleteCoupon('coupon-1');
    expect(prisma.coupon.delete).toHaveBeenCalledTimes(1);
  });

  it('throws NotFoundError when coupon does not exist', async () => {
    (prisma.coupon.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(deleteCoupon('nonexistent')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── validateCoupon ───────────────────────────────────────────────────────────

describe('validateCoupon', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.couponUsage.findUnique as jest.Mock).mockResolvedValue(null); // Not used yet
  });

  describe('PERCENTAGE coupon', () => {
    beforeEach(() => {
      (prisma.coupon.findUnique as jest.Mock).mockResolvedValue(mockPercentageCoupon);
    });

    it('calculates 20% discount correctly', async () => {
      const result = await validateCoupon({ code: 'SAVE20', orderAmount: 100 }, 'user-1');
      expect(result.discountAmount).toBe(20);
      expect(result.finalAmount).toBe(80);
    });

    it('respects maxDiscount cap', async () => {
      const cappedCoupon = { ...mockPercentageCoupon, maxDiscount: { toString: () => '15' } };
      (prisma.coupon.findUnique as jest.Mock).mockResolvedValue(cappedCoupon);

      const result = await validateCoupon({ code: 'SAVE20', orderAmount: 100 }, 'user-1');
      expect(result.discountAmount).toBe(15); // Capped at maxDiscount
      expect(result.finalAmount).toBe(85);
    });
  });

  describe('FIXED coupon', () => {
    beforeEach(() => {
      (prisma.coupon.findUnique as jest.Mock).mockResolvedValue(mockFixedCoupon);
    });

    it('applies fixed discount correctly', async () => {
      const result = await validateCoupon({ code: 'SAVE10', orderAmount: 100 }, 'user-1');
      expect(result.discountAmount).toBe(10);
      expect(result.finalAmount).toBe(90);
    });

    it('throws ValidationError when order below minOrderAmount', async () => {
      await expect(
        validateCoupon({ code: 'SAVE10', orderAmount: 30 }, 'user-1')
      ).rejects.toBeInstanceOf(HttpError);
    });

    it('caps discount at order amount (no negative totals)', async () => {
      const bigFixedCoupon = { ...mockFixedCoupon, value: { toString: () => '200' }, minOrderAmount: null };
      (prisma.coupon.findUnique as jest.Mock).mockResolvedValue(bigFixedCoupon);

      const result = await validateCoupon({ code: 'SAVE10', orderAmount: 50 }, 'user-1');
      expect(result.discountAmount).toBe(50); // Capped at order amount
      expect(result.finalAmount).toBe(0);
    });
  });

  describe('Coupon validation errors', () => {
    it('throws ValidationError for inactive coupon', async () => {
      (prisma.coupon.findUnique as jest.Mock).mockResolvedValue({
        ...mockPercentageCoupon,
        isActive: false,
      });
      await expect(
        validateCoupon({ code: 'SAVE20', orderAmount: 100 }, 'user-1')
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws ValidationError for nonexistent coupon', async () => {
      (prisma.coupon.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(
        validateCoupon({ code: 'INVALID', orderAmount: 100 }, 'user-1')
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws ValidationError for expired coupon', async () => {
      (prisma.coupon.findUnique as jest.Mock).mockResolvedValue({
        ...mockPercentageCoupon,
        expiresAt: past,
      });
      await expect(
        validateCoupon({ code: 'SAVE20', orderAmount: 100 }, 'user-1')
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws ValidationError for coupon not yet active', async () => {
      (prisma.coupon.findUnique as jest.Mock).mockResolvedValue({
        ...mockPercentageCoupon,
        startsAt: future,
      });
      await expect(
        validateCoupon({ code: 'SAVE20', orderAmount: 100 }, 'user-1')
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws ValidationError when usage limit exhausted', async () => {
      (prisma.coupon.findUnique as jest.Mock).mockResolvedValue({
        ...mockPercentageCoupon,
        usageLimit: 10,
        usageCount: 10,
      });
      await expect(
        validateCoupon({ code: 'SAVE20', orderAmount: 100 }, 'user-1')
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws ValidationError when user already used this coupon', async () => {
      (prisma.coupon.findUnique as jest.Mock).mockResolvedValue(mockPercentageCoupon);
      (prisma.couponUsage.findUnique as jest.Mock).mockResolvedValue({ id: 'usage-1' });
      await expect(
        validateCoupon({ code: 'SAVE20', orderAmount: 100 }, 'user-1')
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });
});
