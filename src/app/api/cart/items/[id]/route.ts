/**
 * PATCH  /api/cart/items/:id — Update cart item quantity
 * DELETE /api/cart/items/:id — Remove item from cart
 */

import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { parseBody } from '@/lib/validation';
import { updateCartItemSchema } from '@/lib/validation/cart.schema';
import { updateCartItem, removeCartItem } from '@/lib/services/cart.service';
import { successResponse, handleApiError } from '@/lib/api/response';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const auth = await requireAuth(request);
    const { id } = await context.params;
    const input = await parseBody(request, updateCartItemSchema);
    const cart = await updateCartItem(auth.userId, id, input);
    return successResponse(cart);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const auth = await requireAuth(request);
    const { id } = await context.params;
    const cart = await removeCartItem(auth.userId, id);
    return successResponse(cart);
  } catch (error) {
    return handleApiError(error);
  }
}
