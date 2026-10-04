/**
 * PATCH /api/admin/orders/:id — Update order status (ADMIN only)
 */

import { type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { parseBody } from '@/lib/validation';
import { updateOrderStatusSchema } from '@/lib/validation/order.schema';
import { updateOrderStatus } from '@/lib/services/order.service';
import { successResponse, handleApiError } from '@/lib/api/response';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const input = await parseBody(request, updateOrderStatusSchema);
    const order = await updateOrderStatus(id, input);
    return successResponse(order);
  } catch (error) {
    return handleApiError(error);
  }
}
