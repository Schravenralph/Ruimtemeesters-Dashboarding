import {
  LineChart as RechartsLine,
  Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { DataPoint } from '@shared/api/contracts';

interface LineChartProps {
  data: DataPoint[];
  colors?: string[];
  comparisonData?: DataPoint[];
  comparisonLabel?: string;
}

const DEFAULT_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16',
];

export function LineChartComponent({ data, colors = DEFAULT_COLORS, comparisonData, comparisonLabel }: LineChartProps) {
  const dimensionValues = [...new Set(data.map(d => d.dimensionValue).filter((v): v is string => !!v))];

  if (dimensionValues.length === 0) {
    // Simple line chart — split actuals from prognose
    const isPrognose = (d: DataPoint) => d.source === 'cbs_prognose' || d.source === 'ruimtemeesters_prognose';
    const hasPrognose = data.some(isPrognose);

    const chartData = data.map(d => ({
      name: String(d.year),
      actuals: !isPrognose(d) ? d.value : undefined,
      prognose: isPrognose(d) ? d.value : undefined,
      value: d.value, // fallback for non-source data
    }));

    // Add bridge point: last actual year also appears in prognose series for continuity
    if (hasPrognose) {
      const lastActual = chartData.filter(d => d.actuals !== undefined).pop();
      if (lastActual) {
        const bridgeIdx = chartData.findIndex(d => d.name === lastActual.name);
        if (bridgeIdx >= 0) chartData[bridgeIdx].prognose = lastActual.actuals;
      }
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <RechartsLine data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={formatNumber} />
          <Tooltip formatter={(value: number) => formatNumber(value)} />
          {hasPrognose ? (
            <>
              <Line type="monotone" dataKey="actuals" name="Actueel" stroke={colors[0]} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
              <Line type="monotone" dataKey="prognose" name="Prognose" stroke={colors[0]} strokeWidth={2} strokeDasharray="6 3" dot={{ r: 2 }} connectNulls={false} />
              <Legend />
            </>
          ) : (
            <Line type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={2} dot={{ r: 3 }} />
          )}
          {comparisonData && comparisonData.length > 0 && (
            <ReferenceLine y={comparisonData.reduce((sum, d) => sum + d.value, 0) / comparisonData.length} stroke="#ef4444" strokeDasharray="8 4" label={{ value: comparisonLabel || 'Vergelijking', position: 'right', fontSize: 11, fill: '#ef4444' }} />
          )}
        </RechartsLine>
      </ResponsiveContainer>
    );
  }

  // Multi-line: one line per dimension value, x-axis = year
  const years = [...new Set(data.map(d => d.year))].sort();
  const chartData = years.map(year => {
    const entry: Record<string, string | number> = { name: String(year) };
    for (const dimVal of dimensionValues) {
      const point = data.find(d => d.year === year && d.dimensionValue === dimVal);
      entry[dimVal] = point?.value || 0;
    }
    return entry;
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsLine data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={formatNumber} />
        <Tooltip formatter={(value: number) => formatNumber(value)} />
        <Legend />
        {dimensionValues.map((dimVal, i) => (
          <Line
            key={dimVal}
            type="monotone"
            dataKey={dimVal}
            stroke={colors[i % colors.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        ))}
      </RechartsLine>
    </ResponsiveContainer>
  );
}

function formatNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return String(value);
}
