import { BarChart3, MapPin, Calendar, Database } from 'lucide-react';
import { formatNumber } from '../../utils/format';

interface DashboardStatsProps {
  tileCount: number;
  geoAreaCount?: number;
  yearRange?: [number, number];
  dataSource?: string;
}

/**
 * Mini stats bar showing key dashboard metrics.
 * Displayed below the dashboard title.
 */
export function DashboardStats({ tileCount, geoAreaCount, yearRange, dataSource }: DashboardStatsProps) {
  return (
    <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
      <div className="flex items-center gap-1">
        <BarChart3 className="h-3.5 w-3.5" />
        <span>{tileCount} tegels</span>
      </div>
      {geoAreaCount !== undefined && (
        <div className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          <span>{formatNumber(geoAreaCount)} gebieden</span>
        </div>
      )}
      {yearRange && (
        <div className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          <span>{yearRange[0]} – {yearRange[1]}</span>
        </div>
      )}
      {dataSource && (
        <div className="flex items-center gap-1">
          <Database className="h-3.5 w-3.5" />
          <span className="capitalize">{dataSource}</span>
        </div>
      )}
    </div>
  );
}
