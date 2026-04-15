import { useState, useEffect } from 'react';
import { Search, Database, RefreshCw, Filter, ExternalLink, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { api } from '../services/api/client';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/SearchInput';
import { formatCompact } from '../utils/format';

interface CatalogTable {
  identifier: string;
  title: string;
  shortTitle: string;
  summary: string;
  frequency: string;
  period: string;
  recordCount: number;
  modified: string;
  themes: string[];
  isActivated: boolean;
  dataSourceKey: string | null;
}

interface CatalogStats {
  totalTables: number;
  activatedTables: number;
  lastSync: { tables: number; at: string } | null;
}

const FREQUENCY_LABELS: Record<string, string> = {
  Perjaar: 'Jaarlijks',
  Perkwartaal: 'Kwartaal',
  Permaand: 'Maandelijks',
  Eenmalig: 'Eenmalig',
  Stopgezet: 'Stopgezet',
  Onregelmatig: 'Onregelmatig',
};

const PAGE_SIZE = 25;

export function CatalogPage() {
  const [tables, setTables] = useState<CatalogTable[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('');
  const [selectedFreq, setSelectedFreq] = useState('');
  const [themes, setThemes] = useState<string[]>([]);
  const [stats, setStats] = useState<CatalogStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<{ themes: string[] }>('/catalog/themes').catch(() => ({ themes: [] })),
      api.get<CatalogStats>('/catalog/stats').catch(() => null),
    ]).then(([t, s]) => {
      setThemes(t.themes);
      setStats(s);
    });
  }, []);

  useEffect(() => {
    setIsLoading(true);
    api.get<{ tables: CatalogTable[]; total: number }>('/catalog', {
      search: search || undefined,
      theme: selectedTheme || undefined,
      frequency: selectedFreq || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    } as Record<string, string | number>)
      .then(data => {
        setTables(data.tables);
        setTotal(data.total);
      })
      .catch(() => { setTables([]); setTotal(0); })
      .finally(() => setIsLoading(false));
  }, [search, selectedTheme, selectedFreq, page]);

  async function handleSync() {
    setIsSyncing(true);
    try {
      await api.post('/catalog/sync');
      // Poll for completion
      setTimeout(() => {
        api.get<CatalogStats>('/catalog/stats').then(setStats).catch(() => {});
        setIsSyncing(false);
      }, 5000);
    } catch {
      setIsSyncing(false);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CBS Data Catalogus</h1>
          <p className="text-sm text-gray-500 mt-1">
            {stats
              ? `${stats.totalTables.toLocaleString('nl-NL')} beschikbare CBS tabellen · ${stats.activatedTables} geactiveerd`
              : 'Catalogus laden...'}
          </p>
        </div>
        <Button onClick={handleSync} disabled={isSyncing} variant="secondary">
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Synchroniseren...' : 'Catalogus verversen'}
        </Button>
      </div>

      {stats?.totalTables === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center mb-6">
          <Database className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900">Catalogus nog niet gesynchroniseerd</h3>
          <p className="text-sm text-gray-600 mt-1 mb-4">
            Klik op "Catalogus verversen" om ~5.900 CBS tabellen op te halen.
          </p>
          <Button onClick={handleSync} disabled={isSyncing}>
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            Nu synchroniseren
          </Button>
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-[250px]">
          <SearchInput
            placeholder="Zoek op titel, samenvatting of tabel-ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            onClear={() => { setSearch(''); setPage(0); }}
          />
        </div>

        <select
          value={selectedTheme}
          onChange={(e) => { setSelectedTheme(e.target.value); setPage(0); }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Alle thema's</option>
          {themes.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          value={selectedFreq}
          onChange={(e) => { setSelectedFreq(e.target.value); setPage(0); }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Alle frequenties</option>
          <option value="Perjaar">Jaarlijks</option>
          <option value="Perkwartaal">Kwartaal</option>
          <option value="Permaand">Maandelijks</option>
        </select>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">
          {total.toLocaleString('nl-NL')} resultaten
          {search && ` voor "${search}"`}
        </p>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span>{page + 1} / {totalPages || 1}</span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Table list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="rounded-lg border border-gray-200 bg-white p-4 h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {tables.map(table => (
            <div
              key={table.identifier}
              className={`rounded-lg border p-4 transition-colors ${
                table.isActivated
                  ? 'border-green-200 bg-green-50/30'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                      {table.identifier}
                    </code>
                    <span className="text-xs text-gray-400">
                      {FREQUENCY_LABELS[table.frequency] || table.frequency}
                    </span>
                    {table.period && (
                      <span className="text-xs text-gray-400">{table.period}</span>
                    )}
                    {table.isActivated && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                        <CheckCircle className="h-3 w-3" />
                        Geactiveerd
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 line-clamp-1">{table.title}</h3>
                  {table.summary && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{table.summary}</p>
                  )}
                  {table.themes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {table.themes.slice(0, 4).map(t => (
                        <span key={t} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                          {t}
                        </span>
                      ))}
                      {table.themes.length > 4 && (
                        <span className="text-[10px] text-gray-400">+{table.themes.length - 4}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  {table.recordCount > 0 && (
                    <p className="text-sm font-medium text-gray-900">{formatCompact(table.recordCount)}</p>
                  )}
                  <p className="text-xs text-gray-400">rijen</p>
                  <a
                    href={`https://opendata.cbs.nl/statline/#/CBS/nl/dataset/${table.identifier}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    StatLine
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Last sync info */}
      {stats?.lastSync && (
        <p className="text-xs text-gray-400 mt-4 text-center">
          Catalogus laatst gesynchroniseerd: {new Date(stats.lastSync.at).toLocaleString('nl-NL')}
        </p>
      )}
    </div>
  );
}
