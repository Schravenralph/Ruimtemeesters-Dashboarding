import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { DataPoint } from '@shared/api/contracts';
import { formatCompact } from '../../utils/format';

interface ComboChartProps {
  data: DataPoint[];
  barDimension?: string;
  lineDimension?: string;
}

/**
 * Combo chart combining bars and lines.
 * Useful for showing volume (bars) and rates (line) together.
 */
export function ComboChartComponent({ data, barDimension, lineDimension }: ComboChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">Geen data beschikbaar</p>;
  }

  const dimensions = [...new Set(data.map(d => d.dimensionValue).filter(Boolean))] as string[];
  const years = [...new Set(data.map(d => d.year))].sort();

  const barDim = barDimension || dimensions[0];
  const lineDim = lineDimension || dimensions[1];

  const chartData = years.map(year => {
    const entry: Record<string, string | number> = { name: String(year) };

    if (barDim) {
      const barPoints = data.filter(d => d.year === year && d.dimensionValue === barDim);
      entry[barDim] = barPoints.reduce((sum, d) => sum + d.value, 0);
    }

    if (lineDim) {
      const linePoints = data.filter(d => d.year === year && d.dimensionValue === lineDim);
      entry[lineDim] = linePoints.reduce((sum, d) => sum + d.value, 0);
    }

    // Total for simple data
    if (!barDim && !lineDim) {
      entry.value = data.filter(d => d.year === year).reduce((sum, d) => sum + d.value, 0);
    }

    return entry;
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => formatCompact(v)} />
        <Tooltip formatter={(v: number) => formatCompact(v)} />
        <Legend />
        {barDim && (
          <Bar dataKey={barDim} fill="#3b82f6" radius={[4, 4, 0, 0]} />
        )}
        {lineDim && (
          <Line type="monotone" dataKey={lineDim} stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
        )}
        {!barDim && !lineDim && (
          <>
            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </>
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
