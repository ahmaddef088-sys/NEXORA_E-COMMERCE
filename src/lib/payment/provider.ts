/**
 * Payment provider abstraction interface.
 *
 * The payment system is designed as a provider pattern:
 * - PaymentProvider interface defines the contract.
 * - Concrete providers (MockPaymentProvider, StripeProvider, etc.) implement it.
 * - The factory selects the appropriate provider at runtime.
 *
 * This decouples the order system from any specific payment provider.
 */

// ─── Provider interface ───────────────────────────────────────────────────────

export interface PaymentInitResult {
  /**
   * The payment record ID (internal).
   */
  paymentId: string;
  /**
   * Provider-specific checkout URL (for redirect-based flows).
   * Null for manual/instant payment methods.
   */
  checkoutUrl: string | null;
  /**
   * Provider-specific transaction reference.
   */
  transactionId: string | null;
  /**
   * Whether the payment was immediately confirmed (e.g., cash on delivery).
   */
  status: 'PENDING' | 'PAID';
}

export interface PaymentProvider {
  /**
   * Initialize a payment for an order.
   */
  initializePayment(params: {
    paymentId: string;
    orderId: string;
    amount: number;
    method: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentInitResult>;

  /**
   * Verify a payment using provider-specific data.
   */
  verifyPayment(params: {
    paymentId: string;
    transactionId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ status: 'PAID' | 'FAILED'; transactionId?: string }>;
}

// ─── Mock payment provider (development/testing) ──────────────────────────────

/**
 * Mock payment provider for development and testing.
 * Simulates payment flow without real provider integration.
 * CASH method is immediately confirmed; others remain PENDING.
 */
export class MockPaymentProvider implements PaymentProvider {
  async initializePayment(params: {
    paymentId: string;
    orderId: string;
    amount: number;
    method: string;
  }): Promise<PaymentInitResult> {
    // Cash on delivery is immediately "paid"
    if (params.method === 'CASH') {
      return {
        paymentId: params.paymentId,
        checkoutUrl: null,
        transactionId: `CASH-${params.paymentId}`,
        status: 'PAID',
      };
    }

    // Other methods simulate a redirect to a checkout page
    return {
      paymentId: params.paymentId,
      checkoutUrl: `/checkout/payment/${params.paymentId}`,
      transactionId: null,
      status: 'PENDING',
    };
  }

  async verifyPayment(params: {
    paymentId: string;
    transactionId?: string;
  }): Promise<{ status: 'PAID' | 'FAILED'; transactionId?: string }> {
    return {
      status: 'PAID',
      transactionId: params.transactionId ?? `TXN-${params.paymentId}`,
    };
  }
}

// ─── Provider factory ─────────────────────────────────────────────────────────

/**
 * Get the active payment provider based on environment configuration.
 * Additional providers (Stripe, Paymob, PayPal) can be added here.
 */
export function getPaymentProvider(): PaymentProvider {
  // In production, you would select based on env config:
  // if (env.PAYMENT_PROVIDER === 'stripe') return new StripeProvider();
  // if (env.PAYMENT_PROVIDER === 'paymob') return new PaymobProvider();
  return new MockPaymentProvider();
}
