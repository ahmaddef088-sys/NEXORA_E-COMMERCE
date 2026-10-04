/**
 * POST /api/auth/login
 *
 * Authenticate a user with email and password.
 * Sets an HTTP-only session cookie on success.
 * Generic error messages prevent user enumeration.
 * Rate limited: 10 attempts per 15 minutes per IP.
 */

import { NextRequest } from 'next/server';
import { parseBody } from '@/lib/validation';
import { loginSchema } from '@/lib/validation/auth.schema';
import { login, buildSessionCookie } from '@/lib/services/auth.service';
import { successResponse, handleApiError } from '@/lib/api/response';
import { authRateLimiter, getClientIdentifier, enforceRateLimit } from '@/lib/security/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(authRateLimiter, getClientIdentifier(request));
    const input = await parseBody(request, loginSchema);
    const { user, token } = await login(input);

    const response = successResponse({ user });
    response.headers.set('Set-Cookie', buildSessionCookie(token));

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
