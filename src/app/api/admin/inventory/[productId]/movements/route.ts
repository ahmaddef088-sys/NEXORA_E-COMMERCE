/**
 * GET /api/admin/inventory/:productId/movements — Get stock movement history for a product (ADMIN only)
 */

import { type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { getStockMovements } from '@/lib/services/inventory.service';
import { successResponse, handleApiError } from '@/lib/api/response';

type RouteContext = { params: Promise<{ productId: string }> };

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    await requireAdmin(request);
    const { productId } = await context.params;

    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10) || 50), 100) : 50;

    const movements = await getStockMovements(productId, limit);
    return successResponse(movements);
  } catch (error) {
    return handleApiError(error);
  }
}
