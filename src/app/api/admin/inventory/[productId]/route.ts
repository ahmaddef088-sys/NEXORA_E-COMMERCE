/**
 * GET  /api/admin/inventory/:productId — Get inventory for a specific product (ADMIN only)
 * POST /api/admin/inventory/:productId/adjust — Adjust stock for a product (ADMIN only)
 */

import { type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { parseBody } from '@/lib/validation';
import { stockAdjustmentSchema } from '@/lib/validation/inventory.schema';
import { getProductInventory, adjustStock } from '@/lib/services/inventory.service';
import { successResponse, handleApiError } from '@/lib/api/response';

type RouteContext = { params: Promise<{ productId: string }> };

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    await requireAdmin(request);
    const { productId } = await context.params;
    const inventory = await getProductInventory(productId);
    return successResponse(inventory);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    await requireAdmin(request);
    const { productId } = await context.params;
    const input = await parseBody(request, stockAdjustmentSchema);
    const inventory = await adjustStock(productId, input);
    return successResponse(inventory);
  } catch (error) {
    return handleApiError(error);
  }
}
