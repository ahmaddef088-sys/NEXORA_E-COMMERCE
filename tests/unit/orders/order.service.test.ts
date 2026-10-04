/**
 * Unit tests for order.service.ts
 * Tests checkout flow, order retrieval, and order status management.
 */

import {
  checkout,
  listUserOrders,
  getUserOrder,
  updateOrderStatus,
} from '@/lib/services/order.service';

// ─── Mock prisma ──────────────────────────────────────────────────────────────

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    order: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    cart: { findUnique: jest.fn() },
    address: { findUnique: jest.fn() },
    cartItem: { deleteMany: jest.fn() },
    product: { update: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { prisma } from '@/lib/db/prisma';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockAddress = {
  id: 'addr-1',
  userId: 'user-1',
  fullName: 'Alice',
  phone: '+1',
  country: 'US',
  city: 'NY',
  addressLine: '123 Main',
  postalCode: '10001',
};

const mockCartWithItems = {
  id: 'cart-1',
  items: [
    {
      id: 'item-1',
      productId: 'prod-1',
      quantity: 2,
      product: {
        id: 'prod-1',
        name: 'Laptop',
        sku: 'LAPTOP-001',
        price: '100.00',
        stock: 10,
        isActive: true,
      },
    },
  ],
};

const mockOrder = {
  id: 'order-1',
  userId: 'user-1',
  status: 'PENDING',
  subtotal: '200.00',
  shipping: '10.00',
  tax: '16.00',
  discount: '0.00',
  total: '226.00',
  notes: null,
  shippingAddressId: 'addr-1',
  shippingAddress: mockAddress,
  items: [
    {
      id: 'oi-1',
      orderId: 'order-1',
      productId: 'prod-1',
      productName: 'Laptop',
      sku: 'LAPTOP-001',
      unitPrice: '100.00',
      quantity: 2,
      subtotal: '200.00',
    },
  ],
  payment: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// ─── checkout ─────────────────────────────────────────────────────────────────

describe('checkout', () => {
  beforeEach(() => jest.clearAllMocks());

  const makeTx = (overrides: Record<string, unknown> = {}) => ({
    cart: { findUnique: jest.fn().mockResolvedValue(mockCartWithItems) },
    address: { findUnique: jest.fn().mockResolvedValue({ id: 'addr-1', userId: 'user-1' }) },
    order: { create: jest.fn().mockResolvedValue(mockOrder) },
    product: { update: jest.fn().mockResolvedValue({}) },
    cartItem: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
    ...overrides,
  });

  it('creates an order from cart', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      return fn(makeTx() as unknown as typeof prisma);
    });

    const result = await checkout('user-1', { shippingAddressId: 'addr-1' });
    expect(result.id).toBe('order-1');
    expect(result.status).toBe('PENDING');
  });

  it('throws BadRequestError when cart is empty', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        cart: { findUnique: jest.fn().mockResolvedValue({ id: 'cart-1', items: [] }) },
        address: { findUnique: jest.fn() },
        order: { create: jest.fn() },
        product: { update: jest.fn() },
        cartItem: { deleteMany: jest.fn() },
      };
      return fn(tx as unknown as typeof prisma);
    });

    await expect(checkout('user-1', { shippingAddressId: 'addr-1' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws NotFoundError when cart does not exist', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        cart: { findUnique: jest.fn().mockResolvedValue(null) },
        address: { findUnique: jest.fn() },
        order: { create: jest.fn() },
        product: { update: jest.fn() },
        cartItem: { deleteMany: jest.fn() },
      };
      return fn(tx as unknown as typeof prisma);
    });

    await expect(checkout('user-1', { shippingAddressId: 'addr-1' }))
      .rejects.toMatchObject({ statusCode: 400 }); // empty cart error
  });

  it('throws NotFoundError when address does not exist', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        cart: { findUnique: jest.fn().mockResolvedValue(mockCartWithItems) },
        address: { findUnique: jest.fn().mockResolvedValue(null) },
        order: { create: jest.fn() },
        product: { update: jest.fn() },
        cartItem: { deleteMany: jest.fn() },
      };
      return fn(tx as unknown as typeof prisma);
    });

    await expect(checkout('user-1', { shippingAddressId: 'addr-2' }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws ForbiddenError when address belongs to another user', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        cart: { findUnique: jest.fn().mockResolvedValue(mockCartWithItems) },
        address: { findUnique: jest.fn().mockResolvedValue({ id: 'addr-1', userId: 'user-2' }) },
        order: { create: jest.fn() },
        product: { update: jest.fn() },
        cartItem: { deleteMany: jest.fn() },
      };
      return fn(tx as unknown as typeof prisma);
    });

    await expect(checkout('user-1', { shippingAddressId: 'addr-1' }))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws InsufficientStockError when stock is insufficient', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        cart: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'cart-1',
            items: [{
              id: 'item-1',
              productId: 'prod-1',
              quantity: 5, // wants 5
              product: { id: 'prod-1', name: 'Laptop', sku: 'SKU', price: '100', stock: 2, isActive: true }, // only 2
            }],
          }),
        },
        address: { findUnique: jest.fn().mockResolvedValue({ id: 'addr-1', userId: 'user-1' }) },
        order: { create: jest.fn() },
        product: { update: jest.fn() },
        cartItem: { deleteMany: jest.fn() },
      };
      return fn(tx as unknown as typeof prisma);
    });

    await expect(checkout('user-1', { shippingAddressId: 'addr-1' }))
      .rejects.toMatchObject({ statusCode: 422, code: 'INSUFFICIENT_STOCK' });
  });
});

