import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, ArrowLeft } from 'lucide-react';
import { getDimensions } from '../../services/api/data';
import { useFilters } from '../../contexts/FilterContext';
import type { Dimension } from '@shared/api/contracts';
import { Button } from '../ui/Button';

interface DrilldownPanelProps {
  dataSource: string;
  onDimensionSelect: (dimension: string, value: string) => void;
}

export function DrilldownPanel({ dataSource, onDimensionSelect }: DrilldownPanelProps) {
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [expandedDim, setExpandedDim] = useState<string | null>(null);
  const { filters, setDimension } = useFilters();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getDimensions(dataSource)
      .then(({ dimensions }) => setDimensions(dimensions))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [dataSource]);

  if (isLoading || dimensions.length === 0) return null;

  // Check if any dimension filters are active
  const activeDimensions = Object.entries(filters.dimensions);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-700">Uitsplitsen per</h4>
        {activeDimensions.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // Clear all dimension filters by resetting
              for (const [key] of activeDimensions) {
                setDimension(key, '');
              }
            }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Terug naar overzicht
          </Button>
        )}
      </div>

      {/* Active filters display */}
      {activeDimensions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {activeDimensions.map(([key, value]) => {
            if (!value) return null;
            const dim = dimensions.find(d => d.id === key);
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700"
              >
                {dim?.name || key}: {value}
                <button
                  onClick={() => setDimension(key, '')}
                  className="ml-1 hover:text-blue-900"
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Dimension accordions */}
      <div className="space-y-1">
        {dimensions.map(dim => (
          <div key={dim.id}>
            <button
              onClick={() => setExpandedDim(expandedDim === dim.id ? null : dim.id)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
            >
              <span className="font-medium text-gray-700">{dim.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{dim.values.length} opties</span>
                {expandedDim === dim.id ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </button>

            {expandedDim === dim.id && (
              <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-gray-100 pl-3">
                {dim.values.map(val => {
                  const isActive = filters.dimensions[dim.id] === val.key;
                  return (
                    <button
                      key={val.key}
                      onClick={() => {
                        setDimension(dim.id, isActive ? '' : val.key);
                        onDimensionSelect(dim.id, isActive ? '' : val.key);
                      }}
                      className={`block w-full rounded px-3 py-1.5 text-left text-sm transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {val.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
