/**
 * GET /api/auth/me
 *
 * Return the currently authenticated user's profile.
 * Requires a valid session cookie.
 * Never returns passwordHash, salt, or JWT.
 */

import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getCurrentUser } from '@/lib/services/auth.service';
import { successResponse, handleApiError } from '@/lib/api/response';
import { NotFoundError } from '@/lib/errors/HttpError';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const user = await getCurrentUser(auth.userId);

    if (!user) {
      throw NotFoundError('User');
    }

    return successResponse({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
