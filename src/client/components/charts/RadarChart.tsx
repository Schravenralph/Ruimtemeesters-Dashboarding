import {
  RadarChart as RechartsRadar,
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { DataPoint } from '@shared/api/contracts';

interface RadarChartProps {
  data: DataPoint[];
  colors?: string[];
}

const DEFAULT_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];

export function RadarChartComponent({ data, colors = DEFAULT_COLORS }: RadarChartProps) {
  // Group by geoName or year for comparison, with dimensionValues as axes
  const dimensionValues = [...new Set(data.map(d => d.dimensionValue).filter((v): v is string => !!v))];
  const groups = [...new Set(data.map(d => d.geoName || String(d.year)))];

  const chartData = dimensionValues.map(dimVal => {
    const entry: Record<string, string | number> = { subject: dimVal };
    for (const group of groups) {
      const point = data.find(d =>
        d.dimensionValue === dimVal &&
        (d.geoName || String(d.year)) === group
      );
      entry[group] = point?.value || 0;
    }
    return entry;
  });

  // Normalize values for radar display
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const normalizedData = chartData.map(entry => {
    const normalized: Record<string, string | number> = { subject: entry.subject };
    for (const group of groups) {
      normalized[group] = Math.round(((entry[group] as number) / maxValue) * 100);
    }
    return normalized;
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsRadar data={normalizedData}>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
        <PolarRadiusAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
        <Tooltip />
        <Legend />
        {groups.map((group, i) => (
          <Radar
            key={group}
            name={group}
            dataKey={group}
            stroke={colors[i % colors.length]}
            fill={colors[i % colors.length]}
            fillOpacity={0.2}
          />
        ))}
      </RechartsRadar>
    </ResponsiveContainer>
  );
}
