/**
 * GET   /api/products/:id — Get product by ID (public — active only, admin sees all)
 * PATCH /api/products/:id — Update a product (ADMIN only)
 */

import { type NextRequest } from 'next/server';
import { requireAdmin, optionalAuth } from '@/lib/auth/middleware';
import { parseBody } from '@/lib/validation';
import { updateProductSchema } from '@/lib/validation/product.schema';
import { getProductById, updateProduct } from '@/lib/services/product.service';
import { successResponse, handleApiError } from '@/lib/api/response';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const auth = await optionalAuth(request);
    const adminView = auth?.role === 'ADMIN';
    const { id } = await context.params;
    const product = await getProductById(id, adminView);
    return successResponse(product);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const input = await parseBody(request, updateProductSchema);
    const product = await updateProduct(id, input);
    return successResponse(product);
  } catch (error) {
    return handleApiError(error);
  }
}
