/**
 * POST /api/coupons/validate — Validate a coupon and calculate discount (authenticated customers)
 *
 * Returns server-calculated discount — frontend must use this value, never calculate its own.
 */

import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { parseBody } from '@/lib/validation';
import { applyCouponSchema } from '@/lib/validation/coupon.schema';
import { validateCoupon } from '@/lib/services/coupon.service';
import { successResponse, handleApiError } from '@/lib/api/response';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const auth = await requireAuth(request);
    const input = await parseBody(request, applyCouponSchema);
    const result = await validateCoupon(input, auth.userId);
    return successResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}
