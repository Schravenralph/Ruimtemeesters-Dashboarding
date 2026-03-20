import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { DataPoint } from '@shared/api/contracts';
import { formatCompact } from '../../utils/format';

interface WaterfallChartProps {
  data: DataPoint[];
}

/**
 * Waterfall chart showing cumulative changes.
 * Useful for showing contributions to a total (e.g., population components of change).
 */
export function WaterfallChartComponent({ data }: WaterfallChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">Geen data beschikbaar</p>;
  }

  // Build waterfall data
  let cumulative = 0;
  const chartData = data.map(d => {
    const start = cumulative;
    cumulative += d.value;
    return {
      name: d.dimensionValue || d.geoName || d.label || String(d.year),
      value: d.value,
      start,
      end: cumulative,
      isPositive: d.value >= 0,
    };
  });

  // Add total bar
  chartData.push({
    name: 'Totaal',
    value: cumulative,
    start: 0,
    end: cumulative,
    isPositive: cumulative >= 0,
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatCompact(v)} />
        <Tooltip
          formatter={(value: number) => formatCompact(value)}
          labelFormatter={(label) => String(label)}
        />
        <ReferenceLine y={0} stroke="#9ca3af" />
        {/* Invisible base bar */}
        <Bar dataKey="start" stackId="stack" fill="transparent" />
        {/* Visible value bar */}
        <Bar dataKey="value" stackId="stack" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell
              key={index}
              fill={
                entry.name === 'Totaal'
                  ? '#3b82f6'
                  : entry.isPositive
                    ? '#10b981'
                    : '#ef4444'
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
