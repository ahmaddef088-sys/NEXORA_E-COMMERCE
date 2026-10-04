/**
 * POST /api/admin/reviews/[reviewId]/approve — Approve or reject a review (ADMIN only)
 */

import { type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { z } from 'zod';
import { parseBody } from '@/lib/validation';
import { setReviewApproval } from '@/lib/services/review.service';
import { successResponse, handleApiError } from '@/lib/api/response';

type RouteContext = { params: Promise<{ reviewId: string }> };

const approveSchema = z.object({
  isApproved: z.boolean(),
});

export async function POST(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    await requireAdmin(request);
    const { reviewId } = await context.params;
    const { isApproved } = await parseBody(request, approveSchema);
    const review = await setReviewApproval(reviewId, isApproved);
    return successResponse(review);
  } catch (error) {
    return handleApiError(error);
  }
}
