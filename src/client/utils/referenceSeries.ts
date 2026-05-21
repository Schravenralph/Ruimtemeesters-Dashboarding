/**
 * Visual-encoding standard for cohort/provincie/land reference series.
 * Defined in SPEC-B docs/superpowers/specs/2026-05-09-reference-series-rendering-design.md.
 *
 * Values are kept distinguishable without colour (a11y): each kind has a
 * different dash pattern and opacity so colour-blind users can still tell them apart.
 */

import type { ReferenceSeries, ReferencesBlock, ChartType } from '@shared/api/contracts';

export type ReferenceKind = ReferenceSeries['kind'];

/** Flatten the server's three-keyed ReferencesBlock into an ordered array
 *  (cohort, then provincie, then land). Used by every consumer of /api/data/query
 *  and /api/data/timeseries — kept here as the single source of truth so future
 *  reference kinds only need to be registered in one place. */
export function blockToArray(block: ReferencesBlock | undefined): ReferenceSeries[] {
  if (!block) return [];
  const out: ReferenceSeries[] = [];
  if (block.cohort) out.push(block.cohort);
  if (block.provincie) out.push(block.provincie);
  if (block.land) out.push(block.land);
  return out;
}

export interface ReferenceStyle {
  stroke: string;
  strokeWidth: number;
  strokeDasharray: string;
  opacity: number;
  zIndex: number;
}

const REFERENCE_STYLES: Record<ReferenceKind, ReferenceStyle> = {
  cohort: {
    stroke: '#374151',     // grey-700
    strokeWidth: 1.5,
    strokeDasharray: '8 4',
    opacity: 0.65,
    zIndex: 2,
  },
  provincie: {
    stroke: '#6B7280',     // grey-500
    strokeWidth: 1.5,
    strokeDasharray: '4 4',
    opacity: 0.55,
    zIndex: 1,
  },
  land: {
    stroke: '#9CA3AF',     // grey-400
    strokeWidth: 1.5,
    strokeDasharray: '2 2',
    opacity: 0.5,
    zIndex: 0,
  },
};

export function getReferenceStyle(kind: ReferenceKind): ReferenceStyle {
  return REFERENCE_STYLES[kind];
}

/** Display order for legend / rendering (focal first elsewhere; refs in this order). */
export const REFERENCE_ORDER: ReferenceKind[] = ['cohort', 'provincie', 'land'];

export function sortReferences(refs: ReferenceSeries[]): ReferenceSeries[] {
  const order: Record<ReferenceKind, number> = { cohort: 0, provincie: 1, land: 2 };
  return [...refs].sort((a, b) => order[a.kind] - order[b.kind]);
}

/**
 * The 8 Tier-1 chart types that render references by default per SPEC-B.
 * Other chart types receive no `references` prop (no-op, no breakage).
 */
export const TIER1_CHART_TYPES: ReadonlySet<ChartType> = new Set<ChartType>([
  'line',
  'bar',
  'stacked-bar',
  'horizontal-bar',
  'color-table',
  'choropleth',
  'number',
  // 'percentage-bar' — not in current ChartType enum; covered when added.
]);

export function chartSupportsReferences(chartType: ChartType): boolean {
  return TIER1_CHART_TYPES.has(chartType);
}

/** Direction config for KPI delta chips. */
export type DeltaDirection = 'higher-is-good' | 'higher-is-bad' | 'neutral';

export function getDeltaColour(direction: DeltaDirection, deltaPct: number): string {
  if (direction === 'neutral' || Math.abs(deltaPct) < 0.001) return 'text-gray-500';
  const positive = deltaPct > 0;
  const good = (direction === 'higher-is-good' && positive) || (direction === 'higher-is-bad' && !positive);
  return good ? 'text-emerald-600' : 'text-rose-600';
}

export function formatDeltaPct(focal: number, reference: number): string {
  if (!Number.isFinite(focal) || !Number.isFinite(reference) || reference === 0) return '—';
  const pct = ((focal - reference) / reference) * 100;
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

export function computeDeltaPct(focal: number, reference: number): number | null {
  if (!Number.isFinite(focal) || !Number.isFinite(reference) || reference === 0) return null;
  return ((focal - reference) / reference) * 100;
}

/**
 * Pick the reference value at the year that aligns with the chart's data.
 * Strategy: prefer exact match at max year present in chart data; fall back to
 * latest year present in the reference series. Returns undefined for empty series.
 *
 * Single source of truth for "which year's reference" used by single-snapshot
 * chart types (Bar, HorizontalBar, NumberDisplay).
 */
export function pickReferenceValueAtYear(
  ref: ReferenceSeries,
  chartYears: number[],
): number | undefined {
  if (ref.series.length === 0) return undefined;
  if (chartYears.length > 0) {
    const targetYear = Math.max(...chartYears);
    const exact = ref.series.find(p => p.year === targetYear);
    if (exact) return exact.value;
  }
  return ref.series.reduce((latest, p) => (p.year > latest.year ? p : latest), ref.series[0]).value;
}
