/**
 * GET /api/products/[id]/related — Get related products for discovery
 */

import { type NextRequest } from 'next/server';
import { getRelatedProducts } from '@/lib/services/product.service';
import { successResponse, handleApiError } from '@/lib/api/response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;
    const limit = Math.min(
      12,
      Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') ?? '4', 10) || 4)
    );

    const related = await getRelatedProducts(id, limit);
    return successResponse(related);
  } catch (error) {
    return handleApiError(error);
  }
}
