/**
 * GET    /api/cart — Get the current user's cart
 * POST   /api/cart/items — Add an item to the cart
 * DELETE /api/cart — Clear the entire cart
 */

import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getCart, clearCart } from '@/lib/services/cart.service';
import { successResponse, noContentResponse, handleApiError } from '@/lib/api/response';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const auth = await requireAuth(request);
    const cart = await getCart(auth.userId);
    return successResponse(cart);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest): Promise<Response> {
  try {
    const auth = await requireAuth(request);
    await clearCart(auth.userId);
    return noContentResponse();
  } catch (error) {
    return handleApiError(error);
  }
}
