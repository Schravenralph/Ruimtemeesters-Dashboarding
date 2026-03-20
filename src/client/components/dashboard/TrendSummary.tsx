import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Activity } from 'lucide-react';
import { api } from '../../services/api/client';
import { useFilters } from '../../contexts/FilterContext';
import { formatCompact, formatPercent } from '../../utils/format';
import { MiniChart } from './MiniChart';

interface TrendData {
  source: string;
  geoCode: string;
  timeSeries: Array<{
    year: number;
    value: number;
    growthRate: number | null;
    absoluteChange: number | null;
  }>;
  summary: {
    cagr: number | null;
    totalGrowth: number | null;
    peakGrowthYear: number | null;
    peakGrowthRate: number | null;
    lowestGrowthYear: number | null;
    lowestGrowthRate: number | null;
    latestValue: number | null;
    earliestValue: number | null;
  };
}

interface TrendSummaryProps {
  dataSource: string;
}

export function TrendSummary({ dataSource }: TrendSummaryProps) {
  const { filters } = useFilters();
  const [trend, setTrend] = useState<TrendData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api.get<TrendData>(`/trends/${dataSource}`, { geoCode: filters.geoCode })
      .then(setTrend)
      .catch(() => setTrend(null))
      .finally(() => setIsLoading(false));
  }, [dataSource, filters.geoCode]);

  if (isLoading || !trend || trend.timeSeries.length < 2) return null;

  const { summary } = trend;
  const chartData = trend.timeSeries.map(t => ({
    geoCode: trend.geoCode,
    geoName: '',
    year: t.year,
    value: t.value,
  }));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4 text-gray-500" />
        <h4 className="text-sm font-medium text-gray-700">Trendanalyse</h4>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* CAGR */}
        {summary.cagr !== null && (
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-400">Gem. jaarlijkse groei (CAGR)</p>
            <p className={`text-lg font-bold ${summary.cagr > 0 ? 'text-green-600' : summary.cagr < 0 ? 'text-red-600' : 'text-gray-600'}`}>
              {formatPercent(summary.cagr)}
            </p>
          </div>
        )}

        {/* Total growth */}
        {summary.totalGrowth !== null && (
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-400">Totale groei</p>
            <p className={`text-lg font-bold ${summary.totalGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercent(summary.totalGrowth)}
            </p>
          </div>
        )}

        {/* Peak growth year */}
        {summary.peakGrowthYear && (
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-green-500" />
              <p className="text-xs text-gray-400">Hoogste groei</p>
            </div>
            <p className="text-lg font-bold text-gray-900">{summary.peakGrowthYear}</p>
            {summary.peakGrowthRate !== null && (
              <p className="text-xs text-green-600">{formatPercent(summary.peakGrowthRate)}</p>
            )}
          </div>
        )}

        {/* Lowest growth year */}
        {summary.lowestGrowthYear && (
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="flex items-center gap-1">
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              <p className="text-xs text-gray-400">Laagste groei</p>
            </div>
            <p className="text-lg font-bold text-gray-900">{summary.lowestGrowthYear}</p>
            {summary.lowestGrowthRate !== null && (
              <p className="text-xs text-red-600">{formatPercent(summary.lowestGrowthRate)}</p>
            )}
          </div>
        )}
      </div>

      {/* Sparkline */}
      <div className="mt-3 h-12">
        <MiniChart data={chartData} color="#3b82f6" height={48} />
      </div>
    </div>
  );
}
