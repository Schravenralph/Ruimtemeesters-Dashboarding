import { describe, it, expect } from 'vitest';
import {
  ChartType, GeoLevel, Role, ExportFormat,
  TileConfig, ThemeConfig, CustomDashboard, AccessPolicy,
  FilterState, DataQueryParams,
} from './contracts';

describe('contracts - comprehensive validation', () => {
  describe('ChartType edge cases', () => {
    it('rejects empty string', () => {
      expect(ChartType.safeParse('').success).toBe(false);
    });

    it('is case-sensitive', () => {
      expect(ChartType.safeParse('Bar').success).toBe(false);
      expect(ChartType.safeParse('LINE').success).toBe(false);
    });
  });

  describe('GeoLevel hierarchy', () => {
    it('corop is valid', () => {
      expect(GeoLevel.parse('corop')).toBe('corop');
    });

    it('all levels are valid', () => {
      const levels = ['land', 'provincie', 'corop', 'gemeente', 'wijk', 'buurt'];
      levels.forEach(level => {
        expect(GeoLevel.safeParse(level).success).toBe(true);
      });
    });
  });

  describe('FilterState complex scenarios', () => {
    it('handles comparison with same year', () => {
      const result = FilterState.parse({
        period: { year: 2024, compareYear: 2024 },
        comparisonEnabled: true,
      });
      expect(result.period.year).toBe(result.period.compareYear);
    });

    it('handles multiple dimension filters', () => {
      const result = FilterState.parse({
        dimensions: {
          age_group: '25-44',
          gender: 'man',
        },
      });
      expect(Object.keys(result.dimensions)).toHaveLength(2);
    });
  });

  describe('DataQueryParams validation', () => {
    it('handles all optional params', () => {
      const result = DataQueryParams.parse({
        source: 'bevolking',
        geoLevel: 'gemeente',
        geoCode: 'GM0363',
        year: 2024,
        compareYear: 2020,
        dimension: 'age_group',
        dimensionValue: '25-44',
        limit: 100,
        offset: 50,
      });
      expect(result.source).toBe('bevolking');
      expect(result.limit).toBe(100);
    });
  });
});