// ─── getUserOrder ─────────────────────────────────────────────────────────────

describe('getUserOrder', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns order owned by user', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
    const result = await getUserOrder('user-1', 'order-1');
    expect(result.id).toBe('order-1');
  });

  it('throws NotFoundError when order does not exist', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(getUserOrder('user-1', 'nonexistent')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws ForbiddenError when order belongs to another user (IDOR prevention)', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue({ ...mockOrder, userId: 'user-2' });
    await expect(getUserOrder('user-1', 'order-1')).rejects.toMatchObject({ statusCode: 403 });
  });
});

// ─── listUserOrders ───────────────────────────────────────────────────────────

describe('listUserOrders', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns paginated orders for user', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([[mockOrder], 1]);
    const result = await listUserOrders('user-1', { page: 1, limit: 20, sortOrder: 'desc' });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });
});

// ─── updateOrderStatus ────────────────────────────────────────────────────────

describe('updateOrderStatus', () => {
  beforeEach(() => jest.clearAllMocks());

  it('transitions PENDING → CONFIRMED', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue({ id: 'order-1', status: 'PENDING' });
    (prisma.order.update as jest.Mock).mockResolvedValue({ ...mockOrder, status: 'CONFIRMED' });

    const result = await updateOrderStatus('order-1', { status: 'CONFIRMED' });
    expect(result.status).toBe('CONFIRMED');
  });

  it('transitions CONFIRMED → PROCESSING', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue({ id: 'order-1', status: 'CONFIRMED' });
    (prisma.order.update as jest.Mock).mockResolvedValue({ ...mockOrder, status: 'PROCESSING' });

    const result = await updateOrderStatus('order-1', { status: 'PROCESSING' });
    expect(result.status).toBe('PROCESSING');
  });

  it('rejects invalid status transition PENDING → DELIVERED', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue({ id: 'order-1', status: 'PENDING' });

    await expect(updateOrderStatus('order-1', { status: 'DELIVERED' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects transitioning from DELIVERED', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue({ id: 'order-1', status: 'DELIVERED' });

    await expect(updateOrderStatus('order-1', { status: 'CANCELLED' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws NotFoundError when order not found', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(updateOrderStatus('nonexistent', { status: 'CONFIRMED' }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('cancels PENDING order', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue({ id: 'order-1', status: 'PENDING' });
    (prisma.order.update as jest.Mock).mockResolvedValue({ ...mockOrder, status: 'CANCELLED' });

    const result = await updateOrderStatus('order-1', { status: 'CANCELLED' });
    expect(result.status).toBe('CANCELLED');
  });
});
