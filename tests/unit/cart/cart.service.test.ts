/**
 * Unit tests for cart.service.ts
 * Tests cart operations with stock validation and ownership enforcement.
 */

import {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,
} from '@/lib/services/cart.service';

// ─── Mock prisma ──────────────────────────────────────────────────────────────

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    cart: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    cartItem: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { prisma } from '@/lib/db/prisma';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockCart = { id: 'cart-1', userId: 'user-1' };
const mockProduct = {
  id: 'prod-1',
  name: 'Laptop',
  slug: 'laptop',
  sku: 'LAPTOP-001',
  price: '999.99',
  stock: 10,
  isActive: true,
  categoryId: null,
};
const mockCartItem = {
  id: 'item-1',
  cartId: 'cart-1',
  productId: 'prod-1',
  quantity: 2,
  product: mockProduct,
};

// ─── getCart ──────────────────────────────────────────────────────────────────

describe('getCart', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates cart if none exists and returns empty cart', async () => {
    (prisma.cart.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.cart.create as jest.Mock).mockResolvedValue(mockCart);
    (prisma.cartItem.findMany as jest.Mock).mockResolvedValue([]);

    const result = await getCart('user-1');
    expect(result.userId).toBe('user-1');
    expect(result.items).toHaveLength(0);
    expect(prisma.cart.create).toHaveBeenCalled();
  });

  it('returns existing cart with items', async () => {
    (prisma.cart.findUnique as jest.Mock).mockResolvedValue(mockCart);
    (prisma.cartItem.findMany as jest.Mock).mockResolvedValue([mockCartItem]);

    const result = await getCart('user-1');
    expect(result.id).toBe('cart-1');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].product.name).toBe('Laptop');
  });
});

// ─── addCartItem ──────────────────────────────────────────────────────────────

describe('addCartItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds new item to cart', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        product: {
          findUnique: jest.fn().mockResolvedValue({ id: 'prod-1', name: 'Laptop', stock: 10, isActive: true }),
        },
        cart: {
          upsert: jest.fn().mockResolvedValue(mockCart),
        },
        cartItem: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(mockCartItem),
          findMany: jest.fn().mockResolvedValue([mockCartItem]),
          update: jest.fn(),
        },
      };
      return fn(tx as unknown as typeof prisma);
    });

    const result = await addCartItem('user-1', { productId: 'prod-1', quantity: 2 });
    expect(result.items).toHaveLength(1);
  });

  it('throws NotFoundError when product does not exist', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        product: { findUnique: jest.fn().mockResolvedValue(null) },
        cart: { upsert: jest.fn() },
        cartItem: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn(), update: jest.fn() },
      };
      return fn(tx as unknown as typeof prisma);
    });

    await expect(addCartItem('user-1', { productId: 'nonexistent', quantity: 1 }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws NotFoundError when product is inactive', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        product: {
          findUnique: jest.fn().mockResolvedValue({ id: 'prod-1', name: 'Laptop', stock: 10, isActive: false }),
        },
        cart: { upsert: jest.fn() },
        cartItem: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn(), update: jest.fn() },
      };
      return fn(tx as unknown as typeof prisma);
    });

    await expect(addCartItem('user-1', { productId: 'prod-1', quantity: 1 }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws InsufficientStockError when quantity exceeds stock', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        product: {
          findUnique: jest.fn().mockResolvedValue({ id: 'prod-1', name: 'Laptop', stock: 1, isActive: true }),
        },
        cart: { upsert: jest.fn() },
        cartItem: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn(), update: jest.fn() },
      };
      return fn(tx as unknown as typeof prisma);
    });

    await expect(addCartItem('user-1', { productId: 'prod-1', quantity: 5 }))
      .rejects.toMatchObject({ statusCode: 422, code: 'INSUFFICIENT_STOCK' });
  });

  it('accumulates quantity when item already in cart', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        product: {
          findUnique: jest.fn().mockResolvedValue({ id: 'prod-1', name: 'Laptop', stock: 10, isActive: true }),
        },
        cart: {
          upsert: jest.fn().mockResolvedValue(mockCart),
        },
        cartItem: {
          findUnique: jest.fn().mockResolvedValue({ id: 'item-1', quantity: 3 }), // existing quantity
          update: jest.fn().mockResolvedValue({ ...mockCartItem, quantity: 5 }),
          findMany: jest.fn().mockResolvedValue([{ ...mockCartItem, quantity: 5 }]),
          create: jest.fn(),
        },
      };
      return fn(tx as unknown as typeof prisma);
    });

    const result = await addCartItem('user-1', { productId: 'prod-1', quantity: 2 }); // 3 + 2 = 5
    expect(result.items[0].quantity).toBe(5);
  });

  it('throws InsufficientStockError when accumulated quantity exceeds stock', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        product: {
          findUnique: jest.fn().mockResolvedValue({ id: 'prod-1', name: 'Laptop', stock: 4, isActive: true }),
        },
        cart: { upsert: jest.fn().mockResolvedValue(mockCart) },
        cartItem: {
          findUnique: jest.fn().mockResolvedValue({ id: 'item-1', quantity: 3 }), // already 3
          update: jest.fn(),
          findMany: jest.fn(),
          create: jest.fn(),
        },
      };
      return fn(tx as unknown as typeof prisma);
    });

    // 3 (existing) + 2 (new) = 5, but only 4 in stock
    await expect(addCartItem('user-1', { productId: 'prod-1', quantity: 2 }))
      .rejects.toMatchObject({ statusCode: 422, code: 'INSUFFICIENT_STOCK' });
  });
});

