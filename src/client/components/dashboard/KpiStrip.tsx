import { useEffect, useState } from 'react';
import type { ThemeKpiEntry, DataPoint, ReferencesBlock, ReferenceSeries } from '@shared/api/contracts';
import { useFilters } from '../../contexts/FilterContext';
import { usePresentations } from '../../contexts/PresentationContext';
import { queryData } from '../../services/api/data';
import { NumberDisplay } from '../charts/NumberDisplay';

interface KpiStripProps {
  themeSlug: string;
  kpiConfig: ThemeKpiEntry[];
}

interface KpiResult {
  data: DataPoint[];
  references: ReferenceSeries[];
}

function blockToArray(block: ReferencesBlock | undefined): ReferenceSeries[] {
  if (!block) return [];
  const out: ReferenceSeries[] = [];
  if (block.cohort) out.push(block.cohort);
  if (block.provincie) out.push(block.provincie);
  if (block.land) out.push(block.land);
  return out;
}

/**
 * SPEC-C T5: KPI strip on the per-gemeente drilldown view.
 *
 * Reads themes.kpi_config (array of {label, dataSource, dimension?, deltaDirection?})
 * and renders one NumberDisplay per entry. Each NumberDisplay surfaces vs-cohort
 * and vs-NL delta chips per SPEC-B (chart-level reference rendering).
 *
 * Hidden when:
 * - kpiConfig is empty (theme hasn't been seeded)
 * - filters.geoLevel is not 'gemeente' (parent component already gates this, but defensive)
 */
export function KpiStrip({ kpiConfig }: KpiStripProps) {
  const { filters } = useFilters();
  const { activePresentation } = usePresentations();
  const [results, setResults] = useState<Record<number, KpiResult>>({});
  const [isLoading, setIsLoading] = useState(false);

  const refVis = activePresentation?.referenceVisibility;
  const refsParam = (() => {
    if (!refVis) return undefined;
    const wanted: string[] = [];
    if (refVis.cohort) wanted.push('cohort');
    if (refVis.provincie) wanted.push('provincie');
    if (refVis.land) wanted.push('land');
    return wanted.length > 0 ? wanted.join(',') : undefined;
  })();

  useEffect(() => {
    if (filters.geoLevel !== 'gemeente') return;
    if (kpiConfig.length === 0) return;

    let cancelled = false;
    setIsLoading(true);
    Promise.all(
      kpiConfig.map(async (entry) => {
        const response = await queryData({
          source: entry.dataSource,
          geoCode: filters.geoCode,
          year: filters.period.year,
          dimension: entry.dimension ?? undefined,
          dimensionValue: entry.dimensionValue ?? undefined,
          ...(refsParam ? { references: refsParam } : {}),
          ...(refsParam && refVis?.cohortType ? { cohortType: refVis.cohortType } : {}),
        });
        return {
          data: response.data,
          references: blockToArray(response.references),
        };
      }),
    )
      .then((all) => {
        if (cancelled) return;
        const map: Record<number, KpiResult> = {};
        all.forEach((r, i) => { map[i] = r; });
        setResults(map);
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [kpiConfig, filters.geoCode, filters.geoLevel, filters.period.year, refsParam, refVis?.cohortType]);

  if (filters.geoLevel !== 'gemeente') return null;
  if (kpiConfig.length === 0) return null;

  return (
    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {kpiConfig.map((entry, i) => {
        const result = results[i];
        const headlinePoint = result?.data?.[0];
        const value = headlinePoint?.value ?? 0;
        return (
          <div key={`${entry.dataSource}-${entry.label}-${i}`} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            {isLoading && !result ? (
              <div className="h-20 animate-pulse rounded bg-gray-50" aria-hidden="true" />
            ) : (
              <NumberDisplay
                value={value}
                label={entry.label}
                format={entry.format ?? 'compact'}
                size="md"
                deltaDirection={entry.deltaDirection ?? 'neutral'}
                references={result?.references ?? []}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
