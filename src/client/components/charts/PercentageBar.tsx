import type { DataPoint } from '@shared/api/contracts';
import { dimensionValueLabel, formatNumber } from '../../utils/format';

interface PercentageBarProps {
  data: DataPoint[];
  colors?: string[];
}

const DEFAULT_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

/**
 * Horizontal percentage bar showing distribution of dimension values.
 * Useful for showing composition breakdowns (e.g., household types, tenure types).
 */
export function PercentageBar({ data, colors = DEFAULT_COLORS }: PercentageBarProps) {
  // Aggregate by dimension value
  const totals = new Map<string, number>();
  for (const d of data) {
    const key = d.dimensionValue || d.label || 'Onbekend';
    totals.set(key, (totals.get(key) || 0) + d.value);
  }

  const entries = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const grandTotal = entries.reduce((sum, [, val]) => sum + val, 0);

  if (grandTotal === 0) return null;

  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="flex h-8 rounded-lg overflow-hidden">
        {entries.map(([label, value], i) => {
          const percent = (value / grandTotal) * 100;
          if (percent < 0.5) return null;
          return (
            <div
              key={label}
              className="flex items-center justify-center text-xs font-medium text-white transition-all hover:opacity-90"
              style={{
                width: `${percent}%`,
                backgroundColor: colors[i % colors.length],
                minWidth: percent > 5 ? undefined : '2px',
              }}
              title={`${dimensionValueLabel(label)}: ${formatNumber(value)} (${percent.toFixed(1)}%)`}
            >
              {percent > 8 && `${percent.toFixed(0)}%`}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {entries.map(([label, value], i) => {
          const percent = (value / grandTotal) * 100;
          return (
            <div key={label} className="flex items-center gap-1.5 text-sm">
              <div
                className="h-3 w-3 rounded-sm shrink-0"
                style={{ backgroundColor: colors[i % colors.length] }}
              />
              <span className="text-gray-600">{dimensionValueLabel(label)}</span>
              <span className="text-gray-400 text-xs">
                {formatNumber(value)} ({percent.toFixed(1)}%)
              </span>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="text-xs text-gray-400">
        Totaal: {formatNumber(grandTotal)}
      </div>
    </div>
  );
}
