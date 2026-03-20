import { Clock, X, MapPin } from 'lucide-react';
import { useRecentAreas } from '../../hooks/useRecentAreas';
import { useFilters } from '../../contexts/FilterContext';
import type { GeoLevel } from '@shared/api/contracts';

export function RecentAreas() {
  const { recentAreas, clearRecent } = useRecentAreas();
  const { setGeoCode, setGeoLevel } = useFilters();

  if (recentAreas.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
          <Clock className="h-3.5 w-3.5" />
          Recent bekeken gebieden
        </div>
        <button
          onClick={clearRecent}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Wissen
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {recentAreas.map(area => (
          <button
            key={area.code}
            onClick={() => {
              setGeoCode(area.code);
              setGeoLevel(area.level as GeoLevel);
            }}
            className="flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-700 hover:border-blue-300 hover:bg-blue-50"
          >
            <MapPin className="h-3 w-3 text-gray-400" />
            {area.name}
          </button>
        ))}
      </div>
    </div>
  );
}
