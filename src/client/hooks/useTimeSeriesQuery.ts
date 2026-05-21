import { useState, useEffect, useCallback } from 'react';
import { queryTimeSeries } from '../services/api/data';
import { useFilters } from '../contexts/FilterContext';
import { usePresentations } from '../contexts/PresentationContext';
import type { DataPoint, ReferenceSeries, ReferencesBlock } from '@shared/api/contracts';

function blockToArray(block: ReferencesBlock | undefined): ReferenceSeries[] {
  if (!block) return [];
  const out: ReferenceSeries[] = [];
  if (block.cohort) out.push(block.cohort);
  if (block.provincie) out.push(block.provincie);
  if (block.land) out.push(block.land);
  return out;
}

interface UseTimeSeriesOptions {
  source: string;
  dimension?: string;
  dimensionValue?: string;
  enabled?: boolean;
  /** Default true so Tier-1 line charts get refs without explicit opt-in,
   *  mirroring useDataQuery. */
  withReferences?: boolean;
}

interface UseTimeSeriesResult {
  data: DataPoint[];
  isLoading: boolean;
  error: string | null;
  /** Reference time series (cohort/provincie/land mean per year). Empty
   *  when references aren't requested or the server failed to compute. */
  references: ReferenceSeries[];
  /** Force a re-fetch (#151). */
  refetch: () => void;
}

/**
 * Fetch full time series (all years) for a given geo area + dimension.
 * Includes both actuals and prognose data, suitable for LineChart rendering.
 * Returns reference series (cohort/provincie/land) when the active
 * presentation requests them — mirrors the snapshot useDataQuery flow.
 */
export function useTimeSeriesQuery({
  source, dimension, dimensionValue, enabled = true, withReferences = true,
}: UseTimeSeriesOptions): UseTimeSeriesResult {
  const { filters } = useFilters();
  const { activePresentation } = usePresentations();
  const [data, setData] = useState<DataPoint[]>([]);
  const [references, setReferences] = useState<ReferenceSeries[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refVis = activePresentation?.referenceVisibility;
  const refsParam = (() => {
    if (!withReferences || !refVis) return undefined;
    const wanted: string[] = [];
    if (refVis.cohort) wanted.push('cohort');
    if (refVis.provincie) wanted.push('provincie');
    if (refVis.land) wanted.push('land');
    return wanted.length > 0 ? wanted.join(',') : undefined;
  })();

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
        ...(refsParam ? { references: refsParam } : {}),
      });

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
      setReferences(blockToArray(response.references));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch time series');
    } finally {
      setIsLoading(false);
    }
  }, [source, filters.geoCode, dimension, dimensionValue, enabled, refsParam]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, references, refetch: fetchData };
}
