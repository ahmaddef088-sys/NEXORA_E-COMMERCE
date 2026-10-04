/**
 * POST /api/payments — Initiate a payment for an order
 */

import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { parseBody } from '@/lib/validation';
import { createPaymentSchema } from '@/lib/validation/payment.schema';
import { initiatePayment } from '@/lib/services/payment.service';
import { createdResponse, handleApiError } from '@/lib/api/response';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const auth = await requireAuth(request);
    const input = await parseBody(request, createPaymentSchema);
    const result = await initiatePayment(auth.userId, input);
    return createdResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}
