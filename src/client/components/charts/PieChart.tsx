import {
  PieChart as RechartsPie,
  Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { DataPoint } from '@shared/api/contracts';

interface PieChartProps {
  data: DataPoint[];
  colors?: string[];
}

const DEFAULT_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

export function PieChartComponent({ data, colors = DEFAULT_COLORS }: PieChartProps) {
  // Aggregate by dimensionValue
  const aggregated = new Map<string, number>();
  for (const d of data) {
    const key = d.dimensionValue || d.geoName || d.label || 'Unknown';
    aggregated.set(key, (aggregated.get(key) || 0) + d.value);
  }

  const chartData = Array.from(aggregated.entries()).map(([name, value]) => ({
    name,
    value,
  }));

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsPie>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          dataKey="value"
          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
          labelLine={{ strokeWidth: 1 }}
        >
          {chartData.map((_, index) => (
            <Cell key={index} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [
            `${value.toLocaleString('nl-NL')} (${((value / total) * 100).toFixed(1)}%)`,
            'Aantal',
          ]}
        />
        <Legend />
      </RechartsPie>
    </ResponsiveContainer>
  );
}
