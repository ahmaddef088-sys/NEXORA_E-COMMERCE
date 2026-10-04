/**
 * GET /api/admin/inventory — List inventory records (ADMIN only)
 */

import { type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { parseQuery } from '@/lib/validation';
import { inventoryQuerySchema } from '@/lib/validation/inventory.schema';
import { listInventory } from '@/lib/services/inventory.service';
import { paginatedResponse, handleApiError } from '@/lib/api/response';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    await requireAdmin(request);
    const query = parseQuery(request.nextUrl.searchParams, inventoryQuerySchema);
    const result = await listInventory(query);
    return paginatedResponse(result.data, result.meta);
  } catch (error) {
    return handleApiError(error);
  }
}
