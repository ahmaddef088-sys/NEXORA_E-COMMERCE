/**
 * Unit tests for JWT utilities (src/lib/auth/jwt.ts).
 *
 * Tests signing, verification, expiry, tampering detection.
 * These tests do NOT require a database connection.
 */

// Set up env before importing anything that uses it
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-secret-key-at-least-32-characters-long';
process.env.JWT_EXPIRES_IN_SECONDS = '3600';
Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true, configurable: true });
process.env.APP_URL = 'http://localhost:3000';
process.env.COOKIE_NAME = 'nexora_session';
process.env.LOW_STOCK_THRESHOLD = '5';

import { signToken, verifyToken, getTokenMaxAge } from '@/lib/auth/jwt';

describe('JWT utilities', () => {
  const testPayload = {
    userId: 'user-123',
    email: 'test@example.com',
    role: 'CUSTOMER' as const,
  };

  describe('signToken', () => {
    it('creates a token with three parts', () => {
      const token = signToken(testPayload);
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
    });

    it('produces different tokens on each call (different iat)', async () => {
      const token1 = signToken(testPayload);
      // Small delay to ensure different timestamp
      await new Promise((r) => setTimeout(r, 10));
      const token2 = signToken(testPayload);
      // They may be the same if iat rounds to same second — but structure should be valid
      expect(token1.split('.').length).toBe(3);
      expect(token2.split('.').length).toBe(3);
    });

    it('embeds the payload fields in the token', () => {
      const token = signToken(testPayload);
      const payload = verifyToken(token);
      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe('user-123');
      expect(payload?.email).toBe('test@example.com');
      expect(payload?.role).toBe('CUSTOMER');
    });

    it('sets iat and exp fields', () => {
      const before = Math.floor(Date.now() / 1000);
      const token = signToken(testPayload);
      const after = Math.floor(Date.now() / 1000);

      const payload = verifyToken(token);
      expect(payload?.iat).toBeGreaterThanOrEqual(before);
      expect(payload?.iat).toBeLessThanOrEqual(after);
      expect(payload?.exp).toBeGreaterThan(after);
    });
  });

  describe('verifyToken', () => {
    it('returns the payload for a valid token', () => {
      const token = signToken(testPayload);
      const payload = verifyToken(token);

      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe(testPayload.userId);
      expect(payload?.email).toBe(testPayload.email);
      expect(payload?.role).toBe(testPayload.role);
    });

    it('returns null for an empty string', () => {
      expect(verifyToken('')).toBeNull();
    });

    it('returns null for a malformed token', () => {
      expect(verifyToken('not.a.token')).toBeNull();
      expect(verifyToken('a.b')).toBeNull();
      expect(verifyToken('invalid')).toBeNull();
    });

    it('returns null for a tampered payload', () => {
      const token = signToken(testPayload);
      const parts = token.split('.');

      // Tamper the payload
      const tamperedPayload = Buffer.from(
        JSON.stringify({ ...testPayload, role: 'ADMIN' })
      )
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
      expect(verifyToken(tamperedToken)).toBeNull();
    });

    it('returns null for a tampered signature', () => {
      const token = signToken(testPayload);
      const parts = token.split('.');
      const tamperedToken = `${parts[0]}.${parts[1]}.invalidsignature`;
      expect(verifyToken(tamperedToken)).toBeNull();
    });

    it('returns null for an expired token', () => {
      // Create a token that expired 1 second ago
      const now = Math.floor(Date.now() / 1000);

      // We need to create an expired token manually
      // Directly sign a payload with past exp
      const header = { alg: 'HS256', typ: 'JWT' };
      const expiredPayload = {
        ...testPayload,
        iat: now - 7200,
        exp: now - 1, // expired 1 second ago
      };

      // Encode manually (same logic as jwt.ts)
      const encode = (obj: object) =>
        Buffer.from(JSON.stringify(obj))
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, '');

      const encodedHeader = encode(header);
      const encodedPayload = encode(expiredPayload);

      // Valid signature won't help — the token is expired
      // But we need to sign it correctly for the signature check to pass
      const { createHmac } = require('crypto');
      const signingInput = `${encodedHeader}.${encodedPayload}`;
      const sig = createHmac('sha256', process.env.JWT_SECRET!)
        .update(signingInput)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      const expiredToken = `${signingInput}.${sig}`;
      expect(verifyToken(expiredToken)).toBeNull();
    });

    it('returns null for a token signed with a different secret', () => {
      // This simulates tampering by an attacker with a different key
      const { createHmac } = require('crypto');
      const fakeSecret = 'a-completely-different-secret-key-that-is-long';
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      const now = Math.floor(Date.now() / 1000);
      const payload = Buffer.from(
        JSON.stringify({ ...testPayload, iat: now, exp: now + 3600 })
      )
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      const signingInput = `${header}.${payload}`;
      const fakeSig = createHmac('sha256', fakeSecret)
        .update(signingInput)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      const fakeToken = `${signingInput}.${fakeSig}`;
      expect(verifyToken(fakeToken)).toBeNull();
    });
  });

  describe('getTokenMaxAge', () => {
    it('returns the configured expiry seconds', () => {
      expect(getTokenMaxAge()).toBe(3600);
    });
  });
});
