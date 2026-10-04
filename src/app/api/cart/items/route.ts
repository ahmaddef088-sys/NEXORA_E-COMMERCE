/**
 * POST /api/cart/items — Add an item to the cart
 */

import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { parseBody } from '@/lib/validation';
import { addCartItemSchema } from '@/lib/validation/cart.schema';
import { addCartItem } from '@/lib/services/cart.service';
import { successResponse, handleApiError } from '@/lib/api/response';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const auth = await requireAuth(request);
    const input = await parseBody(request, addCartItemSchema);
    const cart = await addCartItem(auth.userId, input);
    return successResponse(cart);
  } catch (error) {
    return handleApiError(error);
  }
}
