/**
 * GET  /api/categories — List categories (public, paginated, cached 5min)
 * POST /api/categories — Create a category (ADMIN only)
 */

import { type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { parseBody, parseQuery } from '@/lib/validation';
import { categoryQuerySchema, createCategorySchema } from '@/lib/validation/category.schema';
import { listCategories, createCategory } from '@/lib/services/category.service';
import {
  paginatedResponse,
  createdResponse,
  handleApiError,
} from '@/lib/api/response';
import { withPublicCache } from '@/lib/api/cache';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const query = parseQuery(request.nextUrl.searchParams, categoryQuerySchema);
    const result = await listCategories(query);
    // Categories change infrequently — cache for 5 minutes, SWR 10 minutes
    return withPublicCache(paginatedResponse(result.data, result.meta), 300, 600, 600);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    await requireAdmin(request);
    const input = await parseBody(request, createCategorySchema);
    const category = await createCategory(input);
    return createdResponse(category);
  } catch (error) {
    return handleApiError(error);
  }
}

