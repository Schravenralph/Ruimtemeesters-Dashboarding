import { describe, it, expect } from 'vitest';
import {
  getReferenceStyle,
  sortReferences,
  REFERENCE_ORDER,
  TIER1_CHART_TYPES,
  chartSupportsReferences,
  getDeltaColour,
  formatDeltaPct,
  computeDeltaPct,
} from './referenceSeries';
import type { ReferenceSeries } from '@shared/api/contracts';

describe('referenceSeries — visual encoding', () => {
  it('cohort uses dash 8,4 with grey-700 stroke', () => {
    const s = getReferenceStyle('cohort');
    expect(s.strokeDasharray).toBe('8 4');
    expect(s.stroke).toBe('#374151');
  });

  it('provincie uses dash 4,4 with grey-500 stroke', () => {
    const s = getReferenceStyle('provincie');
    expect(s.strokeDasharray).toBe('4 4');
    expect(s.stroke).toBe('#6B7280');
  });

  it('land uses dash 2,2 with grey-400 stroke', () => {
    const s = getReferenceStyle('land');
    expect(s.strokeDasharray).toBe('2 2');
    expect(s.stroke).toBe('#9CA3AF');
  });

  it('a11y: all three kinds have unique dash patterns', () => {
    const dashes = REFERENCE_ORDER.map(k => getReferenceStyle(k).strokeDasharray);
    expect(new Set(dashes).size).toBe(3);
  });
});

describe('referenceSeries — sortReferences', () => {
  it('orders cohort, provincie, land regardless of input order', () => {
    const refs: ReferenceSeries[] = [
      { kind: 'land', label: 'NL', series: [] },
      { kind: 'cohort', label: 'C', series: [] },
      { kind: 'provincie', label: 'P', series: [] },
    ];
    const sorted = sortReferences(refs);
    expect(sorted.map(r => r.kind)).toEqual(['cohort', 'provincie', 'land']);
  });
});

describe('referenceSeries — Tier-1 chart support', () => {
  it('includes line, bar, stacked-bar, horizontal-bar', () => {
    expect(chartSupportsReferences('line')).toBe(true);
    expect(chartSupportsReferences('bar')).toBe(true);
    expect(chartSupportsReferences('stacked-bar')).toBe(true);
    expect(chartSupportsReferences('horizontal-bar')).toBe(true);
  });

  it('includes color-table, choropleth, number', () => {
    expect(chartSupportsReferences('color-table')).toBe(true);
    expect(chartSupportsReferences('choropleth')).toBe(true);
    expect(chartSupportsReferences('number')).toBe(true);
  });

  it('excludes pie, donut, radar, pyramid (Tier-2)', () => {
    expect(chartSupportsReferences('pie')).toBe(false);
    expect(chartSupportsReferences('donut')).toBe(false);
    expect(chartSupportsReferences('radar')).toBe(false);
    expect(chartSupportsReferences('pyramid')).toBe(false);
  });

  it('TIER1_CHART_TYPES is read-only', () => {
    expect(TIER1_CHART_TYPES.size).toBeGreaterThanOrEqual(7);
  });
});

describe('referenceSeries — KPI delta helpers', () => {
  it('formatDeltaPct returns "+x.x%" for increases', () => {
    expect(formatDeltaPct(110, 100)).toBe('+10.0%');
  });

  it('formatDeltaPct returns "-x.x%" for decreases', () => {
    expect(formatDeltaPct(90, 100)).toBe('-10.0%');
  });

  it('formatDeltaPct returns em-dash on divide-by-zero', () => {
    expect(formatDeltaPct(50, 0)).toBe('—');
  });

  it('computeDeltaPct returns null on divide-by-zero', () => {
    expect(computeDeltaPct(50, 0)).toBeNull();
    expect(computeDeltaPct(NaN, 100)).toBeNull();
  });

  it('higher-is-good: positive delta is green', () => {
    expect(getDeltaColour('higher-is-good', 5)).toBe('text-emerald-600');
  });

  it('higher-is-good: negative delta is red', () => {
    expect(getDeltaColour('higher-is-good', -5)).toBe('text-rose-600');
  });

  it('higher-is-bad: positive delta is red (e.g. woningtekort up)', () => {
    expect(getDeltaColour('higher-is-bad', 5)).toBe('text-rose-600');
  });

  it('higher-is-bad: negative delta is green (e.g. woningtekort down)', () => {
    expect(getDeltaColour('higher-is-bad', -5)).toBe('text-emerald-600');
  });

  it('neutral always returns grey', () => {
    expect(getDeltaColour('neutral', 5)).toBe('text-gray-500');
    expect(getDeltaColour('neutral', -5)).toBe('text-gray-500');
  });

  it('near-zero delta is grey regardless of direction', () => {
    expect(getDeltaColour('higher-is-good', 0)).toBe('text-gray-500');
    expect(getDeltaColour('higher-is-bad', 0.0001)).toBe('text-gray-500');
  });
});
