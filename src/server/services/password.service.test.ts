import { describe, it, expect } from 'vitest';
import { validatePasswordStrength, hashPassword, verifyPassword, isCommonPassword } from './password.service';

describe('password service', () => {
  describe('validatePasswordStrength', () => {
    it('scores weak password low', () => {
      const result = validatePasswordStrength('abc');
      expect(result.score).toBeLessThan(2);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('scores strong password high', () => {
      const result = validatePasswordStrength('MyStr0ng!Pass');
      expect(result.score).toBeGreaterThanOrEqual(3);
    });

    it('returns Dutch labels', () => {
      const result = validatePasswordStrength('weak');
      expect(['Zeer zwak', 'Zwak', 'Redelijk', 'Sterk', 'Zeer sterk']).toContain(result.label);
    });

    it('suggests improvements for short passwords', () => {
      const result = validatePasswordStrength('short');
      expect(result.suggestions).toContain('Minimaal 8 tekens');
    });

    it('caps score at 4', () => {
      const result = validatePasswordStrength('V3ryStr0ng!P@ssw0rd!');
      expect(result.score).toBeLessThanOrEqual(4);
    });
  });

  describe('hashPassword and verifyPassword', () => {
    it('hashes and verifies correctly', async () => {
      const hash = await hashPassword('testpassword');
      expect(hash).not.toBe('testpassword');
      expect(await verifyPassword('testpassword', hash)).toBe(true);
    });

    it('rejects wrong password', async () => {
      const hash = await hashPassword('correctpassword');
      expect(await verifyPassword('wrongpassword', hash)).toBe(false);
    });
  });

  describe('isCommonPassword', () => {
    it('detects common passwords', () => {
      expect(isCommonPassword('password')).toBe(true);
      expect(isCommonPassword('12345678')).toBe(true);
    });

    it('is case insensitive', () => {
      expect(isCommonPassword('Password')).toBe(true);
    });

    it('allows uncommon passwords', () => {
      expect(isCommonPassword('xK9!mNqR2z')).toBe(false);
    });
  });
});
