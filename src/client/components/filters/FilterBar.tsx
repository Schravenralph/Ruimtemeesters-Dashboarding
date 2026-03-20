import { useState, useEffect } from 'react';
import { Filter, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { Select } from '../ui/Select';
import { SearchInput } from '../ui/SearchInput';
import { Button } from '../ui/Button';
import { useFilters } from '../../contexts/FilterContext';
import { listAreas } from '../../services/api/geo';
import { getAvailableYears } from '../../services/api/data';
import type { GeoArea, GeoLevel } from '@shared/api/contracts';
import { SavedFilters } from './SavedFilters';

interface FilterBarProps {
  dataSource?: string;
  themeSlug?: string;
}

const GEO_LEVELS: { value: GeoLevel; label: string }[] = [
  { value: 'land', label: 'Nederland' },
  { value: 'provincie', label: 'Provincie' },
  { value: 'gemeente', label: 'Gemeente' },
];

export function FilterBar({ dataSource = 'bevolking', themeSlug }: FilterBarProps) {
  const {
    filters, setGeoLevel, setGeoCode, setYear, setCompareYear,
    setComparisonEnabled, resetFilters,
  } = useFilters();

  const [areas, setAreas] = useState<GeoArea[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAreaSearch, setShowAreaSearch] = useState(false);

  // Load available years
  useEffect(() => {
    getAvailableYears(dataSource).then(({ years }) => setYears(years));
  }, [dataSource]);

  // Load areas when geo level changes
  useEffect(() => {
    if (filters.geoLevel === 'land') {
      setAreas([]);
      return;
    }
    listAreas({ level: filters.geoLevel }).then(({ areas }) => setAreas(areas));
  }, [filters.geoLevel]);

  // Filter areas by search
  const filteredAreas = searchQuery
    ? areas.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : areas;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
        </div>
        <SavedFilters themeSlug={themeSlug} />
      </div>

      <div className="flex flex-wrap items-end gap-4">
        {/* Geographic Level */}
        <Select
          label="Gebiedsniveau"
          value={filters.geoLevel}
          onChange={(e) => {
            setGeoLevel(e.target.value as GeoLevel);
            if (e.target.value === 'land') {
              setGeoCode('NL');
            }
          }}
          options={GEO_LEVELS}
        />

        {/* Area Selection */}
        {filters.geoLevel !== 'land' && (
          <div className="relative min-w-[200px]">
            <label className="text-sm font-medium text-gray-700 block mb-1">Gebied</label>
            <button
              onClick={() => setShowAreaSearch(!showAreaSearch)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-left"
            >
              {areas.find(a => a.code === filters.geoCode)?.name || 'Selecteer...'}
            </button>

            {showAreaSearch && (
              <div className="absolute top-full left-0 mt-1 w-72 rounded-lg border border-gray-200 bg-white shadow-lg z-30 p-2">
                <SearchInput
                  placeholder="Zoek gemeente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClear={() => setSearchQuery('')}
                />
                <div className="mt-2 max-h-48 overflow-y-auto">
                  {filteredAreas.map(area => (
                    <button
                      key={area.code}
                      onClick={() => {
                        setGeoCode(area.code);
                        setShowAreaSearch(false);
                        setSearchQuery('');
                      }}
                      className={`w-full rounded px-3 py-1.5 text-sm text-left hover:bg-blue-50 ${
                        area.code === filters.geoCode ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      {area.name}
                    </button>
                  ))}
                  {filteredAreas.length === 0 && (
                    <p className="text-sm text-gray-500 px-3 py-2">Geen resultaten</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Year Selection */}
        {years.length > 0 && (
          <Select
            label="Periode"
            value={String(filters.period.year)}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            options={years.map(y => ({ value: String(y), label: String(y) }))}
          />
        )}

        {/* Comparison Toggle */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Vergelijken</label>
          <button
            onClick={() => setComparisonEnabled(!filters.comparisonEnabled)}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {filters.comparisonEnabled ? (
              <ToggleRight className="h-5 w-5 text-blue-600" />
            ) : (
              <ToggleLeft className="h-5 w-5 text-gray-400" />
            )}
            {filters.comparisonEnabled ? 'Aan' : 'Uit'}
          </button>
        </div>

        {/* Compare Year */}
        {filters.comparisonEnabled && years.length > 0 && (
          <Select
            label="Vergelijk met"
            value={String(filters.period.compareYear || years[0])}
            onChange={(e) => setCompareYear(parseInt(e.target.value, 10))}
            options={years.filter(y => y !== filters.period.year).map(y => ({
              value: String(y),
              label: String(y),
            }))}
          />
        )}

        {/* Reset */}
        <Button variant="ghost" size="sm" onClick={resetFilters} className="mt-auto">
          <X className="h-3.5 w-3.5" />
          Filters wissen
        </Button>
      </div>
    </div>
  );
}
