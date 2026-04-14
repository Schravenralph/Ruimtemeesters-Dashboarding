import { useEffect, useState } from 'react';
import { RefreshCw, Database, CheckCircle, AlertCircle, Play, Brain } from 'lucide-react';
import { api } from '../../services/api/client.js';
import { Button } from '../ui/Button.js';

interface TableStatus {
  table: string;
  totalRows: number;
  sources: { source: string; count: number }[];
  minYear: number | null;
  maxYear: number | null;
}

interface DataSource {
  key: string;
  name: string;
  supercategory: string;
  table_name: string;
  cbs_table_id: string | null;
  has_sync: boolean;
}

interface SyncStatus {
  tables: TableStatus[];
  dataSources: DataSource[];
  legacySources: string[];
}

const TABLE_LABELS: Record<string, string> = {
  data_bevolking: 'Bevolking',
  data_huishoudens: 'Huishoudens',
  data_woningen: 'Woningen',
  data_woningtekort: 'Woningtekort',
  data_energie: 'Energie',
  data_emissies: 'Emissies',
  data_hernieuwbaar: 'Hernieuwbare Energie',
  data_afval: 'Afval & Circulair',
};

export function DataSyncPanel() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncYear, setSyncYear] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [tsaStatus, setTsaStatus] = useState<{ health: { status: string }; models: { models_available: string[]; last_forecast_run: string; last_forecast_gemeenten: number; total_forecast_rows: number } | null } | null>(null);
  const [forecastRunning, setForecastRunning] = useState(false);

  async function loadStatus() {
    setLoading(true);
    try {
      const [data, tsa] = await Promise.all([
        api.get<SyncStatus>('/sync/status'),
        api.get<typeof tsaStatus>('/sync/forecast/status').catch(() => null),
      ]);
      setStatus(data);
      setTsaStatus(tsa);
    } catch (err) {
      console.error('Failed to load sync status:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadStatus(); }, []);

  async function runForecast() {
    setForecastRunning(true);
    setMessage(null);
    try {
      await api.post('/sync/forecast');
      setMessage({ type: 'success', text: 'Prognose gestart. Dit kan enkele minuten duren.' });
    } catch {
      setMessage({ type: 'error', text: 'Prognose starten mislukt — TSA engine niet bereikbaar.' });
    } finally {
      setForecastRunning(false);
    }
  }

  async function runSync(source?: string) {
    const key = source || 'all';
    setSyncing(key);
    setMessage(null);
    try {
      const year = syncYear ? parseInt(syncYear, 10) : undefined;
      await api.post('/sync/run', { source, year });
      setMessage({ type: 'success', text: `Sync gestart voor ${source || 'alle bronnen'}${year ? ` (${year})` : ''}. Ververs na een paar minuten.` });
    } catch {
      setMessage({ type: 'error', text: 'Sync starten mislukt.' });
    } finally {
      setSyncing(null);
    }
  }

  if (loading) return <p className="text-gray-500 py-4">Status laden...</p>;
  if (!status) return <p className="text-red-500 py-4">Kon sync status niet laden.</p>;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <Button onClick={() => runSync()} disabled={syncing !== null}>
          <Play className="w-4 h-4 mr-1" />
          {syncing === 'all' ? 'Bezig...' : 'Alles syncen'}
        </Button>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Jaar filter:</label>
          <input
            type="number"
            min={2000}
            max={2060}
            placeholder="Alle jaren"
            value={syncYear}
            onChange={(e) => setSyncYear(e.target.value)}
            className="w-28 px-2 py-1.5 border border-gray-300 rounded-md text-sm"
          />
        </div>
        <Button variant="secondary" onClick={loadStatus}>
          <RefreshCw className="w-4 h-4 mr-1" />
          Ververs
        </Button>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* TSA Forecast Engine */}
      {tsaStatus && (
        <div className="border border-purple-200 bg-purple-50/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              <h3 className="font-medium text-gray-900">TSA Prognose Engine</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full ${tsaStatus.health.status === 'ok' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {tsaStatus.health.status}
              </span>
            </div>
            <Button onClick={runForecast} disabled={forecastRunning || tsaStatus.health.status !== 'ok'}>
              <Play className="w-4 h-4 mr-1" />
              {forecastRunning ? 'Bezig...' : 'Prognose draaien'}
            </Button>
          </div>
          {tsaStatus.models && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-gray-500 text-xs">Modellen</p>
                <p className="font-medium">{tsaStatus.models.models_available.length}</p>
                <p className="text-xs text-gray-400">{tsaStatus.models.models_available.join(', ')}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Laatste run</p>
                <p className="font-medium">{tsaStatus.models.last_forecast_run ? new Date(tsaStatus.models.last_forecast_run).toLocaleDateString('nl-NL') : '—'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Gemeenten</p>
                <p className="font-medium">{tsaStatus.models.last_forecast_gemeenten}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Prognose rijen</p>
                <p className="font-medium">{tsaStatus.models.total_forecast_rows.toLocaleString('nl-NL')}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Table status grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {status.tables.map((t) => {
          const sourceName = t.table.replace('data_', '');
          const isLegacy = status.legacySources.includes(sourceName);
          const dsEntry = status.dataSources.find((ds) => ds.table_name === t.table);
          const canSync = isLegacy || dsEntry?.has_sync;

          return (
            <div key={t.table} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-gray-400" />
                  <h3 className="font-medium text-gray-900">{TABLE_LABELS[t.table] || t.table}</h3>
                </div>
                {canSync && (
                  <button
                    onClick={() => runSync(sourceName)}
                    disabled={syncing !== null}
                    className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400 flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${syncing === sourceName ? 'animate-spin' : ''}`} />
                    Sync
                  </button>
                )}
              </div>

              <div className="text-2xl font-bold text-gray-900 mb-1">
                {t.totalRows.toLocaleString('nl-NL')}
                <span className="text-sm font-normal text-gray-500 ml-1">rijen</span>
              </div>

              {t.minYear && t.maxYear && (
                <p className="text-xs text-gray-500 mb-2">
                  Periode: {t.minYear} — {t.maxYear}
                </p>
              )}

              {t.sources.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {t.sources.map((s) => (
                    <span
                      key={s.source}
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        s.source === 'cbs_prognose'
                          ? 'bg-yellow-100 text-yellow-700'
                          : s.source === 'ruimtemeesters_prognose'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {s.source}: {s.count.toLocaleString('nl-NL')}
                    </span>
                  ))}
                </div>
              )}

              {t.totalRows === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  {canSync ? 'Geen data — klik Sync om te laden' : 'Geen data — sync config ontbreekt'}
                </p>
              )}

              {dsEntry && (
                <p className="text-xs text-gray-400 mt-2">
                  {dsEntry.cbs_table_id ? `CBS: ${dsEntry.cbs_table_id}` : 'Berekend'} · {dsEntry.supercategory}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
