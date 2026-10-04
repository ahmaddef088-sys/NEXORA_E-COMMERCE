/**
 * JWT utilities for Nexora Commerce.
 *
 * Uses Node.js built-in `crypto` module (HMAC-SHA256) — no external JWT library needed.
 * Tokens are issued as HTTP-only cookies, never exposed in JSON responses.
 *
 * Payload structure: { userId, email, role, iat, exp }
 */

import { createHmac, randomBytes } from 'crypto';
import { env } from '@/env';
import type { SessionPayload, UserRole } from '@/types';

// ─── Base64URL helpers ────────────────────────────────────────────────────────

function base64urlEncode(value: string): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64urlDecode(value: string): string {
  // Re-pad and convert from base64url to base64
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4;
  const withPad = pad ? padded + '='.repeat(4 - pad) : padded;
  return Buffer.from(withPad, 'base64').toString('utf8');
}

// ─── Token signing ────────────────────────────────────────────────────────────

function sign(header: object, payload: object): string {
  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signature = createHmac('sha256', env.JWT_SECRET)
    .update(signingInput)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${signingInput}.${signature}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type JwtPayload = {
  userId: string;
  email: string;
  role: UserRole;
};

/**
 * Create a signed JWT for the given user payload.
 * Token expiry is derived from JWT_EXPIRES_IN_SECONDS env variable.
 */
export function signToken(payload: JwtPayload): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const fullPayload: SessionPayload = {
    ...payload,
    iat: now,
    exp: now + env.JWT_EXPIRES_IN_SECONDS,
  };
  return sign(header, fullPayload);
}

/**
 * Verify and decode a JWT token.
 * Returns the decoded payload or null if invalid/expired.
 * Never throws — callers should treat null as unauthenticated.
 */
export function verifyToken(token: string): SessionPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    // Constant-time comparison to prevent timing attacks
    const expectedSig = createHmac('sha256', env.JWT_SECRET)
      .update(signingInput)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Timing-safe comparison
    if (!timingSafeEqual(signature, expectedSig)) return null;

    const payload = JSON.parse(base64urlDecode(encodedPayload)) as SessionPayload;

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;

    // Validate required fields
    if (!payload.userId || !payload.email || !payload.role) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a comparison to avoid timing leaks based on length
    // Using randomBytes as a dummy to waste time
    randomBytes(32);
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Get the cookie max-age in seconds.
 */
export function getTokenMaxAge(): number {
  return env.JWT_EXPIRES_IN_SECONDS;
}
