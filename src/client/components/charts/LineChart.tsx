import {
  ComposedChart,
  Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, ReferenceArea,
} from 'recharts';
import type { DataPoint } from '@shared/api/contracts';
import { isPrognoseSource } from '../../utils/prognose';

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
    const isPrognose = (d: DataPoint) => isPrognoseSource(d.source);
    const hasPrognose = data.some(isPrognose);
    const hasConfidence = data.some(d => d.confidenceLower != null);

    // Find the transition year (last year with actuals)
    const actualYears = data.filter(d => !isPrognose(d)).map(d => d.year);
    const transitionYear = actualYears.length > 0 ? Math.max(...actualYears) : null;
    const prognoseYears = data.filter(isPrognose).map(d => d.year);
    const lastPrognoseYear = prognoseYears.length > 0 ? Math.max(...prognoseYears) : null;

    const chartData = data.map(d => ({
      name: String(d.year),
      actuals: !isPrognose(d) ? d.value : undefined,
      prognose: isPrognose(d) ? d.value : undefined,
      value: d.value,
      ...(d.confidenceLower != null && d.confidenceUpper != null
        ? { confidenceBand: [d.confidenceLower, d.confidenceUpper] }
        : {}),
    }));

    // Add bridge point: last actual year also appears in prognose series for continuity
    if (hasPrognose && transitionYear) {
      const bridgeIdx = chartData.findIndex(d => d.name === String(transitionYear));
      if (bridgeIdx >= 0 && chartData[bridgeIdx].actuals !== undefined) {
        chartData[bridgeIdx].prognose = chartData[bridgeIdx].actuals;
      }
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={formatNumber} />
          <Tooltip
            formatter={(value: number | number[], name: string) => {
              if (Array.isArray(value)) return [`${formatNumber(value[0])} – ${formatNumber(value[1])}`, name];
              return [formatNumber(value), name];
            }}
            labelFormatter={(label) => {
              const yr = parseInt(label);
              if (transitionYear && yr > transitionYear) return `${label} (prognose)`;
              return label;
            }}
          />
          {/* Shaded prognose zone background */}
          {hasPrognose && transitionYear && lastPrognoseYear && (
            <ReferenceArea
              x1={String(transitionYear)}
              x2={String(lastPrognoseYear)}
              fill="#8b5cf6"
              fillOpacity={0.04}
              strokeOpacity={0}
            />
          )}
          {/* Vertical divider line at transition year */}
          {hasPrognose && transitionYear && (
            <ReferenceLine
              x={String(transitionYear)}
              stroke="#8b5cf6"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: 'Prognose →', position: 'insideTopRight', fontSize: 11, fill: '#7c3aed', fontWeight: 600 }}
            />
          )}
          {/* Confidence band */}
          {hasConfidence && (
            <Area type="monotone" dataKey="confidenceBand" name="95% betrouwbaarheid" fill="#8b5cf6" fillOpacity={0.12} stroke="none" />
          )}
          {hasPrognose ? (
            <>
              <Line type="monotone" dataKey="actuals" name="Actueel (CBS)" stroke={colors[0]} strokeWidth={2.5} dot={{ r: 2, strokeWidth: 0 }} connectNulls={false} />
              <Line type="monotone" dataKey="prognose" name="Prognose (TSA)" stroke="#8b5cf6" strokeWidth={2.5} strokeDasharray="6 3" dot={{ r: 2, fill: '#8b5cf6', strokeWidth: 0 }} connectNulls={false} />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                formatter={(value: string) => <span style={{ color: '#374151' }}>{value}</span>}
              />
            </>
          ) : (
            <Line type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={2} dot={{ r: 3 }} />
          )}
          {comparisonData && comparisonData.length > 0 && (
            <ReferenceLine y={comparisonData.reduce((sum, d) => sum + d.value, 0) / comparisonData.length} stroke="#ef4444" strokeDasharray="8 4" label={{ value: comparisonLabel || 'Vergelijking', position: 'right', fontSize: 11, fill: '#ef4444' }} />
          )}
        </ComposedChart>
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
      <ComposedChart data={chartData}>
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
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function formatNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return String(value);
}
