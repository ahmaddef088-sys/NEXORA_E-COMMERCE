/**
 * GET /api/admin/payments — List payments with filtering (ADMIN only)
 */

import { type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { parseQuery } from '@/lib/validation';
import { adminPaymentQuerySchema } from '@/lib/validation/dashboard.schema';
import { listAdminPayments } from '@/lib/services/dashboard.service';
import { paginatedResponse, handleApiError } from '@/lib/api/response';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    await requireAdmin(request);
    const query = parseQuery(request.nextUrl.searchParams, adminPaymentQuerySchema);
    const result = await listAdminPayments(query);
    return paginatedResponse(result.data, result.meta);
  } catch (error) {
    return handleApiError(error);
  }
}
