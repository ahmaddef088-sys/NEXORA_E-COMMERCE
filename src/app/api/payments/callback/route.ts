/**
 * POST /api/payments/callback — Payment provider webhook/callback handler
 *
 * This endpoint receives callbacks from payment providers (Stripe, Paymob, etc.)
 * to update payment status. In production, this must be secured with
 * provider-specific webhook signature verification.
 */

import { type NextRequest } from 'next/server';
import { parseBody } from '@/lib/validation';
import { paymentCallbackSchema } from '@/lib/validation/payment.schema';
import { handlePaymentCallback } from '@/lib/services/payment.service';
import { successResponse, handleApiError } from '@/lib/api/response';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    // NOTE: In production, verify the webhook signature from the payment provider
    // before processing. This prevents fake callback attacks.
    const input = await parseBody(request, paymentCallbackSchema);
    const payment = await handlePaymentCallback(input);
    return successResponse(payment);
  } catch (error) {
    return handleApiError(error);
  }
}
