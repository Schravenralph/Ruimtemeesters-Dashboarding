import { describe, it, expect } from 'vitest';
import { DataQueryParams } from '../../shared/api/contracts.js';

describe('DataQueryParams validation', () => {
  it('accepts valid query params', () => {
    const result = DataQueryParams.safeParse({
      source: 'bevolking',
      geoCode: 'GM0363',
      year: '2024',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.source).toBe('bevolking');
      expect(result.data.year).toBe(2024);
    }
  });

  it('coerces string numbers', () => {
    const result = DataQueryParams.safeParse({
      source: 'woningen',
      year: '2023',
      limit: '100',
      offset: '50',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.year).toBe(2023);
      expect(result.data.limit).toBe(100);
      expect(result.data.offset).toBe(50);
    }
  });

  it('accepts minimal params', () => {
    const result = DataQueryParams.safeParse({ source: 'huishoudens' });
    expect(result.success).toBe(true);
  });

  it('rejects missing source', () => {
    const result = DataQueryParams.safeParse({});
    expect(result.success).toBe(false);
  });

  it('handles optional dimension params', () => {
    const result = DataQueryParams.safeParse({
      source: 'bevolking',
      dimension: 'age_group',
      dimensionValue: '25-44',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dimension).toBe('age_group');
      expect(result.data.dimensionValue).toBe('25-44');
    }
  });

  it('accepts SPEC-A references param', () => {
    const result = DataQueryParams.safeParse({
      source: 'bevolking',
      geoCode: 'GM0363',
      references: 'cohort,provincie,land',
      cohortType: 'populatiegrootte',
      envelope: 'true',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.references).toBe('cohort,provincie,land');
      expect(result.data.cohortType).toBe('populatiegrootte');
      expect(result.data.envelope).toBe(true);
    }
  });

  it('rejects unknown cohortType', () => {
    const result = DataQueryParams.safeParse({
      source: 'bevolking',
      cohortType: 'not_a_cohort',
    });
    expect(result.success).toBe(false);
  });

  it('accepts query without references (back-compat)', () => {
    const result = DataQueryParams.safeParse({ source: 'bevolking' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.references).toBeUndefined();
      expect(result.data.cohortType).toBeUndefined();
      expect(result.data.envelope).toBeUndefined();
    }
  });
});
