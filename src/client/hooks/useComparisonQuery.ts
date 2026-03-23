import { useDataQuery } from './useDataQuery';
import { useFilters } from '../contexts/FilterContext';

/**
 * Hook that fetches comparison data for the vergelijkingsniveau feature.
 * Returns data for the comparison area (e.g., province or national level)
 * when comparison is enabled in the filter state.
 */
export function useComparisonQuery(source: string, dimension?: string) {
  const { filters } = useFilters();

  return useDataQuery({
    source,
    dimension,
    enabled: !!filters.comparisonLevel && !!filters.comparisonGeoCode,
    geoCodeOverride: filters.comparisonGeoCode || undefined,
  });
}
