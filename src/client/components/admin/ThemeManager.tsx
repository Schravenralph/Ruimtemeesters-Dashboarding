import { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, GripVertical, BarChart3, Save } from 'lucide-react';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Card } from '../ui/Card';
import { LoadingOverlay } from '../ui/Spinner';
import { useToast } from '../ui/Toast';
import { listThemes } from '../../services/api/themes';
import { api } from '../../services/api/client';
import type { ThemeConfig } from '@shared/api/contracts';

const CHART_TYPES = [
  { value: 'bar', label: 'Staafdiagram' },
  { value: 'stacked-bar', label: 'Gestapeld staafdiagram' },
  { value: 'line', label: 'Lijndiagram' },
  { value: 'pie', label: 'Taartdiagram' },
  { value: 'radar', label: 'Radardiagram' },
  { value: 'table', label: 'Tabel' },
  { value: 'choropleth', label: 'Kaart' },
];

const DATA_SOURCES = [
  { value: 'bevolking', label: 'Bevolking' },
  { value: 'huishoudens', label: 'Huishoudens' },
  { value: 'woningen', label: 'Woningen' },
  { value: 'woningtekort', label: 'Woningtekort' },
];

export function ThemeManager() {
  const [themes, setThemes] = useState<ThemeConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTheme, setExpandedTheme] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    listThemes()
      .then(({ themes }) => setThemes(themes))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <LoadingOverlay />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Thema's ({themes.length})</h2>
      </div>

      <div className="space-y-3">
        {themes.map(theme => (
          <Card key={theme.id} padding={false}>
            <button
              onClick={() => setExpandedTheme(expandedTheme === theme.id ? null : theme.id)}
              className="flex w-full items-center justify-between px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-gray-300" />
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">{theme.name}</h3>
                  <p className="text-sm text-gray-500">
                    {theme.tiles.length} tegels · /{theme.slug}
                    {theme.isSystem && (
                      <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
                        Systeem
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <Edit3 className="h-4 w-4 text-gray-400" />
            </button>

            {expandedTheme === theme.id && (
              <div className="border-t border-gray-100 px-5 py-4">
                <p className="text-sm text-gray-600 mb-3">{theme.description}</p>

                <h4 className="text-sm font-medium text-gray-700 mb-2">Tegels</h4>
                <div className="space-y-2">
                  {theme.tiles.map((tile, idx) => (
                    <div key={tile.id} className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2">
                      <span className="text-xs text-gray-400 w-5">{idx + 1}</span>
                      <BarChart3 className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-700 flex-1">{tile.title}</span>
                      <span className="text-xs text-gray-400 capitalize">{tile.chartType}</span>
                      <span className="text-xs text-gray-400">{tile.dataSource}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
