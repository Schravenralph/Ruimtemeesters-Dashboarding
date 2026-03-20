import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { DataPoint } from '@shared/api/contracts';
import { formatCompact } from '../../utils/format';
import { PALETTE } from '../../utils/chartColors';

interface BubbleChartProps {
  data: DataPoint[];
}

/**
 * Bubble chart for three-dimensional data visualization.
 * X = year, Y = value, Z (bubble size) = another metric.
 */
export function BubbleChartComponent({ data }: BubbleChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">Geen data beschikbaar</p>;
  }

  // Group by geo area
  const areas = [...new Set(data.map(d => d.geoName))];

  const scatterData = areas.slice(0, 10).map((area, idx) => {
    const areaData = data.filter(d => d.geoName === area);
    return {
      name: area,
      data: areaData.map(d => ({
        x: d.year,
        y: d.value,
        z: Math.max(1, d.value / 1000), // Bubble size
        name: area,
      })),
      color: PALETTE.primary[idx % PALETTE.primary.length],
    };
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart margin={{ top: 10, right: 30, bottom: 10, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis type="number" dataKey="x" name="Jaar" tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
        <YAxis type="number" dataKey="y" name="Waarde" tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatCompact(v)} />
        <ZAxis type="number" dataKey="z" range={[20, 200]} />
        <Tooltip
          formatter={(value: number, name: string) => [formatCompact(value), name]}
          labelFormatter={(label) => `Jaar: ${label}`}
        />
        <Legend />
        {scatterData.map(series => (
          <Scatter
            key={series.name}
            name={series.name}
            data={series.data}
            fill={series.color}
            fillOpacity={0.6}
          />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );
}
