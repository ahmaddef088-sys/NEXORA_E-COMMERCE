/**
 * POST /api/checkout — Create an order from the cart (authenticated)
 *
 * Flow:
 * Cart → Validate address ownership → Validate products → Calculate totals → Create order → Decrement stock → Clear cart
 */

import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { parseBody } from '@/lib/validation';
import { checkoutSchema } from '@/lib/validation/order.schema';
import { checkout } from '@/lib/services/order.service';
import { createdResponse, handleApiError } from '@/lib/api/response';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const auth = await requireAuth(request);
    const input = await parseBody(request, checkoutSchema);
    const order = await checkout(auth.userId, input);
    return createdResponse(order);
  } catch (error) {
    return handleApiError(error);
  }
}
