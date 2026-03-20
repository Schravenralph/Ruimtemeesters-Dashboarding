import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { DataPoint } from '@shared/api/contracts';
import { formatCompact } from '../../utils/format';

interface QuickStatsProps {
  data: DataPoint[];
  title: string;
}

export function QuickStats({ data, title }: QuickStatsProps) {
  if (data.length === 0) return null;

  // Calculate summary stats
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const avg = Math.round(total / data.length);
  const max = Math.max(...data.map(d => d.value));
  const min = Math.min(...data.map(d => d.value));

  // Find the highest and lowest areas
  const maxPoint = data.find(d => d.value === max);
  const minPoint = data.find(d => d.value === min);

  return (
    <div className="flex gap-4 text-sm">
      <div className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-1.5">
        <span className="text-gray-500">Totaal:</span>
        <span className="font-semibold text-gray-900">{formatCompact(total)}</span>
      </div>
      <div className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-1.5">
        <span className="text-gray-500">Gem.:</span>
        <span className="font-semibold text-gray-900">{formatCompact(avg)}</span>
      </div>
      {maxPoint && (
        <div className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-green-600" />
          <span className="text-gray-500">{maxPoint.geoName}:</span>
          <span className="font-semibold text-green-700">{formatCompact(max)}</span>
        </div>
      )}
      {minPoint && (
        <div className="flex items-center gap-1.5 rounded-lg bg-orange-50 px-3 py-1.5">
          <TrendingDown className="h-3.5 w-3.5 text-orange-600" />
          <span className="text-gray-500">{minPoint.geoName}:</span>
          <span className="font-semibold text-orange-700">{formatCompact(min)}</span>
        </div>
      )}
    </div>
  );
}
