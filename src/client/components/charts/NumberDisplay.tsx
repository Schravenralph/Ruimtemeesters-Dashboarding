import { formatNumber, formatCompact, formatPercent } from '../../utils/format';

interface NumberDisplayProps {
  value: number;
  previousValue?: number;
  label: string;
  format?: 'number' | 'compact' | 'percent';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
}

const sizeClasses = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl',
  xl: 'text-4xl',
};

/**
 * Large number display for key metrics.
 * Used in summary tiles and KPI dashboards.
 */
export function NumberDisplay({
  value,
  previousValue,
  label,
  format = 'compact',
  size = 'lg',
  color,
}: NumberDisplayProps) {
  const formatValue = (v: number) => {
    switch (format) {
      case 'number': return formatNumber(v);
      case 'compact': return formatCompact(v);
      case 'percent': return `${v.toFixed(1)}%`;
    }
  };

  const change = previousValue !== undefined && previousValue > 0
    ? ((value - previousValue) / previousValue) * 100
    : null;

  return (
    <div className="text-center py-4">
      <p
        className={`font-bold ${sizeClasses[size]} tabular-nums`}
        style={{ color: color || '#111827' }}
      >
        {formatValue(value)}
      </p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
      {change !== null && (
        <p className={`text-sm mt-1.5 font-medium ${
          change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500'
        }`}>
          {formatPercent(change)} t.o.v. vorige periode
        </p>
      )}
    </div>
  );
}
