/**
 * Rate limiting utility — Phase 17 Security Hardening.
 *
 * In-memory rate limiter using a sliding window algorithm.
 * For production with multiple instances, replace with Redis-backed implementation.
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 60_000, max: 10 });
 *   const identifier = getClientIdentifier(request);
 *   if (!limiter.check(identifier)) throw TooManyRequestsError();
 */

import { TooManyRequestsError } from '@/lib/errors/HttpError';
import type { NextRequest } from 'next/server';

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

interface RateLimiterOptions {
  /** Window size in milliseconds */
  windowMs: number;
  /** Maximum number of requests per window */
  max: number;
}

export class RateLimiter {
  private readonly store = new Map<string, RateLimitEntry>();
  private readonly windowMs: number;
  private readonly max: number;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs;
    this.max = options.max;
  }

  /**
   * Check if the identifier is within the rate limit.
   * Returns true if allowed, false if rate limited.
   */
  check(identifier: string): boolean {
    const now = Date.now();
    const entry = this.store.get(identifier);

    if (!entry || now - entry.windowStart >= this.windowMs) {
      // New window
      this.store.set(identifier, { count: 1, windowStart: now });
      return true;
    }

    if (entry.count >= this.max) {
      return false;
    }

    entry.count += 1;
    return true;
  }

  /**
   * Reset the count for an identifier (e.g., on successful auth).
   */
  reset(identifier: string): void {
    this.store.delete(identifier);
  }

  /**
   * Start automatic cleanup of stale entries.
   * Call stopCleanup() when the limiter is no longer needed.
   */
  startCleanup(): this {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (now - entry.windowStart >= this.windowMs * 2) {
          this.store.delete(key);
        }
      }
    }, this.windowMs);
    return this;
  }

  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// ─── Shared rate limiters ─────────────────────────────────────────────────────

/** Auth endpoints: 10 attempts per 15 minutes per IP */
export const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
}).startCleanup();

/** General API endpoints: 200 requests per minute per IP */
export const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  max: 200,
}).startCleanup();

/** Sensitive write endpoints: 30 per minute per user */
export const writeRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  max: 30,
}).startCleanup();

// ─── Client identifier helpers ────────────────────────────────────────────────

/**
 * Extract a client identifier from a request for rate limiting.
 * Uses X-Forwarded-For > X-Real-IP > remote address.
 */
export function getClientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // Take the first IP in the chain (client IP)
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  // Fallback — in Next.js we don't have access to the raw socket
  return 'unknown';
}

// ─── Rate limit enforcement helper ───────────────────────────────────────────

/**
 * Enforce rate limiting for a request.
 * Throws TooManyRequestsError if the rate limit is exceeded.
 */
export function enforceRateLimit(limiter: RateLimiter, identifier: string): void {
  if (!limiter.check(identifier)) {
    throw TooManyRequestsError('Too many requests — please try again later');
  }
}
