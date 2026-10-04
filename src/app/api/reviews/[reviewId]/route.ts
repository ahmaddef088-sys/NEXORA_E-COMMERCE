/**
 * PATCH  /api/reviews/[reviewId] — Update own review (authenticated customer)
 * DELETE /api/reviews/[reviewId] — Delete own review (owner) or any review (admin)
 */

import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { parseBody } from '@/lib/validation';
import { updateReviewSchema } from '@/lib/validation/review.schema';
import { updateReview, deleteReview } from '@/lib/services/review.service';
import { successResponse, handleApiError } from '@/lib/api/response';

type RouteContext = { params: Promise<{ reviewId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const auth = await requireAuth(request);
    const { reviewId } = await context.params;
    const input = await parseBody(request, updateReviewSchema);
    const review = await updateReview(reviewId, auth.userId, input);
    return successResponse(review);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const auth = await requireAuth(request);
    const { reviewId } = await context.params;
    const isAdmin = auth.role === 'ADMIN';
    await deleteReview(reviewId, auth.userId, isAdmin);
    return successResponse({ message: 'Review deleted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
