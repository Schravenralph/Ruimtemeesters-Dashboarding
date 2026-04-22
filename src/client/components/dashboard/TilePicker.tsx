import { useCallback, useEffect, useState } from 'react';
import {
  X, BarChart3, LineChart, PieChart, Radar, Table, Map, LayoutGrid,
  Database, CheckCircle, Zap, Calendar,
} from 'lucide-react';
import type { ThemeConfig, TileConfig, ChartType } from '@shared/api/contracts';
import { Button } from '../ui/Button';
import { SearchInput } from '../ui/SearchInput';
import { api } from '../../services/api/client';
import { useToast } from '../ui/Toast';
import { GEO_LEVEL_LABELS } from '../../utils/geo';
import { QuickActivateDialog } from './QuickActivateDialog';

interface TilePickerProps {
  themes: ThemeConfig[];
  onSelect: (tile: TileConfig) => void;
  onClose: () => void;
  /** Called after a catalogue activation succeeds so the parent can
   *  re-fetch themes. Must return the fresh themes array — relying on the
   *  re-rendered `themes` prop inside a setTimeout closure reads the stale
   *  pre-activation list (closures capture at creation, not execution). */
  onThemesChanged?: () => Promise<ThemeConfig[]>;
}

interface CatalogRow {
  identifier: string;
  title: string;
  shortTitle: string;
  summary: string;
  frequency: string;
  period: string;
  recordCount: number;
  themes: string[];
  isActivated: boolean;
  dataSourceKey: string | null;
  metadata?: {
    geoLevels?: string[];
    periodRange?: { min: number; max: number } | null;
    dimensions?: unknown[];
  } | null;
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

const CATALOG_PAGE_SIZE = 15;

export function TilePicker({ themes, onSelect, onClose, onThemesChanged }: TilePickerProps) {
  const [tab, setTab] = useState<'themes' | 'catalog'>('themes');
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const { showToast } = useToast();

  const filteredTheme = selectedTheme
    ? themes.find(t => t.id === selectedTheme)
    : null;
  const allTiles = selectedTheme && filteredTheme
    ? filteredTheme.tiles
    : themes.flatMap(t => t.tiles);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-8">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-2xl">
        {/* Header + tabs */}
        <div className="border-b">
          <div className="flex items-center justify-between px-6 py-4">
            <h2 className="text-lg font-semibold">Tegel toevoegen</h2>
            <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex gap-1 px-6">
            <TabButton active={tab === 'themes'} onClick={() => setTab('themes')}>
              Bestaande tegels
            </TabButton>
            <TabButton active={tab === 'catalog'} onClick={() => setTab('catalog')}>
              <Database className="h-3.5 w-3.5" />
              Uit CBS catalogus
            </TabButton>
          </div>
        </div>

        {tab === 'themes' ? (
          <ThemesTab
            themes={themes}
            selectedTheme={selectedTheme}
            setSelectedTheme={setSelectedTheme}
            tiles={allTiles}
            onSelect={onSelect}
          />
        ) : (
          <CatalogTab
            themes={themes}
            setSelectedTheme={setSelectedTheme}
            setTab={setTab}
            showToast={showToast}
            onThemesChanged={onThemesChanged}
          />
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-2 -mb-px border-b-2 text-sm ${
        active
          ? 'border-blue-500 text-blue-600 font-medium'
          : 'border-transparent text-gray-600 hover:text-gray-900'
      }`}
    >
      {children}
    </button>
  );
}

function ThemesTab({
  themes, selectedTheme, setSelectedTheme, tiles, onSelect,
}: {
  themes: ThemeConfig[];
  selectedTheme: string | null;
  setSelectedTheme: (id: string | null) => void;
  tiles: TileConfig[];
  onSelect: (tile: TileConfig) => void;
}) {
  return (
    <>
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

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 gap-3">
          {tiles.map(tile => {
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

        {tiles.length === 0 && (
          <p className="text-center text-gray-500 py-8">Geen tegels beschikbaar</p>
        )}
      </div>
    </>
  );
}

function CatalogTab({
  themes, setSelectedTheme, setTab, showToast, onThemesChanged,
}: {
  themes: ThemeConfig[];
  setSelectedTheme: (id: string | null) => void;
  setTab: (t: 'themes' | 'catalog') => void;
  showToast: (type: 'success' | 'error' | 'info', msg: string) => void;
  onThemesChanged?: () => Promise<ThemeConfig[]>;
}) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<CatalogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [activateTarget, setActivateTarget] = useState<CatalogRow | null>(null);

  useEffect(() => {
    // Debounce keystrokes AND guard against an in-flight request landing
    // after the user typed more characters: the `cancelled` ref ensures a
    // stale response can never overwrite fresh results or clear a spinner
    // that a newer request is relying on.
    let cancelled = false;
    setIsLoading(true);
    const t = setTimeout(() => {
      api.get<{ tables: CatalogRow[]; total: number }>('/catalog', {
        search: search || undefined,
        limit: CATALOG_PAGE_SIZE,
        offset: 0,
      } as Record<string, string | number>)
        .then(data => {
          if (cancelled) return;
          setResults(data.tables);
          setTotal(data.total);
        })
        .catch(() => {
          if (cancelled) return;
          setResults([]);
          setTotal(0);
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [search]);

  const jumpToExistingTheme = useCallback(async (dataSourceKey: string) => {
    // `data_source_key` on cbs_catalog matches the theme slug set by the
    // activation endpoint. Look in current themes first; if missing, ask
    // the parent to refresh and use the returned list directly (don't
    // trust the closure to see the re-rendered prop).
    const local = themes.find(t => t.slug === dataSourceKey);
    if (local) {
      setSelectedTheme(local.id);
      setTab('themes');
      return;
    }
    const fresh = (await onThemesChanged?.()) ?? [];
    const matched = fresh.find(t => t.slug === dataSourceKey);
    if (matched) setSelectedTheme(matched.id);
    setTab('themes');
  }, [themes, setSelectedTheme, setTab, onThemesChanged]);

  const handleRowClick = useCallback((row: CatalogRow) => {
    if (row.isActivated && row.dataSourceKey) {
      void jumpToExistingTheme(row.dataSourceKey);
      return;
    }
    setActivateTarget(row);
  }, [jumpToExistingTheme]);

  const handleActivated = useCallback(async (result: { themeSlug: string }) => {
    setActivateTarget(null);
    showToast('success', 'Tabel geactiveerd. Data sync loopt op de achtergrond — tegel vult zich binnen 5–30s.');
    // onThemesChanged returns the fresh themes array. We use it directly
    // instead of relying on the `themes` prop, which is the closure-at-
    // creation snapshot and hasn't re-rendered yet with the new theme.
    // `themeSlug` is authoritative (server safeKey), not whatever the
    // client proposed — ensures lookup matches even if the server
    // sanitiser diverges from the client's pre-submit cleaning.
    const fresh = (await onThemesChanged?.()) ?? [];
    const newTheme = fresh.find(t => t.slug === result.themeSlug);
    if (newTheme) setSelectedTheme(newTheme.id);
    else setSelectedTheme(null); // fall back to "all themes" view
    setTab('themes');
  }, [showToast, onThemesChanged, setSelectedTheme, setTab]);

  return (
    <>
      <div className="border-b px-6 py-3">
        <SearchInput
          placeholder="Zoek op titel, samenvatting of tabel-ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
        />
        <p className="text-xs text-gray-400 mt-2">
          {total.toLocaleString('nl-NL')} CBS tabellen beschikbaar · klik om te activeren en meteen een tegel te maken
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-lg border border-gray-200 bg-white p-3 h-16 animate-pulse" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            {search ? `Geen resultaten voor "${search}"` : 'Geen resultaten'}
          </p>
        ) : (
          <div className="space-y-2">
            {results.map(row => (
              <button
                key={row.identifier}
                onClick={() => handleRowClick(row)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  row.isActivated
                    ? 'border-green-200 bg-green-50/30 hover:border-green-300'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 shrink-0">
                    {row.isActivated
                      ? <CheckCircle className="h-4 w-4 text-green-600" />
                      : <Zap className="h-4 w-4 text-blue-600" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <code className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1 py-0.5 rounded">
                        {row.identifier}
                      </code>
                      {row.isActivated && (
                        <span className="text-[10px] text-green-700">Al geactiveerd — toon tegels →</span>
                      )}
                    </div>
                    <p className="font-medium text-gray-900 text-sm line-clamp-1 mt-0.5">{row.title}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-gray-500">
                      {row.metadata?.geoLevels?.length ? (
                        <span className="flex items-center gap-1">
                          <Map className="h-3 w-3 text-gray-400" />
                          {row.metadata.geoLevels.map(l => GEO_LEVEL_LABELS[l] || l).join(' · ')}
                        </span>
                      ) : null}
                      {row.metadata?.periodRange && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          {row.metadata.periodRange.min}–{row.metadata.periodRange.max}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {activateTarget && (
        <QuickActivateDialog
          identifier={activateTarget.identifier}
          title={activateTarget.title}
          themes={activateTarget.themes}
          onClose={() => setActivateTarget(null)}
          onActivated={handleActivated}
        />
      )}
    </>
  );
}
