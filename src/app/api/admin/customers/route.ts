/**
 * GET /api/admin/customers — List registered customers (ADMIN only)
 */

import { type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { parseQuery } from '@/lib/validation';
import { adminCustomerQuerySchema } from '@/lib/validation/dashboard.schema';
import { listAdminCustomers } from '@/lib/services/dashboard.service';
import { paginatedResponse, handleApiError } from '@/lib/api/response';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    await requireAdmin(request);
    const query = parseQuery(request.nextUrl.searchParams, adminCustomerQuerySchema);
    const result = await listAdminCustomers(query);
    return paginatedResponse(result.data, result.meta);
  } catch (error) {
    return handleApiError(error);
  }
}
