/**
 * Unit tests for password utilities (src/lib/auth/password.ts).
 *
 * Tests hashing, verification, timing-safe comparison.
 * No database required.
 */

import { generateSalt, hashPassword, verifyPassword } from '@/lib/auth/password';

describe('Password utilities', () => {
  describe('generateSalt', () => {
    it('generates a 64-character hex string', () => {
      const salt = generateSalt();
      expect(typeof salt).toBe('string');
      expect(salt).toHaveLength(64);
      expect(salt).toMatch(/^[0-9a-f]+$/);
    });

    it('generates unique salts each time', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      expect(salt1).not.toBe(salt2);
    });
  });

  describe('hashPassword', () => {
    it('returns a 128-character hex string', () => {
      const salt = generateSalt();
      const hash = hashPassword('mypassword', salt);
      expect(typeof hash).toBe('string');
      expect(hash).toHaveLength(128);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it('is deterministic — same input produces same hash', () => {
      const salt = generateSalt();
      const hash1 = hashPassword('mypassword', salt);
      const hash2 = hashPassword('mypassword', salt);
      expect(hash1).toBe(hash2);
    });

    it('produces different hashes for different passwords', () => {
      const salt = generateSalt();
      const hash1 = hashPassword('password1', salt);
      const hash2 = hashPassword('password2', salt);
      expect(hash1).not.toBe(hash2);
    });

    it('produces different hashes for different salts', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      const hash1 = hashPassword('samepassword', salt1);
      const hash2 = hashPassword('samepassword', salt2);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('returns true for correct password', () => {
      const password = 'my-secure-password-123';
      const salt = generateSalt();
      const hash = hashPassword(password, salt);
      expect(verifyPassword(password, hash, salt)).toBe(true);
    });

    it('returns false for incorrect password', () => {
      const salt = generateSalt();
      const hash = hashPassword('correct-password', salt);
      expect(verifyPassword('wrong-password', hash, salt)).toBe(false);
    });

    it('returns false for empty string password', () => {
      const salt = generateSalt();
      const hash = hashPassword('real-password', salt);
      expect(verifyPassword('', hash, salt)).toBe(false);
    });

    it('returns false for wrong salt', () => {
      const salt = generateSalt();
      const wrongSalt = generateSalt();
      const hash = hashPassword('password', salt);
      expect(verifyPassword('password', hash, wrongSalt)).toBe(false);
    });

    it('returns false for tampered hash', () => {
      const salt = generateSalt();
      const hash = hashPassword('password', salt);
      // Flip a character in the hash
      const tamperedHash = hash.slice(0, -1) + (hash.endsWith('a') ? 'b' : 'a');
      expect(verifyPassword('password', tamperedHash, salt)).toBe(false);
    });

    it('handles special characters in passwords', () => {
      const password = 'p@$$w0rd!#%^&*()\n\t';
      const salt = generateSalt();
      const hash = hashPassword(password, salt);
      expect(verifyPassword(password, hash, salt)).toBe(true);
      expect(verifyPassword('differentpassword', hash, salt)).toBe(false);
    });

    it('handles unicode passwords', () => {
      const password = 'пароль123!αβγ';
      const salt = generateSalt();
      const hash = hashPassword(password, salt);
      expect(verifyPassword(password, hash, salt)).toBe(true);
    });
  });
});
