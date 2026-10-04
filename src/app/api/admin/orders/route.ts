/**
 * GET   /api/admin/orders — List all orders (ADMIN only)
 * PATCH /api/admin/orders — (not applicable at collection level)
 */

import { type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { parseQuery } from '@/lib/validation';
import { orderQuerySchema } from '@/lib/validation/order.schema';
import { listAllOrders } from '@/lib/services/order.service';
import { paginatedResponse, handleApiError } from '@/lib/api/response';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    await requireAdmin(request);
    const query = parseQuery(request.nextUrl.searchParams, orderQuerySchema);
    const result = await listAllOrders(query);
    return paginatedResponse(result.data, result.meta);
  } catch (error) {
    return handleApiError(error);
  }
}
