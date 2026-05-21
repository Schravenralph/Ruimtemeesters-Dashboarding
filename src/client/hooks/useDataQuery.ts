import { useState, useEffect, useCallback } from 'react';
import { queryData } from '../services/api/data';
import type { DataPoint, ReferenceSeries } from '@shared/api/contracts';
import { useFilters } from '../contexts/FilterContext';
import { usePresentations } from '../contexts/PresentationContext';
import { blockToArray } from '../utils/referenceSeries';

interface UseDataQueryOptions {
  source: string;
  dimension?: string;
  dimensionValue?: string;
  enabled?: boolean;
  geoCodeOverride?: string;     // Override filters.geoCode (for comparison queries)
  /**
   * SPEC-B: when true, requests cohort/provincie/land reference aggregates
   * based on the active presentation's referenceVisibility. Default true so
   * Tier-1 charts get refs without explicit opt-in.
   */
  withReferences?: boolean;
}

interface UseDataQueryResult {
  data: DataPoint[];
  references: ReferenceSeries[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDataQuery({
  source,
  dimension,
  dimensionValue,
  enabled = true,
  geoCodeOverride,
  withReferences = true,
}: UseDataQueryOptions): UseDataQueryResult {
  const { filters } = useFilters();
  const { activePresentation } = usePresentations();
  const [data, setData] = useState<DataPoint[]>([]);
  const [references, setReferences] = useState<ReferenceSeries[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveGeoCode = geoCodeOverride ?? filters.geoCode;
  const refVis = activePresentation?.referenceVisibility;

  // Build references query param from referenceVisibility, omitting unrequested kinds.
  // Only meaningful when the focal is a gemeente (cohort + provincie are gemeente-scoped);
  // 'land' would technically work for any focal, but we keep the simpler "all-or-nothing if not gemeente"
  // rule and let the server return whatever applies.
  const refsParam = (() => {
    if (!withReferences || !refVis) return undefined;
    const wanted: string[] = [];
    if (refVis.cohort) wanted.push('cohort');
    if (refVis.provincie) wanted.push('provincie');
    if (refVis.land) wanted.push('land');
    return wanted.length > 0 ? wanted.join(',') : undefined;
  })();

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      // cohortType + envelope are only meaningful alongside references — guard them
      // so we don't send orphaned modifiers when references is omitted.
      const response = await queryData({
        source,
        geoLevel: filters.geoLevel,
        geoCode: effectiveGeoCode,
        year: filters.period.year,
        dimension,
        dimensionValue,
        ...(refsParam ? { references: refsParam } : {}),
        ...(refsParam && refVis?.cohortType ? { cohortType: refVis.cohortType } : {}),
        ...(refsParam && refVis?.envelope ? { envelope: true } : {}),
      });
      setData(response.data);
      setReferences(blockToArray(response.references));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, [source, filters.geoLevel, effectiveGeoCode, filters.period.year, dimension, dimensionValue, enabled, refsParam, refVis?.cohortType, refVis?.envelope]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, references, isLoading, error, refetch: fetchData };
}
