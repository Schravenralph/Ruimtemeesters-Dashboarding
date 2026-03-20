import { useState } from 'react';
import { X, BarChart3, LineChart, PieChart, Radar, Table, Map, LayoutGrid } from 'lucide-react';
import type { ThemeConfig, TileConfig, ChartType } from '@shared/api/contracts';
import { Button } from '../ui/Button';

interface TilePickerProps {
  themes: ThemeConfig[];
  onSelect: (tile: TileConfig) => void;
  onClose: () => void;
}

const chartIcons: Record<string, typeof BarChart3> = {
  bar: BarChart3,
  'stacked-bar': LayoutGrid,
  line: LineChart,
  pie: PieChart,
  radar: Radar,
  table: Table,
  choropleth: Map,
};

const chartLabels: Record<string, string> = {
  bar: 'Staafdiagram',
  'stacked-bar': 'Gestapeld staafdiagram',
  line: 'Lijndiagram',
  pie: 'Taartdiagram',
  radar: 'Radardiagram',
  table: 'Tabel',
  choropleth: 'Kaart',
};

export function TilePicker({ themes, onSelect, onClose }: TilePickerProps) {
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);

  const filteredTheme = selectedTheme
    ? themes.find(t => t.id === selectedTheme)
    : null;

  const allTiles = selectedTheme && filteredTheme
    ? filteredTheme.tiles
    : themes.flatMap(t => t.tiles);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-8">
      <div className="flex max-h-[80vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Tegel toevoegen</h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Theme Filter */}
        <div className="border-b px-6 py-3 flex gap-2 flex-wrap">
          <Button
            variant={selectedTheme === null ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setSelectedTheme(null)}
          >
            Alle thema's
          </Button>
          {themes.map(theme => (
            <Button
              key={theme.id}
              variant={selectedTheme === theme.id ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSelectedTheme(theme.id)}
            >
              {theme.name}
            </Button>
          ))}
        </div>

        {/* Tile List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-3">
            {allTiles.map(tile => {
              const Icon = chartIcons[tile.chartType] || BarChart3;
              return (
                <button
                  key={tile.id}
                  onClick={() => onSelect(tile)}
                  className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 text-left hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 shrink-0">
                    <Icon className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{tile.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {chartLabels[tile.chartType] || tile.chartType} · {tile.dataSource}
                    </p>
                    {tile.description && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{tile.description}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {allTiles.length === 0 && (
            <p className="text-center text-gray-500 py-8">Geen tegels beschikbaar</p>
          )}
        </div>
      </div>
    </div>
  );
}
