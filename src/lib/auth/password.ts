/**
 * Password hashing utilities using Node.js built-in crypto.
 *
 * Algorithm: PBKDF2 with SHA-512
 * Salt: 32 random bytes (hex-encoded)
 * Iterations: 100,000 (NIST recommendation)
 * Key length: 64 bytes
 *
 * Never stores or returns plaintext passwords.
 */

import { randomBytes, pbkdf2Sync } from 'crypto';

const ITERATIONS = 100_000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

/**
 * Generate a cryptographically random salt.
 * Returns a 64-character hex string.
 */
export function generateSalt(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Hash a password using PBKDF2-SHA512 with the provided salt.
 * Returns a 128-character hex string.
 */
export function hashPassword(password: string, salt: string): string {
  return pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
}

/**
 * Verify a plaintext password against a stored hash + salt.
 * Uses constant-time comparison to prevent timing attacks.
 */
export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  const candidateHash = hashPassword(password, salt);

  // Constant-time comparison (same length guaranteed by fixed KEY_LENGTH)
  if (candidateHash.length !== storedHash.length) return false;

  let diff = 0;
  for (let i = 0; i < candidateHash.length; i++) {
    diff |= candidateHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return diff === 0;
}
