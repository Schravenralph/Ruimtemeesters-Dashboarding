import { ComposedChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import type { DataPoint } from '@shared/api/contracts';
import { formatCompact } from '../../utils/format';
import { isPrognoseSource } from '../../utils/prognose';

interface MiniChartProps {
  data: DataPoint[];
  color?: string;
  height?: number;
}

/**
 * Compact sparkline chart for inline display.
 * Shows solid line for CBS actuals, dashed purple for prognose.
 */
export function MiniChart({ data, color = '#3b82f6', height = 40 }: MiniChartProps) {
  if (data.length === 0) return null;

  // Aggregate by year, tracking source per data point (not per year).
  // A year can have both actuals and prognose — keep the actuals value for the actuals line.
  const yearActuals = new Map<number, number>();
  const yearPrognose = new Map<number, number>();

  for (const d of data) {
    if (isPrognoseSource(d.source)) {
      yearPrognose.set(d.year, (yearPrognose.get(d.year) || 0) + d.value);
    } else {
      yearActuals.set(d.year, (yearActuals.get(d.year) || 0) + d.value);
    }
  }

  const allYears = [...new Set([...yearActuals.keys(), ...yearPrognose.keys()])].sort((a, b) => a - b);
  const hasPrognose = yearPrognose.size > 0;

  const chartData = allYears.map(year => ({
    year: String(year),
    actuals: yearActuals.get(year),
    prognose: yearPrognose.get(year),
    value: yearActuals.get(year) ?? yearPrognose.get(year) ?? 0,
  }));

  // Bridge point: last actual year also appears in prognose for line continuity
  if (hasPrognose) {
    const lastActualIdx = chartData.map((d, i) => d.actuals !== undefined ? i : -1).filter(i => i >= 0).pop();
    if (lastActualIdx !== undefined && lastActualIdx >= 0) {
      chartData[lastActualIdx].prognose = chartData[lastActualIdx].actuals;
    }
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={chartData}>
        <Tooltip
          formatter={(value: number) => formatCompact(value)}
          labelFormatter={(label) => `Jaar ${label}`}
          contentStyle={{ fontSize: 11, padding: '4px 8px' }}
        />
        {hasPrognose ? (
          <>
            <Line type="monotone" dataKey="actuals" stroke={color} strokeWidth={1.5} dot={false} connectNulls={false} />
            <Line type="monotone" dataKey="prognose" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="4 2" dot={false} connectNulls={false} />
          </>
        ) : (
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
