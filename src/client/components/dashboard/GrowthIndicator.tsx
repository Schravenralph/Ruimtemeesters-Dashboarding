import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatCompact, formatPercent } from '../../utils/format';

interface GrowthIndicatorProps {
  currentValue: number;
  previousValue: number;
  label?: string;
  showAbsolute?: boolean;
  size?: 'sm' | 'md' | 'lg';
  invertColors?: boolean;
}

const sizeClasses = {
  sm: { value: 'text-sm', change: 'text-xs', icon: 'h-3 w-3' },
  md: { value: 'text-base', change: 'text-sm', icon: 'h-4 w-4' },
  lg: { value: 'text-lg', change: 'text-sm', icon: 'h-5 w-5' },
};

/**
 * Growth indicator showing value change between two periods.
 * Shows percentage change, absolute change, and directional icon.
 */
export function GrowthIndicator({
  currentValue,
  previousValue,
  label,
  showAbsolute = true,
  size = 'md',
  invertColors = false,
}: GrowthIndicatorProps) {
  const absoluteChange = currentValue - previousValue;
  const percentChange = previousValue !== 0 ? (absoluteChange / previousValue) * 100 : 0;

  const isPositive = absoluteChange > 0;
  const isNegative = absoluteChange < 0;
  const isNeutral = absoluteChange === 0;

  // Determine if change is "good" or "bad"
  const isGood = invertColors ? isNegative : isPositive;
  const isBad = invertColors ? isPositive : isNegative;

  const colorClass = isGood ? 'text-green-600' : isBad ? 'text-red-600' : 'text-gray-500';
  const bgClass = isGood ? 'bg-green-50' : isBad ? 'bg-red-50' : 'bg-gray-50';
  const s = sizeClasses[size];

  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  const ArrowIcon = isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <div className={`inline-flex items-center gap-2 rounded-lg ${bgClass} px-3 py-1.5`}>
      <Icon className={`${s.icon} ${colorClass}`} />
      <div>
        {label && <p className="text-xs text-gray-500">{label}</p>}
        <div className="flex items-baseline gap-1.5">
          <span className={`${s.value} font-bold text-gray-900`}>
            {formatCompact(currentValue)}
          </span>
          <span className={`${s.change} font-medium ${colorClass}`}>
            {formatPercent(percentChange)}
          </span>
          {showAbsolute && !isNeutral && (
            <span className={`${s.change} ${colorClass} opacity-75`}>
              ({isPositive ? '+' : ''}{formatCompact(absoluteChange)})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
