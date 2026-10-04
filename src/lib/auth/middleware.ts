/**
 * Authentication middleware for Next.js API route handlers.
 *
 * Extracts and verifies the JWT from the HTTP-only session cookie.
 * Returns the authenticated user context or throws HttpError.
 *
 * Usage in route handlers:
 *   const auth = await requireAuth(request);
 *   const adminAuth = await requireAdmin(request);
 */

import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors/HttpError';
import { env } from '@/env';
import type { AuthContext } from '@/types';

/**
 * Extract and verify the session JWT from the request cookies.
 * Returns AuthContext if valid, throws UnauthorizedError if not.
 */
export async function requireAuth(request: Request): Promise<AuthContext> {
  const token = extractTokenFromRequest(request);

  if (!token) {
    throw UnauthorizedError('Authentication required');
  }

  const payload = verifyToken(token);

  if (!payload) {
    throw UnauthorizedError('Invalid or expired session');
  }

  return {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  };
}

/**
 * Require authentication AND ADMIN role.
 * Throws ForbiddenError for non-admin authenticated users.
 */
export async function requireAdmin(request: Request): Promise<AuthContext> {
  const auth = await requireAuth(request);

  if (auth.role !== 'ADMIN') {
    throw ForbiddenError('Admin access required');
  }

  return auth;
}

/**
 * Optionally extract auth context without throwing.
 * Returns null if unauthenticated.
 */
export async function optionalAuth(request: Request): Promise<AuthContext | null> {
  try {
    const token = extractTokenFromRequest(request);
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload) return null;

    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

/**
 * Extract JWT from the session cookie.
 * Supports both the Authorization header (for API testing) and cookie.
 */
function extractTokenFromRequest(request: Request): string | null {
  // Primary: HTTP-only cookie (production usage)
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookieName = env.COOKIE_NAME;
    const match = cookieHeader.match(
      new RegExp(`(?:^|;\\s*)${escapeRegExp(cookieName)}=([^;]+)`)
    );
    if (match?.[1]) return match[1];
  }

  return null;
}

/**
 * Get the session token from Next.js cookies store (for Server Components).
 */
export async function getSessionFromCookies(): Promise<AuthContext | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(env.COOKIE_NAME)?.value;

  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  return {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  };
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
