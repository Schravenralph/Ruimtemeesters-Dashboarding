import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, LayoutDashboard, BarChart3, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../../hooks/useDebounce';
import { useFilters } from '../../contexts/FilterContext';
import { api } from '../../services/api/client';
import type { GeoLevel } from '@shared/api/contracts';

interface SearchResults {
  areas: { code: string; name: string; level: string; parentCode: string | null }[];
  themes: { id: string; slug: string; name: string; description: string | null }[];
  tiles: { id: string; title: string; themeSlug: string; themeName: string }[];
}

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 250);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { setGeoCode, setGeoLevel } = useFilters();

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults(null);
      return;
    }

    setIsLoading(true);
    api.get<SearchResults>('/search', { q: debouncedQuery })
      .then(setResults)
      .catch(() => setResults(null))
      .finally(() => setIsLoading(false));
  }, [debouncedQuery]);

  function handleAreaClick(area: { code: string; name: string; level: string }) {
    setGeoCode(area.code);
    setGeoLevel(area.level as GeoLevel);
    close();
  }

  function handleThemeClick(slug: string) {
    navigate(`/dashboard/${slug}`);
    close();
  }

  function close() {
    setQuery('');
    setResults(null);
    setIsOpen(false);
  }

  const hasResults = results && (results.areas.length > 0 || results.themes.length > 0 || results.tiles.length > 0);

  const levelLabels: Record<string, string> = {
    land: 'Land',
    provincie: 'Provincie',
    corop: 'COROP',
    gemeente: 'Gemeente',
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5">
        <Search className="h-4 w-4 text-gray-400" />
        <input
          ref={inputRef}
          type="search"
          placeholder="Zoek gebieden, thema's..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          className="bg-transparent text-sm outline-none w-48 placeholder-gray-400"
          aria-label="Globaal zoeken"
        />
        {query && (
          <button onClick={close} className="text-gray-400 hover:text-gray-600">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && (query.length >= 2) && (
        <>
          <div className="fixed inset-0 z-30" onClick={close} />
          <div className="absolute top-full left-0 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-lg z-40 max-h-96 overflow-y-auto">
            {isLoading && (
              <p className="p-4 text-sm text-gray-500">Zoeken...</p>
            )}

            {!isLoading && !hasResults && query.length >= 2 && (
              <p className="p-4 text-sm text-gray-500">Geen resultaten voor "{query}"</p>
            )}

            {hasResults && (
              <>
                {/* Areas */}
                {results!.areas.length > 0 && (
                  <div className="p-2">
                    <p className="px-2 py-1 text-xs font-medium text-gray-400 uppercase">Gebieden</p>
                    {results!.areas.map(area => (
                      <button
                        key={area.code}
                        onClick={() => handleAreaClick(area)}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-gray-50"
                      >
                        <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                        <span className="text-gray-900">{area.name}</span>
                        <span className="text-xs text-gray-400 ml-auto">{levelLabels[area.level] || area.level}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Themes */}
                {results!.themes.length > 0 && (
                  <div className="border-t border-gray-100 p-2">
                    <p className="px-2 py-1 text-xs font-medium text-gray-400 uppercase">Thema's</p>
                    {results!.themes.map(theme => (
                      <button
                        key={theme.id}
                        onClick={() => handleThemeClick(theme.slug)}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-gray-50"
                      >
                        <LayoutDashboard className="h-4 w-4 text-blue-500 shrink-0" />
                        <span className="text-gray-900">{theme.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Tiles */}
                {results!.tiles.length > 0 && (
                  <div className="border-t border-gray-100 p-2">
                    <p className="px-2 py-1 text-xs font-medium text-gray-400 uppercase">Tegels</p>
                    {results!.tiles.map(tile => (
                      <button
                        key={tile.id}
                        onClick={() => handleThemeClick(tile.themeSlug)}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-gray-50"
                      >
                        <BarChart3 className="h-4 w-4 text-gray-400 shrink-0" />
                        <div className="text-left">
                          <span className="text-gray-900">{tile.title}</span>
                          <span className="text-xs text-gray-400 ml-2">in {tile.themeName}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
