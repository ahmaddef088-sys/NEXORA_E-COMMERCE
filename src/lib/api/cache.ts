/**
 * Response caching utilities — Phase 18 Performance Optimization.
 *
 * Provides Cache-Control header helpers for Next.js API responses.
 * Use these to add HTTP caching to public, read-heavy endpoints
 * without adding external cache infrastructure.
 *
 * Security note: NEVER apply caching to authenticated or user-specific routes.
 */

import { NextResponse } from 'next/server';

// ─── Cache-Control header builders ────────────────────────────────────────────

/**
 * Add public caching headers to a response.
 * Suitable for public catalog data that changes infrequently.
 *
 * @param response  The NextResponse to add headers to
 * @param maxAge    Browser cache TTL in seconds (default: 60s)
 * @param sMaxAge   CDN/proxy cache TTL in seconds (default: 300s)
 * @param staleWhileRevalidate  SWR window in seconds (default: 600s)
 */
export function withPublicCache<T>(
  response: NextResponse<T>,
  maxAge = 60,
  sMaxAge = 300,
  staleWhileRevalidate = 600
): NextResponse<T> {
  response.headers.set(
    'Cache-Control',
    `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`
  );
  return response;
}

/**
 * Add no-cache headers (for authenticated or private responses).
 * Ensures browsers/CDNs never cache sensitive content.
 */
export function withNoCache<T>(response: NextResponse<T>): NextResponse<T> {
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  return response;
}

/**
 * Add short-lived caching headers for semi-dynamic content.
 * E.g., product listings, category trees.
 */
export function withShortCache<T>(response: NextResponse<T>, maxAge = 30): NextResponse<T> {
  return withPublicCache(response, maxAge, maxAge * 5, maxAge * 10);
}

// ─── Vary header helper ───────────────────────────────────────────────────────

/**
 * Add a Vary header to allow correct caching when auth state differs.
 * Used when the same URL may return different data depending on auth.
 */
export function withVary<T>(response: NextResponse<T>, ...headers: string[]): NextResponse<T> {
  response.headers.set('Vary', headers.join(', '));
  return response;
}
