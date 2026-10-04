/**
 * GET    /api/admin/coupons/[id] — Get coupon by ID (ADMIN only)
 * PATCH  /api/admin/coupons/[id] — Update coupon (ADMIN only)
 * DELETE /api/admin/coupons/[id] — Delete coupon (ADMIN only)
 */

import { type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { parseBody } from '@/lib/validation';
import { updateCouponSchema } from '@/lib/validation/coupon.schema';
import { getCouponById, updateCoupon, deleteCoupon } from '@/lib/services/coupon.service';
import { successResponse, handleApiError } from '@/lib/api/response';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const coupon = await getCouponById(id);
    return successResponse(coupon);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const input = await parseBody(request, updateCouponSchema);
    const coupon = await updateCoupon(id, input);
    return successResponse(coupon);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    await deleteCoupon(id);
    return successResponse({ message: 'Coupon deleted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
