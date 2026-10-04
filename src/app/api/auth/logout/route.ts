/**
 * POST /api/auth/logout
 *
 * Invalidate the session by clearing the session cookie.
 * Always returns success (idempotent — can't revoke the JWT itself without a blocklist).
 */

import { buildClearSessionCookie } from '@/lib/services/auth.service';
import { successResponse } from '@/lib/api/response';

export async function POST() {
  const response = successResponse({ message: 'Logged out successfully' });
  response.headers.set('Set-Cookie', buildClearSessionCookie());
  return response;
}
