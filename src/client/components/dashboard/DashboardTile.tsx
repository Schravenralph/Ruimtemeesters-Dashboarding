import { useState } from 'react';
import { Download, Maximize2, MoreVertical, X } from 'lucide-react';
import type { TileConfig, ChartType } from '@shared/api/contracts';
import { ChartRenderer } from '../charts/ChartRenderer';
import { useDataQuery } from '../../hooks/useDataQuery';
import { useFilters } from '../../contexts/FilterContext';

interface DashboardTileProps {
  tile: TileConfig;
  onRemove?: () => void;
  onExport?: (format: string) => void;
}

export function DashboardTile({ tile, onRemove, onExport }: DashboardTileProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { filters } = useFilters();

  // Only apply dimension comparison to tiles that use the compared dimension
  const tileHasComparedDimension = filters.comparedDimension != null
    && tile.dimensions.includes(filters.comparedDimension);
  const isDimensionComparison = tileHasComparedDimension
    && filters.comparedDimensionValues.length >= 2;

  const { data, isLoading, error } = useDataQuery({
    source: tile.dataSource,
    // When dimension comparison is active for THIS tile, don't filter by dimension value
    dimension: isDimensionComparison ? undefined : tile.dimensions[0],
  });

  // Merge dimension comparison values into tile config (only for relevant tiles)
  const mergedConfig = isDimensionComparison
    ? { ...tile.config, comparedDimensionValues: filters.comparedDimensionValues, filterDimension: undefined, filterValue: undefined }
    : tile.config;

  return (
    <>
      <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Tile Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{tile.title}</h3>
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
                    onClick={() => { onExport?.('png'); setShowMenu(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Download className="h-3.5 w-3.5" /> PNG
                  </button>
                  <button
                    onClick={() => { onExport?.('csv'); setShowMenu(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Download className="h-3.5 w-3.5" /> CSV
                  </button>
                  <button
                    onClick={() => { onExport?.('excel'); setShowMenu(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Download className="h-3.5 w-3.5" /> Excel
                  </button>
                  <button
                    onClick={() => { onExport?.('pdf'); setShowMenu(false); }}
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
          />
        </div>

        {/* Tile Footer */}
        {tile.description && (
          <div className="border-t border-gray-100 px-4 py-2">
            <p className="text-xs text-gray-500">{tile.description}</p>
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
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
