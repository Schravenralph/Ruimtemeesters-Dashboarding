import { ComposedChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import type { DataPoint } from '@shared/api/contracts';
import { formatCompact } from '../../utils/format';

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

  const isPrognose = (d: DataPoint) => d.source === 'cbs_prognose' || d.source === 'ruimtemeesters_prognose';

  // Aggregate by year, tracking source
  const yearMap = new Map<number, { value: number; prognose: boolean }>();
  for (const d of data) {
    const existing = yearMap.get(d.year);
    if (existing) {
      existing.value += d.value;
      if (isPrognose(d)) existing.prognose = true;
    } else {
      yearMap.set(d.year, { value: d.value, prognose: isPrognose(d) });
    }
  }

  const sorted = [...yearMap.entries()].sort((a, b) => a[0] - b[0]);
  const hasPrognose = sorted.some(([, v]) => v.prognose);

  // Build chart data with separate actuals/prognose series
  const chartData = sorted.map(([year, { value, prognose }]) => ({
    year: String(year),
    actuals: !prognose ? value : undefined,
    prognose: prognose ? value : undefined,
    value,
  }));

  // Bridge point: last actual also appears in prognose for line continuity
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
          labelFormatter={(label) => `${label}`}
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
