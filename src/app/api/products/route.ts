/**
 * GET  /api/products — List products (public, paginated, filterable)
 * POST /api/products — Create a product (ADMIN only)
 */

import { type NextRequest } from 'next/server';
import { requireAdmin, optionalAuth } from '@/lib/auth/middleware';
import { parseBody, parseQuery } from '@/lib/validation';
import { productQuerySchema, createProductSchema } from '@/lib/validation/product.schema';
import { listProducts, createProduct } from '@/lib/services/product.service';
import {
  paginatedResponse,
  createdResponse,
  handleApiError,
} from '@/lib/api/response';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const auth = await optionalAuth(request);
    const adminView = auth?.role === 'ADMIN';
    const query = parseQuery(request.nextUrl.searchParams, productQuerySchema);
    const result = await listProducts(query, adminView);
    return paginatedResponse(result.data, result.meta);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    await requireAdmin(request);
    const input = await parseBody(request, createProductSchema);
    const product = await createProduct(input);
    return createdResponse(product);
  } catch (error) {
    return handleApiError(error);
  }
}
