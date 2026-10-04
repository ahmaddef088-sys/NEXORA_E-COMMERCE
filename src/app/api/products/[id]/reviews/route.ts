/**
 * GET  /api/products/[id]/reviews         — List reviews for a product
 * POST /api/products/[id]/reviews         — Create a review (authenticated customers)
 */

import { type NextRequest } from 'next/server';
import { requireAuth, optionalAuth } from '@/lib/auth/middleware';
import { parseBody, parseQuery } from '@/lib/validation';
import { createReviewSchema, reviewQuerySchema } from '@/lib/validation/review.schema';
import {
  listProductReviews,
  createReview,
} from '@/lib/services/review.service';
import {
  paginatedResponse,
  createdResponse,
  handleApiError,
} from '@/lib/api/response';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const auth = await optionalAuth(request);
    const adminView = auth?.role === 'ADMIN';
    const { id: productId } = await context.params;
    const query = parseQuery(request.nextUrl.searchParams, reviewQuerySchema);
    const result = await listProductReviews(productId, query, adminView);
    return paginatedResponse(result.data, result.meta);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const auth = await requireAuth(request);
    const { id: productId } = await context.params;
    const input = await parseBody(request, createReviewSchema);
    const review = await createReview(auth.userId, productId, input);
    return createdResponse(review);
  } catch (error) {
    return handleApiError(error);
  }
}
