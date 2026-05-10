import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import type { DataPoint, ReferenceSeries } from '@shared/api/contracts';
import { formatCompact, dimensionValueLabel } from '../../utils/format';
import { getReferenceStyle, sortReferences, pickReferenceValueAtYear } from '../../utils/referenceSeries';

interface HorizontalBarChartProps {
  data: DataPoint[];
  colors?: string[];
  maxItems?: number;
  /** SPEC-B: cohort/provincie/land reference series rendered as vertical reference lines. */
  references?: ReferenceSeries[];
}

const DEFAULT_COLORS = ['#3b82f6'];

/**
 * Horizontal bar chart showing ranked items.
 * Good for comparing values across many geographic areas.
 */
export function HorizontalBarChartComponent({
  data,
  colors = DEFAULT_COLORS,
  maxItems = 15,
  references,
}: HorizontalBarChartProps) {
  // Aggregate by geo area
  const aggregated = new Map<string, { name: string; value: number }>();
  for (const d of data) {
    const key = d.geoCode;
    const existing = aggregated.get(key) || { name: d.geoName, value: 0 };
    existing.value += d.value;
    aggregated.set(key, existing);
  }

  const sorted = [...aggregated.values()]
    .sort((a, b) => b.value - a.value)
    .slice(0, maxItems);

  if (sorted.length === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">Geen data beschikbaar</p>;
  }

  // SPEC-B: pick reference values at the latest year present in the data.
  const chartYears = [...new Set(data.map(d => d.year))];
  const refLines = (references && references.length > 0)
    ? sortReferences(references)
        .map(ref => ({ ref, value: pickReferenceValueAtYear(ref, chartYears) }))
        .filter((entry): entry is { ref: ReferenceSeries; value: number } => entry.value !== undefined)
    : [];

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, sorted.length * 28 + 40)}>
      <BarChart data={sorted} layout="vertical" margin={{ left: 80 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatCompact(v)} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11 }}
          width={80}
        />
        <Tooltip formatter={(value: number) => formatCompact(value)} />
        <Bar dataKey="value" fill={colors[0]} radius={[0, 4, 4, 0]} />
        {refLines.map(({ ref, value }) => {
          const style = getReferenceStyle(ref.kind);
          // For horizontal bar (layout=vertical), reference is a vertical line on the value axis.
          return (
            <ReferenceLine
              key={`ref-${ref.kind}`}
              x={value}
              stroke={style.stroke}
              strokeWidth={style.strokeWidth}
              strokeDasharray={style.strokeDasharray}
              strokeOpacity={style.opacity}
              label={{ value: ref.label, position: 'top', fontSize: 10, fill: style.stroke }}
            />
          );
        })}
      </BarChart>
    </ResponsiveContainer>
  );
}
