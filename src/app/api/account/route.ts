/**
 * GET   /api/account — Get the authenticated user's profile
 * PATCH /api/account — Update the authenticated user's profile
 */

import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { parseBody } from '@/lib/validation';
import { updateAccountSchema } from '@/lib/validation/account.schema';
import { getAccountProfile, updateAccountProfile } from '@/lib/services/account.service';
import { successResponse, handleApiError } from '@/lib/api/response';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const auth = await requireAuth(request);
    const profile = await getAccountProfile(auth.userId);
    return successResponse(profile);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest): Promise<Response> {
  try {
    const auth = await requireAuth(request);
    const input = await parseBody(request, updateAccountSchema);
    const profile = await updateAccountProfile(auth.userId, input);
    return successResponse(profile);
  } catch (error) {
    return handleApiError(error);
  }
}
