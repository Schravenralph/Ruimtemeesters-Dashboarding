import { describe, it, expect } from 'vitest';
import { getChartColors, getSequentialColor, getDivergingColor, PALETTE } from './chartColors';

describe('chartColors', () => {
  describe('getChartColors', () => {
    it('returns requested number of colors', () => {
      expect(getChartColors(3)).toHaveLength(3);
      expect(getChartColors(5)).toHaveLength(5);
    });

    it('returns full palette when count equals palette size', () => {
      expect(getChartColors(10)).toHaveLength(10);
    });

    it('repeats colors when count exceeds palette size', () => {
      const colors = getChartColors(15);
      expect(colors).toHaveLength(15);
      expect(colors[10]).toBe(colors[0]);
    });

    it('uses accessible palette when specified', () => {
      const colors = getChartColors(3, 'accessible');
      expect(colors[0]).toBe(PALETTE.accessible[0]);
    });
  });

  describe('getSequentialColor', () => {
    it('returns lightest color for minimum value', () => {
      expect(getSequentialColor(0, 0, 100)).toBe(PALETTE.sequential[0]);
    });

    it('returns darkest color for maximum value', () => {
      expect(getSequentialColor(100, 0, 100)).toBe(PALETTE.sequential[PALETTE.sequential.length - 1]);
    });

    it('returns middle color for mid value', () => {
      const color = getSequentialColor(50, 0, 100);
      expect(PALETTE.sequential).toContain(color);
    });
  });

  describe('getDivergingColor', () => {
    it('returns center color for zero', () => {
      const center = PALETTE.diverging[Math.floor(PALETTE.diverging.length / 2)];
      expect(getDivergingColor(0)).toBe(center);
    });

    it('returns blue-ish color for positive values', () => {
      const color = getDivergingColor(5);
      expect(color).toBeTruthy();
    });

    it('returns red-ish color for negative values', () => {
      const color = getDivergingColor(-5);
      expect(color).toBeTruthy();
    });
  });

  describe('PALETTE', () => {
    it('has correct gender colors', () => {
      expect(PALETTE.gender.man).toBe('#3b82f6');
      expect(PALETTE.gender.vrouw).toBe('#ec4899');
    });

    it('has source colors for all data sources', () => {
      expect(PALETTE.sources.bevolking).toBeTruthy();
      expect(PALETTE.sources.huishoudens).toBeTruthy();
      expect(PALETTE.sources.woningen).toBeTruthy();
      expect(PALETTE.sources.woningtekort).toBeTruthy();
    });
  });
});
