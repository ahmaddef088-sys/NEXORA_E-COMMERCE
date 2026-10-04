/**
 * GET /api/products/[id]/reviews/summary — Product rating summary (public)
 */

import { type NextRequest } from 'next/server';
import { getProductRatingSummary } from '@/lib/services/review.service';
import { successResponse, handleApiError } from '@/lib/api/response';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const { id: productId } = await context.params;
    const summary = await getProductRatingSummary(productId);
    return successResponse(summary);
  } catch (error) {
    return handleApiError(error);
  }
}
