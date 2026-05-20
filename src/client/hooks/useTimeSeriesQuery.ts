import { useState, useEffect, useCallback } from 'react';
import { queryTimeSeries } from '../services/api/data';
import { useFilters } from '../contexts/FilterContext';
import type { DataPoint } from '@shared/api/contracts';

interface UseTimeSeriesOptions {
  source: string;
  dimension?: string;
  dimensionValue?: string;
  enabled?: boolean;
}

interface UseTimeSeriesResult {
  data: DataPoint[];
  isLoading: boolean;
  error: string | null;
  /** Force a re-fetch (#151). The hook already refetches when its inputs change;
   * this lets the tile chrome trigger a refresh on demand. */
  refetch: () => void;
}

/**
 * Fetch full time series (all years) for a given geo area + dimension.
 * Includes both actuals and prognose data, suitable for LineChart rendering.
 */
export function useTimeSeriesQuery({ source, dimension, dimensionValue, enabled = true }: UseTimeSeriesOptions): UseTimeSeriesResult {
  const { filters } = useFilters();
  const [data, setData] = useState<DataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || !filters.geoCode) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await queryTimeSeries({
        source,
        geoCode: filters.geoCode,
        dimension,
        dimensionValue,
      });

      // Map to DataPoint format (include confidence intervals for prognose rendering)
      // When no dimension is specified (grand total), leave dimensionValue undefined
      // so LineChartComponent uses the simple line path with prognose features.
      const points: DataPoint[] = response.data.map(d => ({
        geoCode: filters.geoCode,
        geoName: '',
        year: d.year,
        value: d.value,
        source: d.source,
        // When the caller specified a dimension but not a value, prefer the
        // per-row dimension value the API returns; multi-line charts rely
        // on this to draw one line per dimension value instead of collapsing
        // everything to "totaal".
        ...(dimension
          ? { dimension, dimensionValue: dimensionValue || d.dimensionValue || 'totaal' }
          : {}),
        ...(d.confidenceLower != null ? { confidenceLower: d.confidenceLower } : {}),
        ...(d.confidenceUpper != null ? { confidenceUpper: d.confidenceUpper } : {}),
      }));

      setData(points);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch time series');
    } finally {
      setIsLoading(false);
    }
  }, [source, filters.geoCode, dimension, dimensionValue, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
