/**
 * GET   /api/categories/:id — Get category by ID (public)
 * PATCH /api/categories/:id — Update a category (ADMIN only)
 */

import { type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { parseBody } from '@/lib/validation';
import { updateCategorySchema } from '@/lib/validation/category.schema';
import { getCategoryById, updateCategory } from '@/lib/services/category.service';
import { successResponse, handleApiError } from '@/lib/api/response';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const { id } = await context.params;
    const category = await getCategoryById(id);
    return successResponse(category);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const input = await parseBody(request, updateCategorySchema);
    const category = await updateCategory(id, input);
    return successResponse(category);
  } catch (error) {
    return handleApiError(error);
  }
}
