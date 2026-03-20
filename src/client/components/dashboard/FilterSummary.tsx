import { MapPin, Calendar, Filter, X } from 'lucide-react';
import { useFilters } from '../../contexts/FilterContext';
import { GEO_LEVEL_LABELS } from '../../utils/geo';

/**
 * Compact filter summary showing active filter state.
 * Displayed as breadcrumb-style tags below the dashboard title.
 */
export function FilterSummary() {
  const { filters, resetFilters } = useFilters();

  const hasActiveFilters =
    filters.geoCode !== 'NL' ||
    filters.geoLevel !== 'land' ||
    filters.period.year !== 2024 ||
    filters.comparisonEnabled ||
    Object.keys(filters.dimensions).length > 0;

  if (!hasActiveFilters) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap mb-4">
      <span className="text-xs text-gray-400 flex items-center gap-1">
        <Filter className="h-3 w-3" /> Actieve filters:
      </span>

      {filters.geoLevel !== 'land' && (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs text-blue-700">
          <MapPin className="h-3 w-3" />
          {GEO_LEVEL_LABELS[filters.geoLevel] || filters.geoLevel}
          {filters.geoCode !== 'NL' && `: ${filters.geoCode}`}
        </span>
      )}

      {filters.period.year !== 2024 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2.5 py-0.5 text-xs text-green-700">
          <Calendar className="h-3 w-3" />
          {filters.period.year}
        </span>
      )}

      {filters.comparisonEnabled && filters.period.compareYear && (
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 border border-purple-200 px-2.5 py-0.5 text-xs text-purple-700">
          vs {filters.period.compareYear}
        </span>
      )}

      {Object.entries(filters.dimensions).map(([key, value]) => (
        value && (
          <span key={key} className="inline-flex items-center gap-1 rounded-full bg-orange-50 border border-orange-200 px-2.5 py-0.5 text-xs text-orange-700">
            {key}: {value}
          </span>
        )
      ))}

      <button
        onClick={resetFilters}
        className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100"
        title="Filters wissen"
      >
        <X className="h-3 w-3" />
        Wissen
      </button>
    </div>
  );
}
