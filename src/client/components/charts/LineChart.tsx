import {
  ComposedChart,
  Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, ReferenceArea,
} from 'recharts';
import type { DataPoint, ReferenceSeries } from '@shared/api/contracts';
import { isPrognoseSource } from '../../utils/prognose';
import { getReferenceStyle, sortReferences } from '../../utils/referenceSeries';

interface LineChartProps {
  data: DataPoint[];
  colors?: string[];
  comparisonData?: DataPoint[];
  comparisonLabel?: string;
  /** SPEC-B: cohort/provincie/land reference series, rendered as dashed lines on the same axis. */
  references?: ReferenceSeries[];
  /** Display label for the focal series, e.g. "Amsterdam (GM0363)". Falls back to "Gemeente". */
  focalLabel?: string;
}

/** Stable dataKey per reference kind so Recharts can render them as additional lines. */
const REF_KEYS = { cohort: '__ref_cohort', provincie: '__ref_provincie', land: '__ref_land' } as const;
type RefKey = typeof REF_KEYS[keyof typeof REF_KEYS];

function attachReferences(
  chartData: Array<Record<string, string | number | undefined | number[]>>,
  refs: ReferenceSeries[] | undefined,
): { data: typeof chartData; presentRefs: ReferenceSeries[] } {
  if (!refs || refs.length === 0) return { data: chartData, presentRefs: [] };
  const sorted = sortReferences(refs);
  const presentRefs: ReferenceSeries[] = [];
  for (const ref of sorted) {
    const key: RefKey = REF_KEYS[ref.kind];
    const valueByYear = new Map(ref.series.map(p => [p.year, p.value]));
    let added = false;
    for (const row of chartData) {
      const yr = parseInt(row.name as string, 10);
      const v = valueByYear.get(yr);
      if (v !== undefined && Number.isFinite(v)) {
        row[key] = v;
        added = true;
      }
    }
    if (added) presentRefs.push(ref);
  }
  return { data: chartData, presentRefs };
}

function renderReferenceLines(presentRefs: ReferenceSeries[]): React.ReactNode[] {
  return presentRefs.map(ref => {
    const style = getReferenceStyle(ref.kind);
    const key: RefKey = REF_KEYS[ref.kind];
    return (
      <Line
        key={`ref-${ref.kind}`}
        type="monotone"
        dataKey={key}
        name={ref.label}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        strokeDasharray={style.strokeDasharray}
        strokeOpacity={style.opacity}
        dot={false}
        connectNulls={true}
      />
    );
  });
}

const DEFAULT_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16',
];

