/**
 * GET    /api/account/addresses/:id — Get a specific address (ownership enforced)
 * PATCH  /api/account/addresses/:id — Update an address (ownership enforced)
 * DELETE /api/account/addresses/:id — Delete an address (ownership enforced)
 */

import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { parseBody } from '@/lib/validation';
import { updateAddressSchema } from '@/lib/validation/account.schema';
import {
  getAddressById,
  updateAddress,
  deleteAddress,
} from '@/lib/services/account.service';
import { successResponse, noContentResponse, handleApiError } from '@/lib/api/response';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const auth = await requireAuth(request);
    const { id } = await context.params;
    const address = await getAddressById(id, auth.userId);
    return successResponse(address);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const auth = await requireAuth(request);
    const { id } = await context.params;
    const input = await parseBody(request, updateAddressSchema);
    const address = await updateAddress(id, auth.userId, input);
    return successResponse(address);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const auth = await requireAuth(request);
    const { id } = await context.params;
    await deleteAddress(id, auth.userId);
    return noContentResponse();
  } catch (error) {
    return handleApiError(error);
  }
}
