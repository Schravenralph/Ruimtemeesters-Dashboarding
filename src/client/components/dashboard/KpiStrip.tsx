import { useEffect, useState } from 'react';
import type { ThemeKpiEntry, DataPoint, ReferencesBlock, ReferenceSeries, SeriesPoint } from '@shared/api/contracts';
import { useFilters } from '../../contexts/FilterContext';
import { usePresentations } from '../../contexts/PresentationContext';
import { queryData } from '../../services/api/data';
import { NumberDisplay } from '../charts/NumberDisplay';

interface KpiStripProps {
  themeSlug: string;
  kpiConfig: ThemeKpiEntry[];
}

export interface KpiResult {
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

// Sum two SeriesPoint[] element-wise by year. Linear aggregates only.
export function sumSeries(a: SeriesPoint[], b: SeriesPoint[]): SeriesPoint[] {
  const byYear = new Map<number, number>();
  for (const p of a) byYear.set(p.year, p.value);
  for (const p of b) byYear.set(p.year, (byYear.get(p.year) ?? 0) + p.value);
  return Array.from(byYear.entries())
    .sort(([y1], [y2]) => y1 - y2)
    .map(([year, value]) => ({ year, value }));
}

// Merge per-bin KpiResults by summing data values + reference series of the same kind.
export function mergeKpiResults(results: KpiResult[]): KpiResult {
  if (results.length === 0) return { data: [], references: [] };
  if (results.length === 1) return results[0];

  const summedValue = results.reduce((s, r) => s + (r.data[0]?.value ?? 0), 0);
  const head = results[0].data[0];
  const data: DataPoint[] = head ? [{ ...head, value: summedValue }] : [];

  const byKind = new Map<ReferenceSeries['kind'], ReferenceSeries>();
  for (const r of results) {
    for (const ref of r.references) {
      const existing = byKind.get(ref.kind);
      if (!existing) {
        byKind.set(ref.kind, { kind: ref.kind, label: ref.label, series: [...ref.series] });
      } else {
        byKind.set(ref.kind, { ...existing, series: sumSeries(existing.series, ref.series) });
      }
    }
  }
  return { data, references: Array.from(byKind.values()) };
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
        const values: (string | undefined)[] = entry.dimensionValues?.length
          ? entry.dimensionValues
          : [entry.dimensionValue ?? undefined];
        const perValue = await Promise.all(
          values.map(async (val) => {
            const response = await queryData({
              source: entry.dataSource,
              geoCode: filters.geoCode,
              year: filters.period.year,
              dimension: entry.dimension ?? undefined,
              dimensionValue: val,
              ...(refsParam ? { references: refsParam } : {}),
              ...(refsParam && refVis?.cohortType ? { cohortType: refVis.cohortType } : {}),
            });
            return {
              data: response.data,
              references: blockToArray(response.references),
            };
          }),
        );
        return mergeKpiResults(perValue);
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
