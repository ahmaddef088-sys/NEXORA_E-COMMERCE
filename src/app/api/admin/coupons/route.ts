/**
 * GET  /api/admin/coupons — List all coupons (ADMIN only)
 * POST /api/admin/coupons — Create a coupon (ADMIN only)
 */

import { type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { parseBody, parseQuery } from '@/lib/validation';
import { createCouponSchema, couponQuerySchema } from '@/lib/validation/coupon.schema';
import { listCoupons, createCoupon } from '@/lib/services/coupon.service';
import {
  paginatedResponse,
  createdResponse,
  handleApiError,
} from '@/lib/api/response';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    await requireAdmin(request);
    const query = parseQuery(request.nextUrl.searchParams, couponQuerySchema);
    const result = await listCoupons(query);
    return paginatedResponse(result.data, result.meta);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    await requireAdmin(request);
    const input = await parseBody(request, createCouponSchema);
    const coupon = await createCoupon(input);
    return createdResponse(coupon);
  } catch (error) {
    return handleApiError(error);
  }
}
