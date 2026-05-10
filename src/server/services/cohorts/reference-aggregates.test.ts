import { describe, it, expect } from 'vitest';
import { _internals } from './reference-aggregates.js';

const { defaultCohortType, COHORT_DEFAULT_BY_SUPERCATEGORY } = _internals;

describe('reference-aggregates — defaultCohortType', () => {
  it('returns woningmarktregio for wonen', () => {
    expect(defaultCohortType('wonen')).toBe('woningmarktregio');
  });

  it('returns populatiegrootte for duurzaamheid', () => {
    expect(defaultCohortType('duurzaamheid')).toBe('populatiegrootte');
  });

  it('falls back to populatiegrootte for unknown supercategory', () => {
    expect(defaultCohortType('mobiliteit')).toBe('populatiegrootte');
    expect(defaultCohortType('economie')).toBe('populatiegrootte');
    expect(defaultCohortType(undefined)).toBe('populatiegrootte');
  });

  it('exposes the lookup table', () => {
    expect(COHORT_DEFAULT_BY_SUPERCATEGORY.wonen).toBe('woningmarktregio');
    expect(COHORT_DEFAULT_BY_SUPERCATEGORY.duurzaamheid).toBe('populatiegrootte');
  });
});
