import { describe, it, expect, vi } from 'vitest';
import { getYearRange, isValidDate, relativeTime } from './date';

describe('date utilities', () => {
  describe('getYearRange', () => {
    it('returns start and end of year', () => {
      const range = getYearRange(2024);
      expect(range.start.getFullYear()).toBe(2024);
      expect(range.start.getMonth()).toBe(0);
      expect(range.start.getDate()).toBe(1);
      expect(range.end.getFullYear()).toBe(2024);
      expect(range.end.getMonth()).toBe(11);
      expect(range.end.getDate()).toBe(31);
    });
  });

  describe('isValidDate', () => {
    it('returns true for valid dates', () => {
      expect(isValidDate('2024-01-15')).toBe(true);
      expect(isValidDate('2024-12-31T23:59:59Z')).toBe(true);
    });

    it('returns false for invalid dates', () => {
      expect(isValidDate('not-a-date')).toBe(false);
      expect(isValidDate('')).toBe(false);
    });
  });

  describe('relativeTime', () => {
    it('shows "zojuist" for recent times', () => {
      const now = new Date();
      expect(relativeTime(now)).toBe('zojuist');
    });

    it('shows minutes for recent past', () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      expect(relativeTime(fiveMinAgo)).toBe('5 minuten geleden');
    });

    it('shows hours for same day', () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
      expect(relativeTime(threeHoursAgo)).toBe('3 uur geleden');
    });

    it('shows days for recent week', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      expect(relativeTime(twoDaysAgo)).toBe('2 dagen geleden');
    });

    it('shows 1 minuut for singular', () => {
      const oneMinAgo = new Date(Date.now() - 90 * 1000); // 1.5 min
      expect(relativeTime(oneMinAgo)).toBe('1 minuut geleden');
    });
  });
});
