import { ArrowUp, ArrowDown, Minus, type LucideIcon } from 'lucide-react';
import { formatCompact, formatPercent } from '../../utils/format';

interface KPICardProps {
  title: string;
  value: number;
  previousValue?: number;
  icon?: LucideIcon;
  iconColor?: string;
  unit?: string;
  invertColors?: boolean; // true = decrease is good (e.g., housing shortage)
}

export function KPICard({
  title,
  value,
  previousValue,
  icon: Icon,
  iconColor = '#3b82f6',
  unit,
  invertColors = false,
}: KPICardProps) {
  const change = previousValue !== undefined && previousValue > 0
    ? ((value - previousValue) / previousValue) * 100
    : null;

  const isPositive = change !== null && change > 0;
  const isNegative = change !== null && change < 0;

  // Determine if change is "good" or "bad"
  const isGood = invertColors ? isNegative : isPositive;
  const isBad = invertColors ? isPositive : isNegative;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatCompact(value)}
            {unit && <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>}
          </p>
        </div>
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${iconColor}15` }}>
            <Icon className="h-5 w-5" style={{ color: iconColor }} />
          </div>
        )}
      </div>

      {change !== null && (
        <div className={`flex items-center gap-1.5 mt-3 text-sm ${
          isGood ? 'text-green-600' : isBad ? 'text-red-600' : 'text-gray-500'
        }`}>
          {isPositive ? (
            <ArrowUp className="h-4 w-4" />
          ) : isNegative ? (
            <ArrowDown className="h-4 w-4" />
          ) : (
            <Minus className="h-4 w-4" />
          )}
          <span className="font-medium">{formatPercent(change)}</span>
          {previousValue !== undefined && (
            <span className="text-xs text-gray-400">
              (was {formatCompact(previousValue)})
            </span>
          )}
        </div>
      )}
    </div>
  );
}
