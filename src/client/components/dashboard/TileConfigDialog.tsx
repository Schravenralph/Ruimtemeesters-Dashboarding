import { useState, useEffect } from 'react';
import { Settings, X, Palette, BarChart3, Filter, Maximize2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { getDimensions } from '../../services/api/data';
import type { TileConfig, ChartType, GeoLevel, Dimension } from '@shared/api/contracts';

interface TileConfigDialogProps {
  tile: TileConfig;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updates: Partial<TileConfig>) => void;
}

const CHART_TYPE_OPTIONS = [
  { value: 'bar', label: 'Staafdiagram' },
  { value: 'stacked-bar', label: 'Gestapeld staafdiagram' },
  { value: 'horizontal-bar', label: 'Horizontaal staafdiagram' },
  { value: 'line', label: 'Lijndiagram' },
  { value: 'stacked-area', label: 'Gestapeld vlakdiagram' },
  { value: 'pie', label: 'Taartdiagram' },
  { value: 'donut', label: 'Donutdiagram' },
  { value: 'radar', label: 'Radardiagram' },
  { value: 'table', label: 'Tabel' },
  { value: 'color-table', label: 'Kleurentabel' },
  { value: 'number', label: 'Getal (KPI)' },
  { value: 'treemap', label: 'Treemap' },
  { value: 'heatmap', label: 'Heatmap' },
  { value: 'waterfall', label: 'Watervaldiagram' },
  { value: 'choropleth', label: 'Kaart (vlakken)' },
  { value: 'pyramid', label: 'Bevolkingspiramide' },
];

const GEO_LEVEL_OPTIONS = [
  { value: 'land', label: 'Land' },
  { value: 'provincie', label: 'Provincie' },
  { value: 'corop', label: 'COROP' },
  { value: 'gemeente', label: 'Gemeente' },
];

const COLOR_SCHEMES = [
  { value: 'default', label: 'Standaard (blauw)', colors: ['#3b82f6', '#60a5fa', '#93c5fd'] },
  { value: 'warm', label: 'Warm (rood/oranje)', colors: ['#ef4444', '#f97316', '#fbbf24'] },
  { value: 'cool', label: 'Koel (groen/teal)', colors: ['#10b981', '#14b8a6', '#06b6d4'] },
  { value: 'purple', label: 'Paars', colors: ['#8b5cf6', '#a78bfa', '#c4b5fd'] },
  { value: 'earth', label: 'Aardtinten', colors: ['#92400e', '#b45309', '#d97706'] },
  { value: 'contrast', label: 'Hoog contrast', colors: ['#1e40af', '#dc2626', '#16a34a'] },
  { value: 'pastel', label: 'Pastel', colors: ['#93c5fd', '#fca5a5', '#86efac'] },
  { value: 'monochrome', label: 'Monochroom', colors: ['#1f2937', '#6b7280', '#d1d5db'] },
];

const SIZE_OPTIONS = [
  { value: '1x1', label: 'Klein (1×1)' },
  { value: '2x1', label: 'Breed (2×1)' },
  { value: '1x2', label: 'Hoog (1×2)' },
  { value: '2x2', label: 'Groot (2×2)' },
  { value: '3x1', label: 'Volledig breed (3×1)' },
  { value: '3x2', label: 'Volledig groot (3×2)' },
];

const SORT_OPTIONS = [
  { value: 'default', label: 'Standaard' },
  { value: 'value-asc', label: 'Waarde (oplopend)' },
  { value: 'value-desc', label: 'Waarde (aflopend)' },
  { value: 'label-asc', label: 'Label (A-Z)' },
  { value: 'label-desc', label: 'Label (Z-A)' },
];

type Tab = 'general' | 'chart' | 'filter' | 'display';

