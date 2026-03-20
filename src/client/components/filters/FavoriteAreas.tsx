import { Star, X } from 'lucide-react';
import { useFavoriteAreas } from '../../hooks/useFavoriteAreas';
import { useFilters } from '../../contexts/FilterContext';
import type { GeoLevel } from '@shared/api/contracts';

export function FavoriteAreas() {
  const { favorites, removeFavorite } = useFavoriteAreas();
  const { setGeoCode, setGeoLevel, filters } = useFilters();

  if (favorites.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 mb-4" role="region" aria-label="Favoriete gebieden">
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-2">
        <Star className="h-3.5 w-3.5 text-yellow-500" aria-hidden="true" />
        <span>Favoriete gebieden</span>
      </div>

      <div className="flex flex-wrap gap-1.5" role="list">
        {favorites.map(area => (
          <div
            key={area.code}
            role="listitem"
            className={`group flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
              filters.geoCode === area.code
                ? 'border-blue-300 bg-blue-50 text-blue-700'
                : 'border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
            }`}
          >
            <button
              onClick={() => {
                setGeoCode(area.code);
                setGeoLevel(area.level as GeoLevel);
              }}
              className="flex items-center gap-1"
              aria-label={`Selecteer ${area.name}`}
            >
              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" aria-hidden="true" />
              {area.name}
            </button>
            <button
              onClick={() => removeFavorite(area.code)}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 ml-0.5"
              aria-label={`Verwijder ${area.name} uit favorieten`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
