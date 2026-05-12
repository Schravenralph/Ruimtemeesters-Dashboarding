import { describe, it, expect } from 'vitest';
import { isThemeShipped } from './theme-readiness.controller';

const base = {
  slug: 'x',
  name: 'X',
  supercategory: 'wonen',
  tileCount: 4,
  kpiConfigCount: 3,
  templateSeeded: true,
  templateVersion: 1,
  distinctDataSources: ['bevolking'],
};

describe('isThemeShipped — ADR-002 "shipped" bar', () => {
  it('all criteria met → shipped', () => {
    expect(isThemeShipped(base)).toBe(true);
  });

  it('empty kpi_config → not shipped', () => {
    expect(isThemeShipped({ ...base, kpiConfigCount: 0 })).toBe(false);
  });

  it('no dashboard_templates row → not shipped', () => {
    expect(isThemeShipped({ ...base, templateSeeded: false, templateVersion: null })).toBe(false);
  });

  it('no data sources → not shipped', () => {
    expect(isThemeShipped({ ...base, distinctDataSources: [] })).toBe(false);
  });

  it('no tiles → not shipped', () => {
    expect(isThemeShipped({ ...base, tileCount: 0 })).toBe(false);
  });
});
