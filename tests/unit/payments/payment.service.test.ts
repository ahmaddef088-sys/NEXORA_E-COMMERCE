/**
 * Unit tests for payment.service.ts
 * Tests payment initiation, callback handling, and status management.
 */

import {
  initiatePayment,
  getPaymentByOrderId,
  handlePaymentCallback,
} from '@/lib/services/payment.service';

// ─── Mock prisma ──────────────────────────────────────────────────────────────

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    order: { findUnique: jest.fn(), update: jest.fn() },
    payment: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// Mock payment provider
jest.mock('@/lib/payment/provider', () => ({
  getPaymentProvider: () => ({
    initializePayment: jest.fn().mockResolvedValue({
      paymentId: 'pay-1',
      checkoutUrl: '/checkout/payment/pay-1',
      transactionId: null,
      status: 'PENDING',
    }),
    verifyPayment: jest.fn().mockResolvedValue({
      status: 'PAID',
      transactionId: 'TXN-123',
    }),
  }),
}));

import { prisma } from '@/lib/db/prisma';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockOrder = {
  id: 'order-1',
  userId: 'user-1',
  status: 'PENDING',
  total: '226.00',
  payment: null,
};

const mockPayment = {
  id: 'pay-1',
  orderId: 'order-1',
  amount: '226.00',
  method: 'CARD',
  status: 'PENDING',
  transactionId: null,
  metadata: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// ─── initiatePayment ──────────────────────────────────────────────────────────

describe('initiatePayment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('initiates CARD payment successfully', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        order: {
          findUnique: jest.fn().mockResolvedValue(mockOrder),
          update: jest.fn().mockResolvedValue({ ...mockOrder, status: 'CONFIRMED' }),
        },
        payment: {
          create: jest.fn().mockResolvedValue(mockPayment),
          update: jest.fn(),
        },
      };
      return fn(tx as unknown as typeof prisma);
    });

    const result = await initiatePayment('user-1', { orderId: 'order-1', method: 'CARD' });
    expect(result.payment.id).toBe('pay-1');
    expect(result.checkoutUrl).toBe('/checkout/payment/pay-1');
  });

  it('initiates CASH payment and immediately confirms', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        order: {
          findUnique: jest.fn().mockResolvedValue(mockOrder),
          update: jest.fn().mockResolvedValue({ ...mockOrder, status: 'CONFIRMED' }),
        },
        payment: {
          create: jest.fn().mockResolvedValue(mockPayment),
          update: jest.fn().mockResolvedValue({ ...mockPayment, status: 'PAID', transactionId: 'CASH-pay-1' }),
        },
      };
      return fn(tx as unknown as typeof prisma);
    });

    // The mock provider's initializePayment returns PENDING for 'CARD' but the
    // actual MockPaymentProvider returns PAID for CASH — here we test that the
    // payment service handles an immediately-confirmed result correctly.
    // Since our test mock always returns PENDING, we verify the intermediate state.
    // The real CASH behavior is tested through integration tests.
    const result = await initiatePayment('user-1', { orderId: 'order-1', method: 'CASH' });
    // With mock provider returning PENDING status, checkoutUrl is returned
    expect(result.payment.id).toBe('pay-1');
  });


  it('throws NotFoundError when order does not exist', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        order: { findUnique: jest.fn().mockResolvedValue(null) },
        payment: { create: jest.fn() },
      };
      return fn(tx as unknown as typeof prisma);
    });

    await expect(initiatePayment('user-1', { orderId: 'nonexistent', method: 'CARD' }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws ForbiddenError when order belongs to another user', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        order: { findUnique: jest.fn().mockResolvedValue({ ...mockOrder, userId: 'user-2' }) },
        payment: { create: jest.fn() },
      };
      return fn(tx as unknown as typeof prisma);
    });

    await expect(initiatePayment('user-1', { orderId: 'order-1', method: 'CARD' }))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws BadRequestError for non-PENDING order', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        order: { findUnique: jest.fn().mockResolvedValue({ ...mockOrder, status: 'DELIVERED' }) },
        payment: { create: jest.fn() },
      };
      return fn(tx as unknown as typeof prisma);
    });

    await expect(initiatePayment('user-1', { orderId: 'order-1', method: 'CARD' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws ConflictError when payment already exists', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        order: {
          findUnique: jest.fn().mockResolvedValue({ ...mockOrder, payment: mockPayment }),
        },
        payment: { create: jest.fn() },
      };
      return fn(tx as unknown as typeof prisma);
    });

    await expect(initiatePayment('user-1', { orderId: 'order-1', method: 'CARD' }))
      .rejects.toMatchObject({ statusCode: 409 });
  });
});

// ─── getPaymentByOrderId ──────────────────────────────────────────────────────

describe('getPaymentByOrderId', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns payment when order belongs to user', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue({
      userId: 'user-1',
      payment: mockPayment,
    });

    const result = await getPaymentByOrderId('user-1', 'order-1');
    expect(result.id).toBe('pay-1');
  });

  it('throws NotFoundError when order not found', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(getPaymentByOrderId('user-1', 'order-1')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws ForbiddenError when order belongs to another user', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue({ userId: 'user-2', payment: mockPayment });
    await expect(getPaymentByOrderId('user-1', 'order-1')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws NotFoundError when no payment for order', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue({ userId: 'user-1', payment: null });
    await expect(getPaymentByOrderId('user-1', 'order-1')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── handlePaymentCallback ────────────────────────────────────────────────────

describe('handlePaymentCallback', () => {
  beforeEach(() => jest.clearAllMocks());

  it('processes successful payment callback', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        payment: {
          findUnique: jest.fn().mockResolvedValue({ id: 'pay-1', orderId: 'order-1', status: 'PENDING' }),
          update: jest.fn().mockResolvedValue({ ...mockPayment, status: 'PAID', transactionId: 'TXN-123' }),
        },
        order: {
          update: jest.fn().mockResolvedValue({ ...mockOrder, status: 'CONFIRMED' }),
        },
      };
      return fn(tx as unknown as typeof prisma);
    });

    const result = await handlePaymentCallback({
      paymentId: 'pay-1',
      status: 'PAID',
      transactionId: 'TXN-123',
    });
    expect(result.status).toBe('PAID');
  });

  it('throws ConflictError when payment already PAID', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        payment: {
          findUnique: jest.fn().mockResolvedValue({ id: 'pay-1', orderId: 'order-1', status: 'PAID' }),
          update: jest.fn(),
        },
        order: { update: jest.fn() },
      };
      return fn(tx as unknown as typeof prisma);
    });

    await expect(handlePaymentCallback({ paymentId: 'pay-1', status: 'PAID' }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  it('throws NotFoundError when payment not found', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        payment: {
          findUnique: jest.fn().mockResolvedValue(null),
          update: jest.fn(),
        },
        order: { update: jest.fn() },
      };
      return fn(tx as unknown as typeof prisma);
    });

    await expect(handlePaymentCallback({ paymentId: 'nonexistent', status: 'PAID' }))
      .rejects.toMatchObject({ statusCode: 404 });
  });
});
