/**
 * Unit tests for auth service (src/lib/services/auth.service.ts).
 *
 * Tests registration, login, cookie building.
 * Mocks the Prisma client to avoid requiring a database connection.
 */

// Setup env before imports
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-secret-key-at-least-32-characters-long';
process.env.JWT_EXPIRES_IN_SECONDS = '3600';
Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true, configurable: true });
process.env.APP_URL = 'http://localhost:3000';
process.env.COOKIE_NAME = 'nexora_session';
process.env.LOW_STOCK_THRESHOLD = '5';

// Mock the Prisma client before importing service
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/db/prisma';
import {
  register,
  login,
  getCurrentUser,
  buildSessionCookie,
  buildClearSessionCookie,
} from '@/lib/services/auth.service';
import { verifyToken } from '@/lib/auth/jwt';

// Type assertion for mocked prisma
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Auth service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Register ──────────────────────────────────────────────────────────────

  describe('register', () => {
    const validInput = {
      name: 'Alice',
      email: 'alice@example.com',
      password: 'secure-password-123',
    };

    const mockCreatedUser = {
      id: 'user-123',
      email: 'alice@example.com',
      name: 'Alice',
      role: 'CUSTOMER' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('creates a user and returns a safe user + token', async () => {
      // @ts-expect-error — mock
      mockPrisma.user.findUnique.mockResolvedValue(null);
      // @ts-expect-error — mock
      mockPrisma.user.create.mockResolvedValue(mockCreatedUser);

      const result = await register(validInput);

      expect(result.user).toEqual(mockCreatedUser);
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
    });

    it('does not return passwordHash or salt in the response', async () => {
      // @ts-expect-error — mock
      mockPrisma.user.findUnique.mockResolvedValue(null);
      // @ts-expect-error — mock
      mockPrisma.user.create.mockResolvedValue(mockCreatedUser);

      const result = await register(validInput);

      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user).not.toHaveProperty('salt');
    });

    it('issues a valid JWT in the token', async () => {
      // @ts-expect-error — mock
      mockPrisma.user.findUnique.mockResolvedValue(null);
      // @ts-expect-error — mock
      mockPrisma.user.create.mockResolvedValue(mockCreatedUser);

      const result = await register(validInput);

      const payload = verifyToken(result.token);
      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe('user-123');
      expect(payload?.email).toBe('alice@example.com');
      expect(payload?.role).toBe('CUSTOMER');
    });

    it('throws ConflictError if email already exists', async () => {
      // @ts-expect-error — mock
      mockPrisma.user.findUnique.mockResolvedValue(mockCreatedUser);

      await expect(register(validInput)).rejects.toMatchObject({
        code: 'CONFLICT',
        statusCode: 409,
      });
    });

    it('hashes the password (never stores plaintext)', async () => {
      // @ts-expect-error — mock
      mockPrisma.user.findUnique.mockResolvedValue(null);
      // @ts-expect-error — mock
      mockPrisma.user.create.mockResolvedValue(mockCreatedUser);

      await register(validInput);

      const createCall = (mockPrisma.user.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.passwordHash).toBeDefined();
      expect(createCall.data.passwordHash).not.toBe(validInput.password);
      expect(createCall.data.salt).toBeDefined();
      // Ensure password is not in data at all
      expect(JSON.stringify(createCall.data)).not.toContain(validInput.password);
    });
  });

  // ─── Login ─────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns a token for valid credentials', async () => {
      const { generateSalt, hashPassword } = require('@/lib/auth/password');
      const salt = generateSalt();
      const passwordHash = hashPassword('correct-password', salt);

      // @ts-expect-error — mock
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-456',
        email: 'bob@example.com',
        name: 'Bob',
        role: 'CUSTOMER',
        passwordHash,
        salt,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await login({ email: 'bob@example.com', password: 'correct-password' });

      expect(result.user).toBeDefined();
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user).not.toHaveProperty('salt');
      expect(result.token).toBeDefined();
    });

    it('throws UnauthorizedError for wrong password', async () => {
      const { generateSalt, hashPassword } = require('@/lib/auth/password');
      const salt = generateSalt();
      const passwordHash = hashPassword('correct-password', salt);

      // @ts-expect-error — mock
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-456',
        email: 'bob@example.com',
        name: 'Bob',
        role: 'CUSTOMER',
        passwordHash,
        salt,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        login({ email: 'bob@example.com', password: 'wrong-password' })
      ).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
        statusCode: 401,
      });
    });

    it('throws UnauthorizedError for non-existent email (prevents user enumeration)', async () => {
      // @ts-expect-error — mock
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        login({ email: 'nobody@example.com', password: 'any-password' })
      ).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
        statusCode: 401,
        message: 'Invalid email or password',
      });
    });
  });

  // ─── Get Current User ──────────────────────────────────────────────────────

  describe('getCurrentUser', () => {
    it('returns a safe user without passwordHash', async () => {
      // @ts-expect-error — mock
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-789',
        email: 'carol@example.com',
        name: 'Carol',
        role: 'ADMIN',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const user = await getCurrentUser('user-789');

      expect(user).not.toBeNull();
      expect(user?.id).toBe('user-789');
      expect(user?.role).toBe('ADMIN');
    });

    it('returns null for non-existent user', async () => {
      // @ts-expect-error — mock
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const user = await getCurrentUser('non-existent');
      expect(user).toBeNull();
    });
  });

  // ─── Cookie building ───────────────────────────────────────────────────────

  describe('buildSessionCookie', () => {
    it('includes HttpOnly flag', () => {
      const cookie = buildSessionCookie('some-token');
      expect(cookie).toContain('HttpOnly');
    });

    it('includes SameSite=Strict', () => {
      const cookie = buildSessionCookie('some-token');
      expect(cookie).toContain('SameSite=Strict');
    });

    it('includes the cookie name and token', () => {
      const cookie = buildSessionCookie('my-token');
      expect(cookie).toContain('nexora_session=my-token');
    });

    it('includes Max-Age', () => {
      const cookie = buildSessionCookie('tok');
      expect(cookie).toContain('Max-Age=');
    });

    it('does not include Secure flag in test environment', () => {
      // NODE_ENV is 'test' here
      const cookie = buildSessionCookie('tok');
      expect(cookie).not.toContain('Secure');
    });
  });

  describe('buildClearSessionCookie', () => {
    it('sets Max-Age=0 to clear the cookie', () => {
      const cookie = buildClearSessionCookie();
      expect(cookie).toContain('Max-Age=0');
    });

    it('sets cookie value to empty string', () => {
      const cookie = buildClearSessionCookie();
      expect(cookie).toContain('nexora_session=;');
    });
  });
});
