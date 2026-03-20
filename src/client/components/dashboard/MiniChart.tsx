import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import type { DataPoint } from '@shared/api/contracts';
import { formatCompact } from '../../utils/format';

interface MiniChartProps {
  data: DataPoint[];
  color?: string;
  height?: number;
}

/**
 * Compact sparkline chart for inline display.
 * Used in overview cards and comparison summaries.
 */
export function MiniChart({ data, color = '#3b82f6', height = 40 }: MiniChartProps) {
  if (data.length === 0) return null;

  // Aggregate by year
  const yearMap = new Map<number, number>();
  for (const d of data) {
    yearMap.set(d.year, (yearMap.get(d.year) || 0) + d.value);
  }

  const chartData = [...yearMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, value]) => ({ year: String(year), value }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <Tooltip
          formatter={(value: number) => formatCompact(value)}
          labelFormatter={(label) => `Jaar ${label}`}
          contentStyle={{ fontSize: 11, padding: '4px 8px' }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