// ─── updateCartItem ───────────────────────────────────────────────────────────

describe('updateCartItem', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates cart item quantity', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        cartItem: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'item-1',
            cartId: 'cart-1',
            productId: 'prod-1',
            quantity: 2,
            cart: { userId: 'user-1' },
            product: { id: 'prod-1', name: 'Laptop', stock: 10, isActive: true },
          }),
          update: jest.fn().mockResolvedValue({ ...mockCartItem, quantity: 5 }),
          findMany: jest.fn().mockResolvedValue([{ ...mockCartItem, quantity: 5 }]),
        },
      };
      return fn(tx as unknown as typeof prisma);
    });

    const result = await updateCartItem('user-1', 'item-1', { quantity: 5 });
    expect(result.items[0].quantity).toBe(5);
  });

  it('throws ForbiddenError when item belongs to another user', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        cartItem: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'item-1',
            cartId: 'cart-2',
            productId: 'prod-1',
            quantity: 2,
            cart: { userId: 'user-2' }, // different user
            product: { id: 'prod-1', name: 'Laptop', stock: 10, isActive: true },
          }),
          update: jest.fn(),
          findMany: jest.fn(),
        },
      };
      return fn(tx as unknown as typeof prisma);
    });

    await expect(updateCartItem('user-1', 'item-1', { quantity: 5 }))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws InsufficientStockError when new quantity exceeds stock', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        cartItem: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'item-1',
            cartId: 'cart-1',
            productId: 'prod-1',
            quantity: 2,
            cart: { userId: 'user-1' },
            product: { id: 'prod-1', name: 'Laptop', stock: 3, isActive: true },
          }),
          update: jest.fn(),
          findMany: jest.fn(),
        },
      };
      return fn(tx as unknown as typeof prisma);
    });

    await expect(updateCartItem('user-1', 'item-1', { quantity: 5 }))
      .rejects.toMatchObject({ statusCode: 422, code: 'INSUFFICIENT_STOCK' });
  });
});

// ─── removeCartItem ───────────────────────────────────────────────────────────

describe('removeCartItem', () => {
  beforeEach(() => jest.clearAllMocks());

  it('removes item from cart', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        cartItem: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'item-1',
            cartId: 'cart-1',
            cart: { userId: 'user-1' },
          }),
          delete: jest.fn().mockResolvedValue({}),
          findMany: jest.fn().mockResolvedValue([]),
        },
      };
      return fn(tx as unknown as typeof prisma);
    });

    const result = await removeCartItem('user-1', 'item-1');
    expect(result.items).toHaveLength(0);
  });

  it('throws ForbiddenError when item belongs to another user', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        cartItem: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'item-1',
            cartId: 'cart-2',
            cart: { userId: 'user-2' },
          }),
          delete: jest.fn(),
          findMany: jest.fn(),
        },
      };
      return fn(tx as unknown as typeof prisma);
    });

    await expect(removeCartItem('user-1', 'item-1')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws NotFoundError when item does not exist', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        cartItem: {
          findUnique: jest.fn().mockResolvedValue(null),
          delete: jest.fn(),
          findMany: jest.fn(),
        },
      };
      return fn(tx as unknown as typeof prisma);
    });

    await expect(removeCartItem('user-1', 'nonexistent')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── clearCart ────────────────────────────────────────────────────────────────

describe('clearCart', () => {
  beforeEach(() => jest.clearAllMocks());

  it('clears all items from the cart', async () => {
    (prisma.cart.findUnique as jest.Mock).mockResolvedValue({ id: 'cart-1' });
    (prisma.cartItem.deleteMany as jest.Mock).mockResolvedValue({ count: 3 });

    await clearCart('user-1');
    expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({ where: { cartId: 'cart-1' } });
  });

  it('does nothing when cart does not exist', async () => {
    (prisma.cart.findUnique as jest.Mock).mockResolvedValue(null);

    await clearCart('user-1');
    expect(prisma.cartItem.deleteMany).not.toHaveBeenCalled();
  });
});
