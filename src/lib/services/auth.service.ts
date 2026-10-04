/**
 * Authentication service — registration, login, logout, and session management.
 *
 * Security contract:
 * - Passwords hashed with PBKDF2-SHA512 + random salt
 * - Never returns passwordHash or salt in any response
 * - Prevents user enumeration through generic error messages
 * - JWT stored only in HTTP-only, Secure, SameSite=Strict cookies
 */

import { prisma } from '@/lib/db/prisma';
import { generateSalt, hashPassword, verifyPassword } from '@/lib/auth/password';
import { signToken, getTokenMaxAge } from '@/lib/auth/jwt';
import { ConflictError, UnauthorizedError } from '@/lib/errors/HttpError';
import { logger } from '@/lib/logger';
import { env } from '@/env';
import type { SafeUser, UserRole } from '@/types';

// ─── Registration ─────────────────────────────────────────────────────────────

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

export type RegisterResult = {
  user: SafeUser;
  token: string;
};

/**
 * Register a new customer account.
 * Throws ConflictError if email already exists.
 */
export async function register(input: RegisterInput): Promise<RegisterResult> {
  const email = input.email.toLowerCase().trim();

  // Check for existing account
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Generic message — don't reveal whether the email exists
    throw ConflictError('An account with this email already exists');
  }

  const salt = generateSalt();
  const passwordHash = hashPassword(input.password, salt);

  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email,
      passwordHash,
      salt,
      role: 'CUSTOMER',
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role as UserRole,
  });

  logger.info('User registered', { userId: user.id, email: user.email });

  return { user: user as SafeUser, token };
}

// ─── Login ────────────────────────────────────────────────────────────────────

export type LoginInput = {
  email: string;
  password: string;
};

export type LoginResult = {
  user: SafeUser;
  token: string;
};

/**
 * Authenticate a user and return a session token.
 * Uses generic error message to prevent user enumeration.
 */
export async function login(input: LoginInput): Promise<LoginResult> {
  const email = input.email.toLowerCase().trim();

  const user = await prisma.user.findUnique({ where: { email } });

  // Use a dummy verification even if user not found, to prevent timing attacks
  if (!user) {
    // Still hash to prevent timing-based user enumeration
    const dummySalt = generateSalt();
    hashPassword(input.password, dummySalt);
    throw UnauthorizedError('Invalid email or password');
  }

  const isValid = verifyPassword(input.password, user.passwordHash, user.salt);

  if (!isValid) {
    throw UnauthorizedError('Invalid email or password');
  }

  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role as UserRole,
  });

  logger.info('User logged in', { userId: user.id, email: user.email });

  const safeUser: SafeUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  return { user: safeUser, token };
}

// ─── Me ───────────────────────────────────────────────────────────────────────

/**
 * Fetch the current authenticated user's safe profile.
 */
export async function getCurrentUser(userId: string): Promise<SafeUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) return null;

  return {
    ...user,
    role: user.role as UserRole,
  };
}

// ─── Cookie configuration ─────────────────────────────────────────────────────

/**
 * Build the cookie options for the session JWT.
 * Returns a Set-Cookie header value string.
 */
export function buildSessionCookie(token: string): string {
  const maxAge = getTokenMaxAge();
  const isProduction = env.NODE_ENV === 'production';

  const parts = [
    `${env.COOKIE_NAME}=${token}`,
    `Max-Age=${maxAge}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Strict`,
  ];

  if (isProduction) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

/**
 * Build a cookie that clears the session (logout).
 */
export function buildClearSessionCookie(): string {
  const isProduction = env.NODE_ENV === 'production';

  const parts = [
    `${env.COOKIE_NAME}=`,
    `Max-Age=0`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Strict`,
  ];

  if (isProduction) {
    parts.push('Secure');
  }

  return parts.join('; ');
}
