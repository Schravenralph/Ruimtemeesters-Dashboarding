import { describe, it, expect } from 'vitest';
import { equalIntervals, quantiles, classify, getClassColor, COLOR_SCHEMES } from './classification';

describe('classification', () => {
  const colors = ['#aaa', '#bbb', '#ccc', '#ddd', '#eee'];
  const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  describe('equalIntervals', () => {
    it('creates correct number of classes', () => {
      const breaks = equalIntervals(values, 5, colors);
      expect(breaks).toHaveLength(5);
    });

    it('covers full range', () => {
      const breaks = equalIntervals(values, 3, colors);
      expect(breaks[0].lowerBound).toBe(10);
      expect(breaks[breaks.length - 1].upperBound).toBe(100);
    });

    it('assigns all values to classes', () => {
      const breaks = equalIntervals(values, 5, colors);
      const totalCount = breaks.reduce((sum, b) => sum + b.count, 0);
      expect(totalCount).toBe(values.length);
    });

    it('handles empty values', () => {
      expect(equalIntervals([], 5, colors)).toEqual([]);
    });

    it('assigns colors from palette', () => {
      const breaks = equalIntervals(values, 3, colors);
      expect(breaks[0].color).toBe('#aaa');
      expect(breaks[1].color).toBe('#bbb');
      expect(breaks[2].color).toBe('#ccc');
    });
  });

  describe('quantiles', () => {
    it('creates approximately equal-count classes', () => {
      const breaks = quantiles(values, 5, colors);
      expect(breaks).toHaveLength(5);
      // Each class should have ~2 values
      for (const b of breaks) {
        expect(b.count).toBeGreaterThanOrEqual(1);
        expect(b.count).toBeLessThanOrEqual(3);
      }
    });

    it('handles empty values', () => {
      expect(quantiles([], 5, colors)).toEqual([]);
    });
  });

  describe('classify', () => {
    it('classifies values into correct class', () => {
      const breaks = equalIntervals([0, 100], 5, colors);
      expect(classify(5, breaks)).toBe(0);
      expect(classify(95, breaks)).toBe(4);
    });

    it('puts max value in last class', () => {
      const breaks = equalIntervals([0, 100], 5, colors);
      expect(classify(100, breaks)).toBe(4);
    });
  });

  describe('getClassColor', () => {
    it('returns color for value', () => {
      const breaks = equalIntervals([0, 100], 5, colors);
      expect(getClassColor(5, breaks)).toBe('#aaa');
      expect(getClassColor(95, breaks)).toBe('#eee');
    });
  });

  describe('COLOR_SCHEMES', () => {
    it('has all expected schemes', () => {
      expect(Object.keys(COLOR_SCHEMES)).toContain('greenBlue');
      expect(Object.keys(COLOR_SCHEMES)).toContain('blues');
      expect(Object.keys(COLOR_SCHEMES)).toContain('reds');
    });

    it('each scheme has 5 colors', () => {
      for (const scheme of Object.values(COLOR_SCHEMES)) {
        expect(scheme).toHaveLength(5);
      }
    });
  });
});
