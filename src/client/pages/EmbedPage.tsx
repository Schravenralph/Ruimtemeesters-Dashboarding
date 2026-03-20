import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { FilterProvider } from '../contexts/FilterContext';
import { ChartRenderer } from '../components/charts/ChartRenderer';
import { queryData } from '../services/api/data';
import { getTheme } from '../services/api/themes';
import type { ThemeConfig, ChartType, DataPoint } from '@shared/api/contracts';

/**
 * Minimal embed page for iframe embedding.
 * Shows a single tile or all tiles without navigation chrome.
 * URL: /embed/:slug?tile=tileId&year=2024&geoCode=GM0363
 */
export function EmbedPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const [theme, setTheme] = useState<ThemeConfig | null>(null);
  const [tileData, setTileData] = useState<Record<string, DataPoint[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  const tileId = searchParams.get('tile');
  const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined;
  const geoCode = searchParams.get('geoCode') || undefined;

  useEffect(() => {
    if (!slug) return;

    getTheme(slug).then(async (theme) => {
      setTheme(theme);

      const tilesToLoad = tileId
        ? theme.tiles.filter(t => t.id === tileId)
        : theme.tiles;

      const dataMap: Record<string, DataPoint[]> = {};
      for (const tile of tilesToLoad) {
        try {
          const response = await queryData({
            source: tile.dataSource,
            dimension: tile.dimensions[0],
            year,
            geoCode,
          });
          dataMap[tile.id] = response.data;
        } catch {
          dataMap[tile.id] = [];
        }
      }

      setTileData(dataMap);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, [slug, tileId, year, geoCode]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  if (!theme) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <p className="text-gray-500">Dashboard niet gevonden</p>
      </div>
    );
  }

  const tilesToRender = tileId
    ? theme.tiles.filter(t => t.id === tileId)
    : theme.tiles;

  return (
    <div className="bg-white p-4">
      {/* Minimal branding */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{theme.name}</h1>
          {theme.description && (
            <p className="text-xs text-gray-500">{theme.description}</p>
          )}
        </div>
        <span className="text-xs text-gray-400">Ruimtemeesters Dashboard</span>
      </div>

      {/* Tiles */}
      <div className={`${tilesToRender.length > 1 ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : ''}`}>
        {tilesToRender.map(tile => (
          <div key={tile.id} className="rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">{tile.title}</h3>
            <ChartRenderer
              chartType={tile.chartType as ChartType}
              data={tileData[tile.id] || []}
            />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-gray-100 text-center">
        <a
          href={`/dashboard/${slug}`}
          target="_blank"
          rel="noopener"
          className="text-xs text-blue-600 hover:underline"
        >
          Bekijk volledig dashboard →
        </a>
      </div>
    </div>
  );
}
