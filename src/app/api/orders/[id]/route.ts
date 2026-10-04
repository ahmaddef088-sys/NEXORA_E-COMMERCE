/**
 * GET /api/orders/:id — Get a specific order (ownership enforced)
 */

import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getUserOrder } from '@/lib/services/order.service';
import { successResponse, handleApiError } from '@/lib/api/response';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const auth = await requireAuth(request);
    const { id } = await context.params;
    const order = await getUserOrder(auth.userId, id);
    return successResponse(order);
  } catch (error) {
    return handleApiError(error);
  }
}
