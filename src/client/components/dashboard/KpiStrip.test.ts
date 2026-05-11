import { describe, it, expect } from 'vitest';
import { sumSeries, mergeKpiResults, type KpiResult } from './KpiStrip';

describe('sumSeries', () => {
  it('sums two series element-wise by year', () => {
    const a = [{ year: 2023, value: 10 }, { year: 2024, value: 20 }];
    const b = [{ year: 2023, value: 5 }, { year: 2024, value: 7 }];
    expect(sumSeries(a, b)).toEqual([
      { year: 2023, value: 15 },
      { year: 2024, value: 27 },
    ]);
  });

  it('keeps years that exist in only one operand', () => {
    const a = [{ year: 2023, value: 10 }];
    const b = [{ year: 2024, value: 20 }];
    expect(sumSeries(a, b)).toEqual([
      { year: 2023, value: 10 },
      { year: 2024, value: 20 },
    ]);
  });

  it('returns an empty series when both inputs are empty', () => {
    expect(sumSeries([], [])).toEqual([]);
  });
});

describe('mergeKpiResults', () => {
  const dp = (geoCode: string, year: number, value: number, dimensionValue?: string) => ({
    geoCode,
    geoName: geoCode,
    year,
    value,
    ...(dimensionValue ? { dimensionValue, dimension: 'age_group' } : {}),
  });

  it('returns the lone result unchanged when only one bin is queried', () => {
    const single: KpiResult = {
      data: [dp('GM0363', 2024, 100)],
      references: [{ kind: 'cohort', label: 'G4', series: [{ year: 2024, value: 80 }] }],
    };
    expect(mergeKpiResults([single])).toBe(single);
  });

  it('returns an empty result when no inputs are given', () => {
    expect(mergeKpiResults([])).toEqual({ data: [], references: [] });
  });

  it('sums data values across bins (e.g. 65-74 + 75+ for "65+ jaar")', () => {
    const bin6574: KpiResult = {
      data: [dp('GM0363', 2024, 60_000, '65-74')],
      references: [],
    };
    const bin75plus: KpiResult = {
      data: [dp('GM0363', 2024, 40_000, '75+')],
      references: [],
    };
    const merged = mergeKpiResults([bin6574, bin75plus]);
    expect(merged.data).toHaveLength(1);
    expect(merged.data[0].value).toBe(100_000);
    expect(merged.data[0].geoCode).toBe('GM0363');
  });

  it('sums reference series of the same kind element-wise across bins', () => {
    const bin6574: KpiResult = {
      data: [dp('GM0363', 2024, 60_000)],
      references: [
        { kind: 'cohort', label: 'G4', series: [{ year: 2023, value: 50_000 }, { year: 2024, value: 55_000 }] },
        { kind: 'land', label: 'Nederland', series: [{ year: 2024, value: 1_500_000 }] },
      ],
    };
    const bin75plus: KpiResult = {
      data: [dp('GM0363', 2024, 40_000)],
      references: [
        { kind: 'cohort', label: 'G4', series: [{ year: 2023, value: 30_000 }, { year: 2024, value: 35_000 }] },
        { kind: 'land', label: 'Nederland', series: [{ year: 2024, value: 1_000_000 }] },
      ],
    };
    const merged = mergeKpiResults([bin6574, bin75plus]);

    const cohort = merged.references.find((r) => r.kind === 'cohort');
    expect(cohort?.series).toEqual([
      { year: 2023, value: 80_000 },
      { year: 2024, value: 90_000 },
    ]);

    const land = merged.references.find((r) => r.kind === 'land');
    expect(land?.series).toEqual([{ year: 2024, value: 2_500_000 }]);
  });

  it('keeps a reference series even if only one bin emits it', () => {
    const bin6574: KpiResult = {
      data: [dp('GM0363', 2024, 60_000)],
      references: [{ kind: 'cohort', label: 'G4', series: [{ year: 2024, value: 55_000 }] }],
    };
    const bin75plus: KpiResult = {
      data: [dp('GM0363', 2024, 40_000)],
      references: [],
    };
    const merged = mergeKpiResults([bin6574, bin75plus]);
    const cohort = merged.references.find((r) => r.kind === 'cohort');
    expect(cohort?.series).toEqual([{ year: 2024, value: 55_000 }]);
  });
});
