import { useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFilters } from '../contexts/FilterContext';
import type { GeoLevel } from '@shared/api/contracts';

/**
 * Sync filter state with URL search params.
 * Allows bookmarkable/shareable filter states.
 */
export function useUrlState() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    filters,
    setGeoLevel,
    setGeoCode,
    setYear,
    setCompareYear,
    setComparisonEnabled,
  } = useFilters();

  // Read URL params into filter state on mount
  useEffect(() => {
    const geoLevel = searchParams.get('geoLevel');
    const geoCode = searchParams.get('geoCode');
    const year = searchParams.get('year');
    const compareYear = searchParams.get('compareYear');

    if (geoLevel) setGeoLevel(geoLevel as GeoLevel);
    if (geoCode) setGeoCode(geoCode);
    if (year) setYear(parseInt(year, 10));
    if (compareYear) {
      setCompareYear(parseInt(compareYear, 10));
      setComparisonEnabled(true);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Write filter state to URL params
  const syncToUrl = useCallback(() => {
    const params = new URLSearchParams();

    if (filters.geoLevel !== 'land') params.set('geoLevel', filters.geoLevel);
    if (filters.geoCode !== 'NL') params.set('geoCode', filters.geoCode);
    if (filters.period.year !== 2024) params.set('year', String(filters.period.year));
    if (filters.period.compareYear) params.set('compareYear', String(filters.period.compareYear));

    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  return { syncToUrl };
}
