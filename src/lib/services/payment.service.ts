/**
 * Payment service — payment creation, verification, and refund management.
 *
 * Security contract:
 * - Payment amount is always taken from the order record, never from the frontend.
 * - Only the order owner can initiate a payment.
 * - Payment status transitions are validated (no going backwards).
 * - Payment method assignment is validated server-side.
 */

import { prisma } from '@/lib/db/prisma';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '@/lib/errors/HttpError';
import { logger } from '@/lib/logger';
import { getPaymentProvider } from '@/lib/payment/provider';
import type { CreatePaymentInput, PaymentCallbackInput } from '@/lib/validation/payment.schema';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PaymentDetail = {
  id: string;
  orderId: string;
  amount: unknown; // Prisma Decimal — serialized to string in API responses
  method: string;
  status: string;
  transactionId: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
};

const paymentSelect = {
  id: true,
  orderId: true,
  amount: true,
  method: true,
  status: true,
  transactionId: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ─── Initiate payment ─────────────────────────────────────────────────────────

export async function initiatePayment(
  userId: string,
  input: CreatePaymentInput
): Promise<{ payment: PaymentDetail; checkoutUrl: string | null }> {
  return prisma.$transaction(async (tx) => {
    // Validate order exists and belongs to user
    const order = await tx.order.findUnique({
      where: { id: input.orderId },
      select: { id: true, userId: true, status: true, total: true, payment: true },
    });

    if (!order) {
      throw NotFoundError('Order');
    }

    if (order.userId !== userId) {
      throw ForbiddenError('Access denied');
    }

    // Only PENDING orders can be paid
    if (order.status !== 'PENDING') {
      throw BadRequestError(`Cannot initiate payment for order with status ${order.status}`);
    }

    // Prevent double payment
    if (order.payment) {
      throw ConflictError('A payment already exists for this order');
    }

    // Amount is always taken from the order, never from the frontend
    const amount = parseFloat(order.total.toString());

    // Create the payment record
    const payment = await tx.payment.create({
      data: {
        orderId: input.orderId,
        amount,
        method: input.method,
        status: 'PENDING',
      },
      select: paymentSelect,
    });

    // Delegate to the payment provider
    const provider = getPaymentProvider();
    const result = await provider.initializePayment({
      paymentId: payment.id,
      orderId: input.orderId,
      amount,
      method: input.method,
    });

    // If immediately paid (e.g., CASH), update status right away
    if (result.status === 'PAID') {
      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'PAID',
          transactionId: result.transactionId,
        },
        select: paymentSelect,
      });

      // Confirm the order
      await tx.order.update({
        where: { id: input.orderId },
        data: { status: 'CONFIRMED' },
      });

      logger.info('Payment immediately confirmed', {
        userId,
        paymentId: payment.id,
        orderId: input.orderId,
        method: input.method,
      });

      return {
        payment: updated as PaymentDetail,
        checkoutUrl: null,
      };
    }

    logger.info('Payment initiated', {
      userId,
      paymentId: payment.id,
      orderId: input.orderId,
      method: input.method,
    });

    return {
      payment: payment as PaymentDetail,
      checkoutUrl: result.checkoutUrl,
    };
  });
}

// ─── Get payment by order ID ──────────────────────────────────────────────────

export async function getPaymentByOrderId(
  userId: string,
  orderId: string
): Promise<PaymentDetail> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { userId: true, payment: { select: paymentSelect } },
  });

  if (!order) {
    throw NotFoundError('Order');
  }

  if (order.userId !== userId) {
    throw ForbiddenError('Access denied');
  }

  if (!order.payment) {
    throw NotFoundError('Payment');
  }

  return order.payment as PaymentDetail;
}

// ─── Handle payment callback (webhook) ───────────────────────────────────────

export async function handlePaymentCallback(
  input: PaymentCallbackInput
): Promise<PaymentDetail> {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: input.paymentId },
      select: { id: true, orderId: true, status: true },
    });

    if (!payment) {
      throw NotFoundError('Payment');
    }

    // Prevent overwriting terminal states
    if (payment.status === 'PAID' || payment.status === 'REFUNDED') {
      throw ConflictError(`Payment is already in ${payment.status} state`);
    }

    const provider = getPaymentProvider();
    const verification = await provider.verifyPayment({
      paymentId: input.paymentId,
      transactionId: input.transactionId,
      metadata: input.metadata,
    });

    const updated = await tx.payment.update({
      where: { id: input.paymentId },
      data: {
        status: verification.status,
        transactionId: verification.transactionId ?? input.transactionId ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: (input.metadata ?? undefined) as any,
      },
      select: paymentSelect,
    });

    // Update order status based on payment result
    if (verification.status === 'PAID') {
      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: 'CONFIRMED' },
      });
    } else if (verification.status === 'FAILED') {
      // Leave order as PENDING for retry
    }

    logger.info('Payment callback processed', {
      paymentId: input.paymentId,
      status: verification.status,
    });

    return updated as PaymentDetail;
  });
}
