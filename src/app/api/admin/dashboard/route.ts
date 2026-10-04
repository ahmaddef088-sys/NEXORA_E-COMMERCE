/**
 * GET /api/admin/dashboard — Overview metrics and analytics (ADMIN only)
 */

import { type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { getDashboardMetrics } from '@/lib/services/dashboard.service';
import { successResponse, handleApiError } from '@/lib/api/response';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    await requireAdmin(request);
    const metrics = await getDashboardMetrics();
    return successResponse(metrics);
  } catch (error) {
    return handleApiError(error);
  }
}
