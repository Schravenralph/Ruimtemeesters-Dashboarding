import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getTheme } from '../services/api/themes';
import { queryData } from '../services/api/data';
import { getArea } from '../services/api/geo';
import { ChartRenderer } from '../components/charts/ChartRenderer';
import type { ThemeConfig, ChartType, DataPoint } from '@shared/api/contracts';

export function PrintPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const geoCode = searchParams.get('geoCode') || 'NL';
  const year = parseInt(searchParams.get('year') || '2024', 10);

  const [theme, setTheme] = useState<ThemeConfig | null>(null);
  const [geoName, setGeoName] = useState<string>(geoCode);
  const [tileData, setTileData] = useState<Record<string, DataPoint[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    getArea(geoCode).then(area => setGeoName(area.name || geoCode)).catch(() => { /* fall back to code */ });

    getTheme(slug).then(async (theme) => {
      setTheme(theme);

      const dataMap: Record<string, DataPoint[]> = {};
      for (const tile of theme.tiles) {
        try {
          const response = await queryData({
            source: tile.dataSource,
            geoCode,
            year,
            dimension: tile.dimensions[0],
          });
          dataMap[tile.id] = response.data;
        } catch {
          dataMap[tile.id] = [];
        }
      }

      setTileData(dataMap);
      setIsLoading(false);

      setTimeout(() => window.print(), 1000);
    });
  }, [slug, geoCode, year]);

  if (isLoading || !theme) {
    return <div className="p-8 text-center">Laden...</div>;
  }

  return (
    <div className="p-8 max-w-[800px] mx-auto">
      {/* Header */}
      <div className="mb-8 border-b pb-4">
        <h1 className="text-2xl font-bold">{theme.name}</h1>
        {theme.description && <p className="text-gray-600 mt-1">{theme.description}</p>}
        <p className="text-sm text-gray-700 mt-2 font-medium">
          {geoName} · {year}
        </p>
        <p className="text-sm text-gray-400 mt-1">
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
