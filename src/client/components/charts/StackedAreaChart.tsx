import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { DataPoint } from '@shared/api/contracts';

interface StackedAreaChartProps {
  data: DataPoint[];
  colors?: string[];
}

const DEFAULT_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16',
];

export function StackedAreaChartComponent({ data, colors = DEFAULT_COLORS }: StackedAreaChartProps) {
  const dimensionValues = [...new Set(data.map(d => d.dimensionValue).filter((v): v is string => !!v))];
  const years = [...new Set(data.map(d => d.year))].sort();

  const chartData = years.map(year => {
    const entry: Record<string, string | number> = { name: String(year) };
    for (const dimVal of dimensionValues) {
      const point = data.find(d => d.year === year && d.dimensionValue === dimVal);
      entry[dimVal] = point?.value || 0;
    }
    return entry;
  });

  if (dimensionValues.length === 0) {
    // Simple area chart
    const simpleData = data.map(d => ({
      name: String(d.year),
      value: d.value,
    }));

    return (
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={simpleData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Area type="monotone" dataKey="value" fill={colors[0]} stroke={colors[0]} fillOpacity={0.3} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        {dimensionValues.map((dimVal, i) => (
          <Area
            key={dimVal}
            type="monotone"
            dataKey={dimVal}
            stackId="1"
            fill={colors[i % colors.length]}
            stroke={colors[i % colors.length]}
            fillOpacity={0.6}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
