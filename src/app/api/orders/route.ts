/**
 * GET /api/orders — List authenticated user's orders
 */

import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { parseQuery } from '@/lib/validation';
import { orderQuerySchema } from '@/lib/validation/order.schema';
import { listUserOrders } from '@/lib/services/order.service';
import { paginatedResponse, handleApiError } from '@/lib/api/response';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const auth = await requireAuth(request);
    const query = parseQuery(request.nextUrl.searchParams, orderQuerySchema);
    const result = await listUserOrders(auth.userId, query);
    return paginatedResponse(result.data, result.meta);
  } catch (error) {
    return handleApiError(error);
  }
}
