/**
 * GET /api/products/slug/:slug — Get product by slug (public — active only, admin sees all)
 */

import { type NextRequest } from 'next/server';
import { optionalAuth } from '@/lib/auth/middleware';
import { getProductBySlug } from '@/lib/services/product.service';
import { successResponse, handleApiError } from '@/lib/api/response';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const auth = await optionalAuth(request);
    const adminView = auth?.role === 'ADMIN';
    const { slug } = await context.params;
    const product = await getProductBySlug(slug, adminView);
    return successResponse(product);
  } catch (error) {
    return handleApiError(error);
  }
}
