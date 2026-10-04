/**
 * Unit tests for rate-limiter.ts — Phase 17 Security Hardening
 */

import { RateLimiter, enforceRateLimit } from '@/lib/security/rate-limiter';
import { HttpError } from '@/lib/errors/HttpError';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({ windowMs: 60_000, max: 3 });
  });

  it('allows requests within the limit', () => {
    expect(limiter.check('ip-1')).toBe(true);
    expect(limiter.check('ip-1')).toBe(true);
    expect(limiter.check('ip-1')).toBe(true);
  });

  it('blocks requests exceeding the limit', () => {
    limiter.check('ip-1');
    limiter.check('ip-1');
    limiter.check('ip-1');
    expect(limiter.check('ip-1')).toBe(false);
  });

  it('tracks different identifiers independently', () => {
    limiter.check('ip-1');
    limiter.check('ip-1');
    limiter.check('ip-1');
    // ip-2 should still be allowed
    expect(limiter.check('ip-2')).toBe(true);
  });

  it('resets after window expires', () => {
    const shortLimiter = new RateLimiter({ windowMs: 1, max: 1 });
    shortLimiter.check('ip-1');

    // Wait for window to expire
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(shortLimiter.check('ip-1')).toBe(true);
        resolve();
      }, 10);
    });
  });

  it('reset() clears count for identifier', () => {
    limiter.check('ip-1');
    limiter.check('ip-1');
    limiter.check('ip-1');
    expect(limiter.check('ip-1')).toBe(false);

    limiter.reset('ip-1');
    expect(limiter.check('ip-1')).toBe(true);
  });
});

describe('enforceRateLimit', () => {
  it('does not throw when within limit', () => {
    const limiter = new RateLimiter({ windowMs: 60_000, max: 5 });
    expect(() => enforceRateLimit(limiter, 'ip-1')).not.toThrow();
  });

  it('throws TooManyRequestsError (429) when limit exceeded', () => {
    const limiter = new RateLimiter({ windowMs: 60_000, max: 1 });
    limiter.check('ip-1'); // exhaust limit

    expect(() => enforceRateLimit(limiter, 'ip-1')).toThrow(HttpError);
    try {
      enforceRateLimit(limiter, 'ip-1');
    } catch (e) {
      expect(e).toBeInstanceOf(HttpError);
      expect((e as HttpError).statusCode).toBe(429);
    }
  });
});
