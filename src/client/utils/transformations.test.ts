import { describe, it, expect } from 'vitest';
import { percenteren, groeicijfers, zScores, applyTransformation } from './transformations';
import type { DataPoint } from '@shared/api/contracts';

const makePoint = (geoCode: string, year: number, value: number, dimVal?: string): DataPoint => ({
  geoCode,
  geoName: geoCode,
  year,
  value,
  dimensionValue: dimVal,
});

describe('data transformations', () => {
  describe('percenteren', () => {
    it('converts values to percentages', () => {
      const data = [
        makePoint('GM1', 2024, 600, 'a'),
        makePoint('GM1', 2024, 400, 'b'),
      ];
      const result = percenteren(data);
      expect(result[0].value).toBe(60);
      expect(result[1].value).toBe(40);
    });

    it('handles single value (100%)', () => {
      const data = [makePoint('GM1', 2024, 500)];
      const result = percenteren(data);
      expect(result[0].value).toBe(100);
    });

    it('handles zero total gracefully', () => {
      const data = [makePoint('GM1', 2024, 0)];
      const result = percenteren(data);
      expect(result[0].value).toBe(0);
    });
  });

  describe('groeicijfers', () => {
    it('calculates relative growth', () => {
      const data = [
        makePoint('GM1', 2020, 100),
        makePoint('GM1', 2021, 110),
        makePoint('GM1', 2022, 121),
      ];
      const result = groeicijfers(data, 'relatief');
      expect(result[0].value).toBe(0); // first period
      expect(result[1].value).toBe(10); // +10%
      expect(result[2].value).toBe(10); // +10%
    });

    it('calculates absolute growth', () => {
      const data = [
        makePoint('GM1', 2020, 100),
        makePoint('GM1', 2021, 150),
      ];
      const result = groeicijfers(data, 'absoluut');
      expect(result[1].value).toBe(50);
    });

    it('calculates index numbers', () => {
      const data = [
        makePoint('GM1', 2020, 200),
        makePoint('GM1', 2021, 220),
        makePoint('GM1', 2022, 240),
      ];
      const result = groeicijfers(data, 'index', 2020);
      expect(result[0].value).toBe(100); // base = 100
      expect(result[1].value).toBe(110);
      expect(result[2].value).toBe(120);
    });

    it('handles multiple areas independently', () => {
      const data = [
        makePoint('GM1', 2020, 100),
        makePoint('GM1', 2021, 200),
        makePoint('GM2', 2020, 50),
        makePoint('GM2', 2021, 75),
      ];
      const result = groeicijfers(data, 'relatief');
      const gm1 = result.filter(r => r.geoCode === 'GM1');
      const gm2 = result.filter(r => r.geoCode === 'GM2');
      expect(gm1[1].value).toBe(100); // +100%
      expect(gm2[1].value).toBe(50);  // +50%
    });
  });

  describe('zScores', () => {
    it('standardizes values', () => {
      const data = [
        makePoint('GM1', 2024, 10),
        makePoint('GM2', 2024, 20),
        makePoint('GM3', 2024, 30),
      ];
      const result = zScores(data);
      // Mean = 20, stddev = 10
      expect(result[0].value).toBe(-1);
      expect(result[1].value).toBe(0);
      expect(result[2].value).toBe(1);
    });

    it('handles identical values (stddev=0)', () => {
      const data = [
        makePoint('GM1', 2024, 50),
        makePoint('GM2', 2024, 50),
      ];
      const result = zScores(data);
      expect(result[0].value).toBe(0);
      expect(result[1].value).toBe(0);
    });

    it('calculates per period', () => {
      const data = [
        makePoint('GM1', 2020, 100),
        makePoint('GM2', 2020, 200),
        makePoint('GM1', 2021, 300),
        makePoint('GM2', 2021, 500),
      ];
      const result = zScores(data);
      const y2020 = result.filter(r => r.year === 2020);
      const y2021 = result.filter(r => r.year === 2021);
      // Each year should be independently standardized (sample stddev n-1)
      // n=2: stddev = |diff|/sqrt(2), so z = ±0.71 for 2 values
      expect(y2020[0].value).toBe(-0.71);
      expect(y2020[1].value).toBe(0.71);
      expect(y2021[0].value).toBe(-0.71);
      expect(y2021[1].value).toBe(0.71);
    });
  });

  describe('applyTransformation', () => {
    const data = [makePoint('GM1', 2024, 100), makePoint('GM1', 2024, 200)];

    it('returns original for "none"', () => {
      expect(applyTransformation(data, 'none')).toBe(data);
    });

    it('applies percenteren', () => {
      const result = applyTransformation(data, 'percenteren');
      expect(result[0].value).toBeCloseTo(33.33, 1);
    });

    it('applies groeicijfers', () => {
      const timeData = [makePoint('GM1', 2020, 100), makePoint('GM1', 2021, 120)];
      const result = applyTransformation(timeData, 'groeicijfers');
      expect(result[1].value).toBe(20);
    });

    it('applies zscores', () => {
      const result = applyTransformation(data, 'zscores');
      // n=2, sample stddev: z = ±0.71
      expect(result[0].value).toBe(-0.71);
      expect(result[1].value).toBe(0.71);
    });
  });
});