export function LineChartComponent({ data, colors = DEFAULT_COLORS, comparisonData, comparisonLabel, references, focalLabel }: LineChartProps) {
  const dimensionValues = [...new Set(data.map(d => d.dimensionValue).filter((v): v is string => !!v))];

  if (dimensionValues.length === 0) {
    // Simple line chart — split actuals from prognose
    const isPrognose = (d: DataPoint) => isPrognoseSource(d.source);
    const hasPrognose = data.some(isPrognose);
    const hasConfidence = data.some(d => d.confidenceLower != null);

    // Find the transition year (last year with actuals)
    const actualYears = data.filter(d => !isPrognose(d)).map(d => d.year);
    const transitionYear = actualYears.length > 0 ? Math.max(...actualYears) : null;
    const prognoseYears = data.filter(isPrognose).map(d => d.year);
    const lastPrognoseYear = prognoseYears.length > 0 ? Math.max(...prognoseYears) : null;

    // Group by year so the boundary year — where both cbs_actuals and a
    // ruimtemeesters_prognose row exist (e.g. 2025 for Amsterdam) — collapses
    // to a single row. Two rows with the same `name` break Recharts' category
    // axis and the bridge logic, leaving the line invisible (#162).
    const rowByYear = new Map<number, {
      name: string;
      actuals: number | undefined;
      prognose: number | undefined;
      value: number;
      confidenceBand?: [number, number];
    }>();
    for (const d of data) {
      const existing = rowByYear.get(d.year);
      const isP = isPrognose(d);
      if (!existing) {
        rowByYear.set(d.year, {
          name: String(d.year),
          actuals: isP ? undefined : d.value,
          prognose: isP ? d.value : undefined,
          value: d.value,
          ...(d.confidenceLower != null && d.confidenceUpper != null
            ? { confidenceBand: [d.confidenceLower, d.confidenceUpper] }
            : {}),
        });
      } else {
        // Boundary year overlap: actual wins for the y-value; prognose can
        // still contribute its confidence band so the uncertainty fan is
        // anchored at the handoff.
        if (isP) {
          if (existing.prognose === undefined) existing.prognose = d.value;
          if (existing.confidenceBand === undefined
              && d.confidenceLower != null && d.confidenceUpper != null) {
            existing.confidenceBand = [d.confidenceLower, d.confidenceUpper];
          }
        } else {
          existing.actuals = d.value;
          existing.value = d.value;
        }
      }
    }
    const chartData = [...rowByYear.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, row]) => row);

    // Add bridge point: last actual year also appears in prognose series for continuity.
    // After grouping there is at most one row per year, so the bridge always
    // lands on the row that holds the actual value at the transition.
    if (hasPrognose && transitionYear) {
      const bridgeIdx = chartData.findIndex(d => d.name === String(transitionYear));
      if (bridgeIdx >= 0 && chartData[bridgeIdx].actuals !== undefined) {
        chartData[bridgeIdx].prognose = chartData[bridgeIdx].actuals;
      }
    }

    // SPEC-B: weave reference series into the per-year rows.
    const { presentRefs } = attachReferences(chartData, references);

    return (
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={formatNumber} />
          <Tooltip
            formatter={(value: number | number[], name: string) => {
              if (Array.isArray(value)) return [`${formatNumber(value[0])} – ${formatNumber(value[1])}`, name];
              return [formatNumber(value), name];
            }}
            labelFormatter={(label) => {
              const yr = parseInt(label);
              if (transitionYear && yr > transitionYear) return `${label} (prognose)`;
              return label;
            }}
          />
          {/* Shaded prognose zone background */}
          {hasPrognose && transitionYear && lastPrognoseYear && (
            <ReferenceArea
              x1={String(transitionYear)}
              x2={String(lastPrognoseYear)}
              fill="#8b5cf6"
              fillOpacity={0.04}
              strokeOpacity={0}
            />
          )}
          {/* Vertical divider line at transition year */}
          {hasPrognose && transitionYear && (
            <ReferenceLine
              x={String(transitionYear)}
              stroke="#8b5cf6"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: 'Prognose →', position: 'insideTopRight', fontSize: 11, fill: '#7c3aed', fontWeight: 600 }}
            />
          )}
          {/* Confidence band */}
          {hasConfidence && (
            <Area type="monotone" dataKey="confidenceBand" name="95% betrouwbaarheid" fill="#8b5cf6" fillOpacity={0.12} stroke="none" />
          )}
          {/* Each Line must be a direct child of ComposedChart — Recharts 2.x
              walks children via React.Children.map, which does NOT unwrap
              React Fragments. Wrapping the conditional in <>…</> made
              Recharts see one opaque Fragment instead of two Lines, so
              the SVG rendered the axes/reference band but no lines (#162). */}
          {hasPrognose && (
            <Line type="monotone" dataKey="actuals" name={`${focalLabel ?? 'Gemeente'} — actueel (CBS)`} stroke={colors[0]} strokeWidth={2.5} dot={{ r: 2, strokeWidth: 0 }} connectNulls={false} />
          )}
          {hasPrognose && (
            <Line type="monotone" dataKey="prognose" name={`${focalLabel ?? 'Gemeente'} — prognose (TSA)`} stroke="#8b5cf6" strokeWidth={2.5} strokeDasharray="6 3" dot={{ r: 2, fill: '#8b5cf6', strokeWidth: 0 }} connectNulls={false} />
          )}
          {hasPrognose && (
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              formatter={(value: string) => <span style={{ color: '#374151' }}>{value}</span>}
            />
          )}
          {!hasPrognose && (
            <Line type="monotone" dataKey="value" name={focalLabel ?? 'Gemeente'} stroke={colors[0]} strokeWidth={2} dot={{ r: 3 }} />
          )}
          {comparisonData && comparisonData.length > 0 && (
            <ReferenceLine y={comparisonData.reduce((sum, d) => sum + d.value, 0) / comparisonData.length} stroke="#ef4444" strokeDasharray="8 4" label={{ value: comparisonLabel || 'Vergelijking', position: 'right', fontSize: 11, fill: '#ef4444' }} />
          )}
          {renderReferenceLines(presentRefs)}
          {presentRefs.length > 0 && !hasPrognose && (
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  // Multi-line: one line per dimension value, x-axis = year
  const years = [...new Set(data.map(d => d.year))].sort();
  const chartDataMulti: Array<Record<string, string | number | undefined | number[]>> = years.map(year => {
    const entry: Record<string, string | number | undefined | number[]> = { name: String(year) };
    for (const dimVal of dimensionValues) {
      const point = data.find(d => d.year === year && d.dimensionValue === dimVal);
      entry[dimVal] = point?.value || 0;
    }
    return entry;
  });
  const { presentRefs: presentRefsMulti } = attachReferences(chartDataMulti, references);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={chartDataMulti}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={formatNumber} />
        <Tooltip formatter={(value: number) => formatNumber(value)} />
        <Legend />
        {dimensionValues.map((dimVal, i) => {
          // When the only dimension value is the synthetic "totaal" row,
          // the chart is effectively a single-series time series for the
          // focal gemeente — surface that identity in the legend/tooltip
          // instead of the opaque "totaal" string.
          const lineName =
            dimensionValues.length === 1 && dimVal === 'totaal' && focalLabel
              ? focalLabel
              : dimVal;
          return (
            <Line
              key={dimVal}
              type="monotone"
              dataKey={dimVal}
              name={lineName}
              stroke={colors[i % colors.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          );
        })}
        {renderReferenceLines(presentRefsMulti)}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function formatNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return String(value);
}
