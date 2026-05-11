import { formatNumber, formatCompact, formatPercent } from '../../utils/format';
import type { ReferenceSeries } from '@shared/api/contracts';
import { computeDeltaPct, formatDeltaPct, getDeltaColour, pickReferenceValueAtYear, type DeltaDirection } from '../../utils/referenceSeries';

interface NumberDisplayProps {
  value: number;
  previousValue?: number;
  label: string;
  format?: 'number' | 'compact' | 'percent';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  /** SPEC-B: cohort/provincie/land reference series. Latest-year value used to compute delta chips. */
  references?: ReferenceSeries[];
  /** Direction config for delta chip colouring. Default 'neutral' (grey). */
  deltaDirection?: DeltaDirection;
}

const sizeClasses = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl',
  xl: 'text-4xl',
};

/**
 * Large number display for key metrics.
 * Used in summary tiles and KPI dashboards.
 *
 * SPEC-B KPI delta chips: when references are provided, render a "vs cohort: ±x%"
 * and "vs NL: ±y%" chip below the headline value. Direction colouring per deltaDirection.
 */
export function NumberDisplay({
  value,
  previousValue,
  label,
  format = 'compact',
  size = 'lg',
  color,
  references,
  deltaDirection = 'neutral',
}: NumberDisplayProps) {
  const formatValue = (v: number) => {
    switch (format) {
      case 'number': return formatNumber(v);
      case 'compact': return formatCompact(v);
      case 'percent': return `${v.toFixed(1)}%`;
    }
  };

  const change = previousValue !== undefined && previousValue > 0
    ? ((value - previousValue) / previousValue) * 100
    : null;

  // SPEC-B delta chips. We surface the two highest-signal kinds: cohort and land.
  // Provincie chip is available via tile config (off by default to keep the card clean per spec).
  const cohort = references?.find(r => r.kind === 'cohort');
  const land = references?.find(r => r.kind === 'land');
  // Use the shared helper — single source of truth for "which year's reference".
  const cohortRef = cohort ? pickReferenceValueAtYear(cohort, []) ?? null : null;
  const landRef = land ? pickReferenceValueAtYear(land, []) ?? null : null;
  const cohortDeltaPct = cohortRef !== null ? computeDeltaPct(value, cohortRef) : null;
  const landDeltaPct = landRef !== null ? computeDeltaPct(value, landRef) : null;
  // Show the chip wrapper only when at least one chip will actually render
  // (otherwise we'd emit an empty div whenever ref objects exist but resolve to no value).
  const hasAnyChip = (cohort && cohortRef !== null) || (land && landRef !== null);

  return (
    <div className="text-center py-4">
      <p
        className={`font-bold ${sizeClasses[size]} tabular-nums`}
        style={{ color: color || '#111827' }}
      >
        {formatValue(value)}
      </p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
      {change !== null && (
        <p className={`text-sm mt-1.5 font-medium ${
          change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500'
        }`}>
          {formatPercent(change)} t.o.v. vorige periode
        </p>
      )}
      {hasAnyChip && (
        <div className="mt-2 flex items-center justify-center gap-2 text-xs">
          {cohort && cohortRef !== null && (
            <span className={`px-2 py-0.5 rounded-full bg-gray-50 ${getDeltaColour(deltaDirection, cohortDeltaPct ?? 0)} font-medium`}>
              vs cohort: {cohortDeltaPct !== null ? formatDeltaPct(value, cohortRef) : '—'}
            </span>
          )}
          {land && landRef !== null && (
            <span
              className={`px-2 py-0.5 rounded-full bg-gray-50 ${getDeltaColour(deltaDirection, landDeltaPct ?? 0)} font-medium`}
              // The 'land' series is the mean across all Dutch gemeenten, not
              // the NL total. Calling it "vs NL" implied a total-vs-total
              // comparison and turned harmless gemeente size differences into
              // implausible +300% deltas (issue #76).
              title="Vergelijking met landelijk gemiddelde per gemeente"
            >
              vs landelijk: {landDeltaPct !== null ? formatDeltaPct(value, landRef) : '—'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
