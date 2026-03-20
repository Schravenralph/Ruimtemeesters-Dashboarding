import { describe, it, expect } from 'vitest';
import { validatePasswordStrength, isCommonPassword } from './password.service';

describe('password service - extended', () => {
  describe('edge cases', () => {
    it('handles empty password', () => {
      const result = validatePasswordStrength('');
      expect(result.score).toBe(0);
      expect(result.label).toBe('Zeer zwak');
    });

    it('handles very long password', () => {
      const result = validatePasswordStrength('A1!b' + 'x'.repeat(100));
      expect(result.score).toBeGreaterThanOrEqual(3);
    });

    it('handles unicode passwords', () => {
      const result = validatePasswordStrength('Wachtw00rd!€');
      expect(result.score).toBeGreaterThanOrEqual(3);
    });

    it('only lowercase scores low', () => {
      const result = validatePasswordStrength('abcdefghij');
      expect(result.score).toBeLessThan(3);
    });

    it('only numbers scores low', () => {
      const result = validatePasswordStrength('1234567890');
      expect(result.score).toBeLessThan(3);
    });
  });

  describe('common passwords extended', () => {
    it('detects qwerty variant', () => {
      expect(isCommonPassword('qwerty123')).toBe(true);
    });

    it('allows strong passwords', () => {
      expect(isCommonPassword('Tr0ub4dor&3')).toBe(false);
    });

    it('detects admin variant', () => {
      expect(isCommonPassword('admin123')).toBe(true);
    });
  });
});
