import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getTheme } from '../services/api/themes';
import { queryData } from '../services/api/data';
import { ChartRenderer } from '../components/charts/ChartRenderer';
import type { ThemeConfig, ChartType, DataPoint } from '@shared/api/contracts';

export function PrintPage() {
  const { slug } = useParams<{ slug: string }>();
  const [theme, setTheme] = useState<ThemeConfig | null>(null);
  const [tileData, setTileData] = useState<Record<string, DataPoint[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    getTheme(slug).then(async (theme) => {
      setTheme(theme);

      // Load data for all tiles
      const dataMap: Record<string, DataPoint[]> = {};
      for (const tile of theme.tiles) {
        try {
          const response = await queryData({
            source: tile.dataSource,
            dimension: tile.dimensions[0],
          });
          dataMap[tile.id] = response.data;
        } catch {
          dataMap[tile.id] = [];
        }
      }

      setTileData(dataMap);
      setIsLoading(false);

      // Auto-print after a short delay
      setTimeout(() => window.print(), 1000);
    });
  }, [slug]);

  if (isLoading || !theme) {
    return <div className="p-8 text-center">Laden...</div>;
  }

  return (
    <div className="p-8 max-w-[800px] mx-auto">
      {/* Header */}
      <div className="mb-8 border-b pb-4">
        <h1 className="text-2xl font-bold">{theme.name}</h1>
        {theme.description && <p className="text-gray-600 mt-1">{theme.description}</p>}
        <p className="text-sm text-gray-400 mt-2">
          Ruimtemeesters Dashboard · Geprint op {new Date().toLocaleDateString('nl-NL')}
        </p>
      </div>

      {/* Tiles */}
      <div className="space-y-8">
        {theme.tiles.map(tile => (
          <div key={tile.id} className="break-inside-avoid">
            <h2 className="text-lg font-semibold mb-3 border-b pb-2">{tile.title}</h2>
            <div className="h-[300px]">
              <ChartRenderer
                chartType={tile.chartType as ChartType}
                data={tileData[tile.id] || []}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t text-xs text-gray-400 text-center">
        Ruimtemeesters Dashboard · {new Date().toLocaleString('nl-NL')} · Pagina 1
      </div>
    </div>
  );
}
