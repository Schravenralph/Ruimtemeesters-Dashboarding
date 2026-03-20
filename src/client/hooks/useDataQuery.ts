import { useState, useEffect, useCallback } from 'react';
import { queryData } from '../services/api/data';
import type { DataPoint } from '@shared/api/contracts';
import { useFilters } from '../contexts/FilterContext';

interface UseDataQueryOptions {
  source: string;
  dimension?: string;
  dimensionValue?: string;
  enabled?: boolean;
}

interface UseDataQueryResult {
  data: DataPoint[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDataQuery({ source, dimension, dimensionValue, enabled = true }: UseDataQueryOptions): UseDataQueryResult {
  const { filters } = useFilters();
  const [data, setData] = useState<DataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await queryData({
        source,
        geoLevel: filters.geoLevel,
        geoCode: filters.geoCode,
        year: filters.period.year,
        dimension,
        dimensionValue,
      });
      setData(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, [source, filters.geoLevel, filters.geoCode, filters.period.year, dimension, dimensionValue, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
