/**
 * Visual-encoding standard for cohort/provincie/land reference series.
 * Defined in SPEC-B docs/superpowers/specs/2026-05-09-reference-series-rendering-design.md.
 *
 * Values are kept distinguishable without colour (a11y): each kind has a
 * different dash pattern and opacity so colour-blind users can still tell them apart.
 */

import type { ReferenceSeries, ChartType } from '@shared/api/contracts';

export type ReferenceKind = ReferenceSeries['kind'];

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
