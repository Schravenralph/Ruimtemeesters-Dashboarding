import {
  BarChart as RechartsBar,
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { DataPoint } from '@shared/api/contracts';

interface BarChartProps {
  data: DataPoint[];
  title?: string;
  stacked?: boolean;
  colors?: string[];
}

const DEFAULT_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

export function BarChartComponent({ data, stacked = false, colors = DEFAULT_COLORS }: BarChartProps) {
  // Group data by dimensionValue to create multi-bar series
  const dimensionValues = [...new Set(data.map(d => d.dimensionValue).filter((v): v is string => !!v))];

  if (dimensionValues.length === 0) {
    // Simple bar chart: one bar per data point
    const chartData = data.map(d => ({
      name: d.geoName || d.label || d.geoCode,
      value: d.value,
    }));

    return (
      <ResponsiveContainer width="100%" height={300}>
        <RechartsBar data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={formatNumber} />
          <Tooltip formatter={(value: number) => formatNumber(value)} />
          <Bar dataKey="value" fill={colors[0]} radius={[4, 4, 0, 0]} />
        </RechartsBar>
      </ResponsiveContainer>
    );
  }

  // Multi-bar: group by label (year/geoName), bars per dimension value
  const labels = [...new Set(data.map(d => d.label || d.geoName || String(d.year)))];
  const chartData = labels.map(label => {
    const entry: Record<string, string | number> = { name: label };
    for (const dimVal of dimensionValues) {
      const point = data.find(d =>
        (d.label || d.geoName || String(d.year)) === label &&
        d.dimensionValue === dimVal
      );
      entry[dimVal] = point?.value || 0;
    }
    return entry;
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsBar data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={formatNumber} />
        <Tooltip formatter={(value: number) => formatNumber(value)} />
        <Legend />
        {dimensionValues.map((dimVal, i) => (
          <Bar
            key={dimVal}
            dataKey={dimVal}
            fill={colors[i % colors.length]}
            stackId={stacked ? 'stack' : undefined}
            radius={stacked ? undefined : [4, 4, 0, 0]}
          />
        ))}
      </RechartsBar>
    </ResponsiveContainer>
  );
}

function formatNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return String(value);
}
