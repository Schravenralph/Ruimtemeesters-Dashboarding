import { useState } from 'react';
import { Download, ExternalLink, Maximize2, MoreVertical, X } from 'lucide-react';
import type { TileConfig, ChartType, DataPoint } from '@shared/api/contracts';
import { ChartRenderer } from '../charts/ChartRenderer';
import { useDataQuery } from '../../hooks/useDataQuery';
import { useTimeSeriesQuery } from '../../hooks/useTimeSeriesQuery';
import { useFilters } from '../../contexts/FilterContext';
import { useSourceAttribution } from '../../hooks/useSourceAttribution';
import { useFocalGeoArea, formatFocalLabel } from '../../hooks/useFocalGeoArea';

interface DashboardTileProps {
  tile: TileConfig;
  onRemove?: () => void;
  onExport?: (format: string, data: DataPoint[]) => void;
}

export function DashboardTile({ tile, onRemove, onExport }: DashboardTileProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { filters } = useFilters();
  const attribution = useSourceAttribution(tile.dataSource);
  const focalArea = useFocalGeoArea();
  const focalLabel = formatFocalLabel(focalArea);

  // Only apply dimension comparison to tiles that use the compared dimension
  const tileHasComparedDimension = filters.comparedDimension != null
    && tile.dimensions.includes(filters.comparedDimension);
  const isDimensionComparison = tileHasComparedDimension
    && filters.comparedDimensionValues.length >= 2;

  // Line charts need full time series (all years + prognose), not a single-year snapshot
  const isLineChart = tile.chartType === 'line';
  const lineDim = tile.dimensions[0];

  // Tile-level filter: a template can pin the tile to a single dimension value
  // (e.g. `metric='tekort_percentage'` for the woningtekort theme) via
  // `tile.config.dimensionValue`. Both query hooks accept this; previously only
  // the URL query params plumbed it, leaving template authors no way to express
  // a per-tile filter declaratively.
  const configDimensionValue = typeof tile.config?.dimensionValue === 'string'
    ? tile.config.dimensionValue
    : undefined;

  const { data: snapshotData, references: snapshotReferences, isLoading: snapLoading, error: snapError } = useDataQuery({
    source: tile.dataSource,
    dimension: isDimensionComparison ? undefined : lineDim,
    dimensionValue: configDimensionValue,
    enabled: !isLineChart,
  });

  // No dimension → backend returns grand total per year (all dimensions pinned to 'totaal')
  // useTimeSeriesQuery hits /api/data/timeseries which doesn't yet support references —
  // line charts use the snapshot path's references when available, otherwise empty.
  const { data: timeSeriesData, isLoading: tsLoading, error: tsError } = useTimeSeriesQuery({
    source: tile.dataSource,
    dimension: lineDim,
    dimensionValue: configDimensionValue,
    enabled: isLineChart,
  });

  const data = isLineChart ? timeSeriesData : snapshotData;
  const isLoading = isLineChart ? tsLoading : snapLoading;
  const error = isLineChart ? tsError : snapError;
  // SPEC-B: forward references from useDataQuery into ChartRenderer.
  // Time-series path doesn't carry references yet (separate /api/data/timeseries endpoint).
  const references = isLineChart ? [] : snapshotReferences;

  // Merge dimension comparison values into tile config (only for non-line relevant tiles).
  // Line chart tiles use time series (grand totals), so dimension comparison doesn't apply.
  const mergedConfig = isDimensionComparison && !isLineChart
    ? { ...tile.config, comparedDimensionValues: filters.comparedDimensionValues, filterDimension: undefined, filterValue: undefined }
    : tile.config;

  return (
    <>
      <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Tile Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{tile.title}</h3>
            {filters.period.year > new Date().getFullYear() && !isLineChart && (
              <span className="flex-shrink-0 text-[10px] font-medium bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                prognose
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(true)}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              title="Vergroten"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg z-20">
                  <button
                    onClick={() => { onExport?.('png', data); setShowMenu(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Download className="h-3.5 w-3.5" /> PNG
                  </button>
                  <button
                    onClick={() => { onExport?.('csv', data); setShowMenu(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Download className="h-3.5 w-3.5" /> CSV
                  </button>
                  <button
                    onClick={() => { onExport?.('excel', data); setShowMenu(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Download className="h-3.5 w-3.5" /> Excel
                  </button>
                  <button
                    onClick={() => { onExport?.('pdf', data); setShowMenu(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Download className="h-3.5 w-3.5" /> PDF
                  </button>
                  {onRemove && (
                    <>
                      <div className="my-1 border-t border-gray-100" />
                      <button
                        onClick={() => { onRemove(); setShowMenu(false); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <X className="h-3.5 w-3.5" /> Verwijderen
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chart Content */}
        <div className="flex-1 p-4">
          <ChartRenderer
            chartType={tile.chartType as ChartType}
            data={data}
            isLoading={isLoading}
            error={error}
            config={mergedConfig as Record<string, unknown>}
            references={references}
            focalLabel={focalLabel}
          />
        </div>

        {/* Tile Footer */}
        {(tile.description || attribution) && (
          <div className="border-t border-gray-100 px-4 py-2 space-y-1">
            {tile.description && (
              <p className="text-xs text-gray-500">{tile.description}</p>
            )}
            {attribution && (
              <p className="text-[10px] text-gray-400 leading-snug">
                <span className="font-medium text-gray-500">Bron:</span>{' '}
                {attribution.cbsTableId ? (
                  <>
                    CBS {attribution.cbsTableId}
                    {attribution.cbsTableTitle && (
                      <> — <span title={attribution.cbsTableTitle}>{truncate(attribution.cbsTableTitle, 90)}</span></>
                    )}
                    {attribution.statlineUrl && (
                      <a
                        href={attribution.statlineUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 inline-flex items-center text-gray-400 hover:text-blue-600"
                        title="Bekijk op CBS StatLine"
                      >
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </>
                ) : (
                  <>{attribution.name}</>
                )}
                {attribution.lastSyncAt && (
                  <> · Bijgewerkt: {formatSyncDate(attribution.lastSyncAt)}</>
                )}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Expanded Modal */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-8">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold">{tile.title}</h2>
              <button
                onClick={() => setIsExpanded(false)}
                className="rounded-lg p-2 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div className="h-[500px]">
                <ChartRenderer
                  chartType={tile.chartType as ChartType}
                  data={data}
                  isLoading={isLoading}
                  error={error}
                  config={mergedConfig as Record<string, unknown>}
                  references={references}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + '…';
}

function formatSyncDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('nl-NL', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return iso.slice(0, 10);
  }
}
