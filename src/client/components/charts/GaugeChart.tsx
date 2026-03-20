import { formatCompact } from '../../utils/format';

interface GaugeChartProps {
  value: number;
  max: number;
  label: string;
  unit?: string;
  thresholds?: { warning: number; danger: number };
}

/**
 * Gauge/donut chart for showing a single KPI value.
 * Used for housing shortage percentages, growth rates, etc.
 */
export function GaugeChart({
  value,
  max,
  label,
  unit = '',
  thresholds = { warning: 60, danger: 80 },
}: GaugeChartProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - percentage / 100);

  const color = percentage >= thresholds.danger
    ? '#ef4444'
    : percentage >= thresholds.warning
      ? '#f59e0b'
      : '#10b981';

  return (
    <div className="flex flex-col items-center py-4">
      <div className="relative" style={{ width: 160, height: 160 }}>
        <svg viewBox="0 0 160 160" className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="80" cy="80" r={radius}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth="12"
          />
          {/* Value arc */}
          <circle
            cx="80" cy="80" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">
            {formatCompact(value)}
          </span>
          {unit && <span className="text-xs text-gray-500">{unit}</span>}
        </div>
      </div>
      <p className="text-sm font-medium text-gray-700 mt-2">{label}</p>
      <p className="text-xs text-gray-400">
        {percentage.toFixed(1)}% van {formatCompact(max)}
      </p>
    </div>
  );
}
