import { useState, useEffect } from 'react';
import { X, Layers } from 'lucide-react';
import { getDimensions } from '../../services/api/data';
import { useFilters } from '../../contexts/FilterContext';
import type { Dimension } from '@shared/api/contracts';

const MAX_COMPARED = 4;

const SERIES_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];

interface DimensionComparisonSelectorProps {
  dataSource: string;
}

export function DimensionComparisonSelector({ dataSource }: DimensionComparisonSelectorProps) {
  const { filters, setComparedDimensionValues } = useFilters();
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [activeDimension, setActiveDimension] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!dataSource) return;
    getDimensions(dataSource).then(({ dimensions: dims }) => {
      setDimensions(dims);
      setActiveDimension(dims.length > 0 ? dims[0].id : null);
      clear();
    });
  }, [dataSource]);

  const compared = filters.comparedDimensionValues;
  const currentDim = dimensions.find(d => d.id === activeDimension);

  function toggleValue(value: string) {
    if (compared.includes(value)) {
      setComparedDimensionValues(compared.filter(v => v !== value), activeDimension || undefined);
    } else if (compared.length < MAX_COMPARED) {
      setComparedDimensionValues([...compared, value], activeDimension || undefined);
    }
  }

  function clear() {
    setComparedDimensionValues([], undefined);
  }

  if (dimensions.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition-colors ${
          compared.length > 0
            ? 'bg-blue-50 text-blue-700 border border-blue-200'
            : 'text-gray-600 hover:bg-gray-100 border border-gray-200'
        }`}
      >
        <Layers className="h-3.5 w-3.5" />
        {compared.length > 0
          ? `Vergelijk ${compared.length} waarden`
          : 'Dimensie vergelijken'
        }
      </button>

      {/* Selected chips */}
      {compared.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {compared.map((val, i) => (
            <span
              key={val}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full text-white"
              style={{ backgroundColor: SERIES_COLORS[i % SERIES_COLORS.length] }}
            >
              {currentDim?.values.find(v => v.key === val)?.label || val}
              <button onClick={() => toggleValue(val)} className="hover:opacity-75">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            onClick={clear}
            className="text-xs text-gray-400 hover:text-gray-600 px-1"
          >
            Wis alles
          </button>
        </div>
      )}

      {/* Dropdown panel */}
      {isOpen && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-lg p-3 space-y-3">
          {/* Dimension tabs */}
          {dimensions.length > 1 && (
            <div className="flex gap-1 border-b border-gray-100 pb-2">
              {dimensions.map(dim => (
                <button
                  key={dim.id}
                  onClick={() => {
                    setActiveDimension(dim.id);
                    clear();
                  }}
                  className={`px-2.5 py-1 text-xs rounded-md ${
                    activeDimension === dim.id
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {dim.name}
                </button>
              ))}
            </div>
          )}

          {/* Value grid */}
          {currentDim && (
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
              {currentDim.values.map(val => {
                const selectedIdx = compared.indexOf(val.key);
                const isSelected = selectedIdx >= 0;
                const disabled = !isSelected && compared.length >= MAX_COMPARED;

                return (
                  <button
                    key={val.key}
                    onClick={() => toggleValue(val.key)}
                    disabled={disabled}
                    className={`flex items-center gap-2 text-left text-xs px-2.5 py-1.5 rounded-md transition-colors ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700 font-medium ring-1 ring-blue-200'
                        : disabled
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {isSelected && (
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: SERIES_COLORS[selectedIdx % SERIES_COLORS.length] }}
                      />
                    )}
                    <span className="truncate">{val.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {compared.length < 2 && (
            <p className="text-xs text-gray-400">Selecteer minimaal 2 waarden om te vergelijken</p>
          )}
        </div>
      )}
    </div>
  );
}
