import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { DataPoint } from '@shared/api/contracts';
import { formatNumber, formatCompact, dimensionValueLabel } from '../../utils/format';
import { PALETTE } from '../../utils/chartColors';

interface DonutChartProps {
  data: DataPoint[];
  centerLabel?: string;
  colors?: string[];
}

/**
 * Donut chart showing distribution with a center metric.
 * More compact than the full PieChart — good for dashboard tiles.
 */
export function DonutChartComponent({
  data,
  centerLabel,
  colors = [...PALETTE.primary],
}: DonutChartProps) {
  // Aggregate by dimension value
  const aggregated = new Map<string, number>();
  for (const d of data) {
    const key = d.dimensionValue || d.geoName || 'Onbekend';
    aggregated.set(key, (aggregated.get(key) || 0) + d.value);
  }

  const chartData = [...aggregated.entries()]
    .map(([name, value]) => ({ name: dimensionValueLabel(name), value }))
    .sort((a, b) => b.value - a.value);

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  if (chartData.length === 0) return null;

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            dataKey="value"
            paddingAngle={2}
          >
            {chartData.map((_, index) => (
              <Cell
                key={index}
                fill={colors[index % colors.length]}
                stroke="white"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [
              `${formatNumber(value)} (${((value / total) * 100).toFixed(1)}%)`,
            ]}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Center label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <p className="text-xl font-bold text-gray-900">{formatCompact(total)}</p>
          <p className="text-xs text-gray-500">{centerLabel || 'Totaal'}</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
        {chartData.slice(0, 6).map((item, i) => (
          <div key={item.name} className="flex items-center gap-1 text-xs">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="text-gray-600">{item.name}</span>
          </div>
        ))}
        {chartData.length > 6 && (
          <span className="text-xs text-gray-400">+{chartData.length - 6} meer</span>
        )}
      </div>
    </div>
  );
}
