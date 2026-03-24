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

      // Map to DataPoint format
      const points: DataPoint[] = response.data.map(d => ({
        geoCode: filters.geoCode,
        geoName: '',
        year: d.year,
        value: d.value,
        source: d.source,
        dimension: dimension || 'age_group',
        dimensionValue: dimensionValue || 'totaal',
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

  return { data, isLoading, error };
}
