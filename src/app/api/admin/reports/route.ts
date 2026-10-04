/**
 * GET /api/admin/reports — Sales and revenue reports (ADMIN only)
 */

import { type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { parseQuery } from '@/lib/validation';
import { reportQuerySchema } from '@/lib/validation/dashboard.schema';
import { getSalesReport } from '@/lib/services/dashboard.service';
import { successResponse, handleApiError } from '@/lib/api/response';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    await requireAdmin(request);
    const query = parseQuery(request.nextUrl.searchParams, reportQuerySchema);
    const report = await getSalesReport(query);
    return successResponse(report);
  } catch (error) {
    return handleApiError(error);
  }
}
