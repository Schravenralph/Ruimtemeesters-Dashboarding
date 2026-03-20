import { describe, it, expect } from 'vitest';
import { equalIntervals, quantiles, classify, getClassColor, COLOR_SCHEMES } from './classification';

describe('classification — extended', () => {
  const colors5 = ['#a', '#b', '#c', '#d', '#e'];

  it('2 classes splits at midpoint', () => {
    const breaks = equalIntervals([0, 100], 2, ['#lo', '#hi']);
    expect(breaks).toHaveLength(2);
    expect(breaks[0].upperBound).toBe(50);
  });

  it('handles single value', () => {
    const breaks = equalIntervals([42], 3, colors5);
    expect(breaks).toHaveLength(3);
  });

  it('handles negative values', () => {
    const breaks = equalIntervals([-50, -10, 0, 20, 50], 5, colors5);
    expect(breaks[0].lowerBound).toBe(-50);
    expect(breaks[breaks.length - 1].upperBound).toBe(50);
  });

  it('quantiles with few values', () => {
    const breaks = quantiles([10, 20, 30, 40, 50], 3, colors5);
    expect(breaks).toHaveLength(3);
  });

  it('classify returns 0 for minimum value', () => {
    const breaks = equalIntervals([0, 100], 5, colors5);
    expect(classify(0, breaks)).toBe(0);
  });

  it('classify returns last for maximum value', () => {
    const breaks = equalIntervals([0, 100], 5, colors5);
    expect(classify(100, breaks)).toBe(4);
  });

  it('getClassColor returns fallback for empty breaks', () => {
    expect(getClassColor(50, [])).toBe('#cccccc');
  });

  it('all color schemes have valid hex colors', () => {
    for (const [name, scheme] of Object.entries(COLOR_SCHEMES)) {
      for (const color of scheme) {
        expect(color).toMatch(/^#[0-9a-fA-F]{3,8}$/);
      }
    }
  });
});
