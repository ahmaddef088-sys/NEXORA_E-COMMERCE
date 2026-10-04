/**
 * POST /api/auth/register
 *
 * Register a new customer account.
 * Sets an HTTP-only session cookie on success.
 * Never returns the password, hash, salt, or JWT in the response body.
 * Rate limited: 10 attempts per 15 minutes per IP.
 */

import { NextRequest } from 'next/server';
import { parseBody } from '@/lib/validation';
import { registerSchema } from '@/lib/validation/auth.schema';
import { register, buildSessionCookie } from '@/lib/services/auth.service';
import { createdResponse, handleApiError } from '@/lib/api/response';
import { authRateLimiter, getClientIdentifier, enforceRateLimit } from '@/lib/security/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(authRateLimiter, getClientIdentifier(request));
    const input = await parseBody(request, registerSchema);
    const { user, token } = await register(input);

    const response = createdResponse({ user });
    response.headers.set('Set-Cookie', buildSessionCookie(token));

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
