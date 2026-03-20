import type { DataPoint } from '@shared/api/contracts';
import { formatCompact, dimensionValueLabel } from '../../utils/format';
import { PALETTE } from '../../utils/chartColors';

interface TreemapChartProps {
  data: DataPoint[];
  colors?: readonly string[];
}

/**
 * Treemap visualization showing proportional areas.
 * Useful for showing the composition of a total (e.g., population by age group).
 */
export function TreemapChartComponent({ data, colors = PALETTE.primary }: TreemapChartProps) {
  // Aggregate by dimension value
  const aggregated = new Map<string, number>();
  for (const d of data) {
    const key = d.dimensionValue || d.geoName || 'Onbekend';
    aggregated.set(key, (aggregated.get(key) || 0) + d.value);
  }

  const items = [...aggregated.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const total = items.reduce((sum, item) => sum + item.value, 0);

  if (items.length === 0 || total === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">Geen data beschikbaar</p>;
  }

  return (
    <div className="space-y-2">
      {/* Treemap layout */}
      <div className="flex flex-wrap gap-1" style={{ height: 200 }}>
        {items.map((item, i) => {
          const percent = (item.value / total) * 100;
          if (percent < 0.5) return null;

          return (
            <div
              key={item.label}
              className="rounded-lg flex items-center justify-center p-2 text-white overflow-hidden transition-all hover:opacity-90 cursor-default"
              style={{
                backgroundColor: colors[i % colors.length],
                flexBasis: `${Math.max(percent, 5)}%`,
                flexGrow: percent > 20 ? 2 : 1,
                minWidth: percent > 10 ? '80px' : '40px',
              }}
              title={`${dimensionValueLabel(item.label)}: ${formatCompact(item.value)} (${percent.toFixed(1)}%)`}
            >
              <div className="text-center min-w-0">
                {percent > 8 && (
                  <p className="text-xs font-medium truncate">{dimensionValueLabel(item.label)}</p>
                )}
                {percent > 15 && (
                  <p className="text-sm font-bold">{formatCompact(item.value)}</p>
                )}
                {percent > 5 && percent <= 15 && (
                  <p className="text-xs font-bold">{percent.toFixed(0)}%</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend for small items */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {items.map((item, i) => (
          <div key={item.label} className="flex items-center gap-1 text-xs">
            <div
              className="h-2.5 w-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: colors[i % colors.length] }}
            />
            <span className="text-gray-600">{dimensionValueLabel(item.label)}</span>
            <span className="text-gray-400">{((item.value / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