export function TileConfigDialog({ tile, isOpen, onClose, onUpdate }: TileConfigDialogProps) {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [title, setTitle] = useState(tile.title);
  const [chartType, setChartType] = useState<string>(tile.chartType);
  const [defaultGeoLevel, setDefaultGeoLevel] = useState<string>(tile.defaultGeoLevel || 'gemeente');
  const [description, setDescription] = useState(tile.description || '');

  // Config fields (stored in tile.config)
  const cfg = tile.config || {};
  const [colorScheme, setColorScheme] = useState<string>((cfg.colorScheme as string) || 'default');
  const [showLegend, setShowLegend] = useState<boolean>((cfg.showLegend as boolean) ?? true);
  const [showLabels, setShowLabels] = useState<boolean>((cfg.showLabels as boolean) ?? false);
  const [showGrid, setShowGrid] = useState<boolean>((cfg.showGrid as boolean) ?? true);
  const [sortOrder, setSortOrder] = useState<string>((cfg.sortOrder as string) || 'default');
  const [maxItems, setMaxItems] = useState<number>((cfg.maxItems as number) || 0);
  const [tileSize, setTileSize] = useState<string>((cfg.tileSize as string) || '1x1');
  const [showTotals, setShowTotals] = useState<boolean>((cfg.showTotals as boolean) ?? false);
  const [filterDimension, setFilterDimension] = useState<string>((cfg.filterDimension as string) || '');
  const [filterValue, setFilterValue] = useState<string>((cfg.filterValue as string) || '');
  const [showPrognose, setShowPrognose] = useState<boolean>((cfg.showPrognose as boolean) ?? true);
  const [yAxisMin, setYAxisMin] = useState<string>((cfg.yAxisMin as string) || '');
  const [yAxisMax, setYAxisMax] = useState<string>((cfg.yAxisMax as string) || '');

  // Load available dimensions for the data source
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  useEffect(() => {
    if (tile.dataSource) {
      getDimensions(tile.dataSource).then(r => setDimensions(r.dimensions)).catch(() => {});
    }
  }, [tile.dataSource]);

  function handleSave() {
    onUpdate({
      title,
      chartType: chartType as ChartType,
      defaultGeoLevel: defaultGeoLevel as TileConfig['defaultGeoLevel'],
      description: description || undefined,
      config: {
        colorScheme,
        showLegend,
        showLabels,
        showGrid,
        sortOrder,
        maxItems: maxItems || undefined,
        tileSize,
        showTotals,
        filterDimension: filterDimension || undefined,
        filterValue: filterValue || undefined,
        showPrognose,
        yAxisMin: yAxisMin ? parseFloat(yAxisMin) : undefined,
        yAxisMax: yAxisMax ? parseFloat(yAxisMax) : undefined,
      },
    });
    onClose();
  }

  const tabs: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
    { key: 'general', label: 'Algemeen', icon: <Settings className="h-4 w-4" /> },
    { key: 'chart', label: 'Grafiek', icon: <BarChart3 className="h-4 w-4" /> },
    { key: 'filter', label: 'Filter', icon: <Filter className="h-4 w-4" /> },
    { key: 'display', label: 'Weergave', icon: <Palette className="h-4 w-4" /> },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tegel configureren" maxWidth="lg">
      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-4 min-h-[300px]">
        {/* GENERAL TAB */}
        {activeTab === 'general' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <Select
              label="Grafiektype"
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              options={CHART_TYPE_OPTIONS}
            />

            <Select
              label="Standaard gebiedsniveau"
              value={defaultGeoLevel}
              onChange={(e) => setDefaultGeoLevel(e.target.value)}
              options={GEO_LEVEL_OPTIONS}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Beschrijving</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                rows={2}
                placeholder="Optionele beschrijving..."
              />
            </div>

            <Select
              label="Tegelgrootte"
              value={tileSize}
              onChange={(e) => setTileSize(e.target.value)}
              options={SIZE_OPTIONS}
            />

            <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
              <p><strong>Databron:</strong> {tile.dataSource}</p>
              <p><strong>Dimensies:</strong> {tile.dimensions.join(', ') || 'Geen'}</p>
            </div>
          </>
        )}

        {/* CHART TAB */}
        {activeTab === 'chart' && (
          <>
            <Select
              label="Kleurenschema"
              value={colorScheme}
              onChange={(e) => setColorScheme(e.target.value)}
              options={COLOR_SCHEMES.map(s => ({ value: s.value, label: s.label }))}
            />

            {/* Color preview */}
            <div className="flex gap-1">
              {(COLOR_SCHEMES.find(s => s.value === colorScheme)?.colors || []).map((c, i) => (
                <div key={i} className="h-6 w-12 rounded" style={{ backgroundColor: c }} />
              ))}
            </div>

            <Select
              label="Sortering"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              options={SORT_OPTIONS}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max items (0 = alles)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={maxItems}
                onChange={(e) => setMaxItems(parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Y-as minimum</label>
                <input
                  type="number"
                  value={yAxisMin}
                  onChange={(e) => setYAxisMin(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Auto"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Y-as maximum</label>
                <input
                  type="number"
                  value={yAxisMax}
                  onChange={(e) => setYAxisMax(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Auto"
                />
              </div>
            </div>

            {/* Klassenindeling button (for choropleth/color-table) */}
            {(chartType === 'choropleth' || chartType === 'color-table' || chartType === 'heatmap') && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">
                  Gebruik de Klassenindeling editor (beschikbaar in het kaart/tabel menu) voor geavanceerde kleurklasse-instellingen:
                  aantal klassen, methode, kleurenschema, handmatige grenzen.
                </p>
              </div>
            )}
          </>
        )}

        {/* FILTER TAB */}
        {activeTab === 'filter' && (
          <>
            {dimensions.length > 0 ? (
              <>
                <Select
                  label="Filter dimensie"
                  value={filterDimension}
                  onChange={(e) => { setFilterDimension(e.target.value); setFilterValue(''); }}
                  options={[{ value: '', label: '(Geen filter)' }, ...dimensions.map(d => ({ value: d.id, label: d.name }))]}
                />

                {filterDimension && (
                  <Select
                    label="Filter waarde"
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    options={[
                      { value: '', label: '(Alle)' },
                      ...(dimensions.find(d => d.id === filterDimension)?.values || []).map(v => ({
                        value: v.key,
                        label: v.label,
                      })),
                    ]}
                  />
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500">Geen dimensies beschikbaar voor deze databron.</p>
            )}

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="showPrognose"
                checked={showPrognose}
                onChange={(e) => setShowPrognose(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="showPrognose" className="text-sm text-gray-700">
                Prognose tonen (stippellijn)
              </label>
            </div>
          </>
        )}

        {/* DISPLAY TAB */}
        {activeTab === 'display' && (
          <>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showLegend"
                  checked={showLegend}
                  onChange={(e) => setShowLegend(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="showLegend" className="text-sm text-gray-700">Legenda tonen</label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showLabels"
                  checked={showLabels}
                  onChange={(e) => setShowLabels(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="showLabels" className="text-sm text-gray-700">Datalabels tonen</label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showGrid"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="showGrid" className="text-sm text-gray-700">Rasterlijnen tonen</label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showTotals"
                  checked={showTotals}
                  onChange={(e) => setShowTotals(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="showTotals" className="text-sm text-gray-700">Totalen tonen</label>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex gap-2 justify-end pt-4 mt-4 border-t">
        <Button variant="ghost" onClick={onClose}>Annuleren</Button>
        <Button onClick={handleSave}>Opslaan</Button>
      </div>
    </Modal>
  );
}
