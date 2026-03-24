import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { api } from '../../services/api/client';
import { useFilters } from '../../contexts/FilterContext';
import { useTimeSeriesQuery } from '../../hooks/useTimeSeriesQuery';
import { formatCompact, formatPercent } from '../../utils/format';
import { LineChartComponent } from '../charts/LineChart';
import { Spinner } from '../ui/Spinner';

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

  // Fetch full time series (actuals + prognose) for the line chart
  const { data: timeSeriesData, isLoading: tsLoading } = useTimeSeriesQuery({
    source: dataSource,
    dimension: 'age_group',
    dimensionValue: 'totaal',
  });

  useEffect(() => {
    setIsLoading(true);
    api.get<TrendData>(`/trends/${dataSource}`, { geoCode: filters.geoCode })
      .then(setTrend)
      .catch(() => setTrend(null))
      .finally(() => setIsLoading(false));
  }, [dataSource, filters.geoCode]);

  if (isLoading || !trend || trend.timeSeries.length < 2) return null;

  const { summary } = trend;

  // Use time series data if available (includes prognose), fallback to trend data
  const hasPrognose = timeSeriesData.some(d => d.source === 'cbs_prognose' || d.source === 'ruimtemeesters_prognose');
  const chartData = hasPrognose ? timeSeriesData : trend.timeSeries.map(t => ({
    geoCode: trend.geoCode,
    geoName: '',
    year: t.year,
    value: t.value,
    source: 'cbs_actuals',
  }));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-gray-500" />
          <h4 className="text-sm font-medium text-gray-700">Trendanalyse</h4>
        </div>
        {hasPrognose && (
          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
            incl. prognose
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summary.cagr !== null && (
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-400">Gem. jaarlijkse groei (CAGR)</p>
            <p className={`text-lg font-bold ${summary.cagr > 0 ? 'text-green-600' : summary.cagr < 0 ? 'text-red-600' : 'text-gray-600'}`}>
              {formatPercent(summary.cagr)}
            </p>
          </div>
        )}

        {summary.totalGrowth !== null && (
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-400">Totale groei</p>
            <p className={`text-lg font-bold ${summary.totalGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercent(summary.totalGrowth)}
            </p>
          </div>
        )}

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

      {/* Line chart with actuals + prognose */}
      <div className="mt-4">
        {tsLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <Spinner size="md" />
          </div>
        ) : (
          <LineChartComponent data={chartData} />
        )}
      </div>
    </div>
  );
}
