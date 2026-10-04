/**
 * Order service — checkout flow and order management.
 *
 * Security contract:
 * - Never trust prices, totals, or stock from the frontend.
 * - All prices, subtotals, shipping, tax, discount, and total are recalculated server-side.
 * - Cart ownership is validated.
 * - Shipping address ownership is validated.
 * - Stock is decremented atomically within a transaction to prevent overselling.
 * - Order items snapshot product data at purchase time (name, SKU, price).
 * - Historical orders remain correct even if products are later modified.
 */

import { prisma } from '@/lib/db/prisma';
import {
  BadRequestError,
  ForbiddenError,
  InsufficientStockError,
  NotFoundError,
  UnprocessableError,
} from '@/lib/errors/HttpError';
import { logger } from '@/lib/logger';
import { buildPaginationMeta } from '@/lib/api/response';
import type { CheckoutInput, OrderQuery, UpdateOrderStatusInput } from '@/lib/validation/order.schema';
import type { PaginationMeta } from '@/lib/api/response';

// ─── Constants ────────────────────────────────────────────────────────────────

const SHIPPING_RATE = 10.00; // Flat-rate shipping (extendable)
const TAX_RATE = 0.08;       // 8% tax

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrderItemSnapshot = {
  id: string;
  orderId: string;
  productId: string | null;
  productName: string;
  sku: string;
  unitPrice: string;
  quantity: number;
  subtotal: string;
};

export type OrderSummary = {
  id: string;
  userId: string;
  status: string;
  subtotal: string;
  shipping: string;
  tax: string;
  discount: string;
  total: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  shippingAddress: {
    id: string;
    fullName: string;
    phone: string;
    country: string;
    city: string;
    addressLine: string;
    postalCode: string | null;
  } | null;
  items: OrderItemSnapshot[];
  payment: {
    id: string;
    status: string;
    method: string;
    amount: string;
  } | null;
};

export type OrderListResult = {
  data: OrderSummary[];
  meta: PaginationMeta;
};

// ─── Selectors ────────────────────────────────────────────────────────────────

const orderSelect = {
  id: true,
  userId: true,
  status: true,
  subtotal: true,
  shipping: true,
  tax: true,
  discount: true,
  total: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  shippingAddress: {
    select: {
      id: true,
      fullName: true,
      phone: true,
      country: true,
      city: true,
      addressLine: true,
      postalCode: true,
    },
  },
  items: {
    select: {
      id: true,
      orderId: true,
      productId: true,
      productName: true,
      sku: true,
      unitPrice: true,
      quantity: true,
      subtotal: true,
    },
  },
  payment: {
    select: {
      id: true,
      status: true,
      method: true,
      amount: true,
    },
  },
} as const;

// ─── Checkout (create order) ──────────────────────────────────────────────────

export async function checkout(userId: string, input: CheckoutInput): Promise<OrderSummary> {
  return prisma.$transaction(async (tx) => {
    // 1. Get the user's cart with items
    const cart = await tx.cart.findUnique({
      where: { userId },
      select: {
        id: true,
        items: {
          select: {
            id: true,
            productId: true,
            quantity: true,
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
                stock: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw BadRequestError('Cart is empty');
    }

    // 2. Validate shipping address ownership
    const address = await tx.address.findUnique({
      where: { id: input.shippingAddressId },
      select: { id: true, userId: true },
    });

    if (!address) {
      throw NotFoundError('Shipping address');
    }

    if (address.userId !== userId) {
      throw ForbiddenError('Access denied to this address');
    }

    // 3. Validate all products: existence, active state, stock availability
    for (const item of cart.items) {
      if (!item.product || !item.product.isActive) {
        throw UnprocessableError(`Product is no longer available`);
      }

      if (item.product.stock < item.quantity) {
        throw InsufficientStockError(item.product.name);
      }
    }

    // 4. Calculate totals server-side (never trust frontend)
    let subtotal = 0;
    for (const item of cart.items) {
      const unitPrice = parseFloat(item.product.price.toString());
      subtotal += unitPrice * item.quantity;
    }

    const shipping = SHIPPING_RATE;
    const tax = parseFloat((subtotal * TAX_RATE).toFixed(2));
    const discount = 0; // Coupon support added in Phase 15
    const total = parseFloat((subtotal + shipping + tax - discount).toFixed(2));

    // 5. Create the order
    const order = await tx.order.create({
      data: {
        userId,
        shippingAddressId: input.shippingAddressId,
        notes: input.notes ?? null,
        subtotal,
        shipping,
        tax,
        discount,
        total,
        status: 'PENDING',
        // Create order items snapshot — preserves product data at time of purchase
        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            productName: item.product.name,
            sku: item.product.sku,
            unitPrice: parseFloat(item.product.price.toString()),
            quantity: item.quantity,
            subtotal: parseFloat((parseFloat(item.product.price.toString()) * item.quantity).toFixed(2)),
          })),
        },
      },
      select: orderSelect,
    });

    // 6. Decrement stock for each product (atomic within transaction)
    for (const item of cart.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    // 7. Clear the cart
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    logger.info('Order created via checkout', {
      userId,
      orderId: order.id,
      total: order.total,
    });

    return order as unknown as OrderSummary;
  });
}

// ─── List orders (customer) ───────────────────────────────────────────────────

export async function listUserOrders(
  userId: string,
  query: OrderQuery
): Promise<OrderListResult> {
  const { page, limit, status, sortOrder } = query;
  const skip = (page - 1) * limit;

  const where = {
    userId,
    ...(status ? { status } : {}),
  };

  const [data, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      select: orderSelect,
      orderBy: { createdAt: sortOrder },
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    data: data as unknown as OrderSummary[],
    meta: buildPaginationMeta(page, limit, total),
  };
}

// ─── Get order by ID (customer) ───────────────────────────────────────────────

export async function getUserOrder(userId: string, orderId: string): Promise<OrderSummary> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: orderSelect,
  });

  if (!order) {
    throw NotFoundError('Order');
  }

  // Ownership check — prevent IDOR
  if (order.userId !== userId) {
    throw ForbiddenError('Access denied');
  }

  return order as unknown as OrderSummary;
}

// ─── List all orders (admin) ──────────────────────────────────────────────────

export async function listAllOrders(query: OrderQuery): Promise<OrderListResult> {
  const { page, limit, status, sortOrder } = query;
  const skip = (page - 1) * limit;

  const where = {
    ...(status ? { status } : {}),
  };

  const [data, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      select: {
        ...orderSelect,
        user: {
          select: { id: true, email: true, name: true },
        },
      },
      orderBy: { createdAt: sortOrder },
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    data: data as unknown as OrderSummary[],
    meta: buildPaginationMeta(page, limit, total),
  };
}

// ─── Update order status (admin) ──────────────────────────────────────────────

export async function updateOrderStatus(
  orderId: string,
  input: UpdateOrderStatusInput
): Promise<OrderSummary> {
  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true },
  });

  if (!existing) {
    throw NotFoundError('Order');
  }

  // Validate status transition
  const validTransitions: Record<string, string[]> = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['PROCESSING', 'CANCELLED'],
    PROCESSING: ['SHIPPED', 'CANCELLED'],
    SHIPPED: ['DELIVERED'],
    DELIVERED: [],
    CANCELLED: [],
  };

  const allowed = validTransitions[existing.status] ?? [];
  if (!allowed.includes(input.status)) {
    throw BadRequestError(
      `Cannot transition order from ${existing.status} to ${input.status}`
    );
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: input.status,
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
    select: orderSelect,
  });

  logger.info('Order status updated', { orderId, status: input.status });

  return updated as unknown as OrderSummary;
}
