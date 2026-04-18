import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { api } from '../../services/api/client.js';
import { useDebounce } from '../../hooks/useDebounce.js';

interface SyncRun {
  id: string;
  data_source_key: string;
  cbs_table_id: string | null;
  trigger: string;
  started_at: string;
  finished_at: string | null;
  status: 'running' | 'success' | 'partial' | 'failed';
  rows_fetched: number;
  rows_inserted: number;
  duration_ms: number | null;
  error_message: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  running: 'bg-blue-100 text-blue-700',
  success: 'bg-green-100 text-green-700',
  partial: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
};

export function SyncRunsLog() {
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState('');
  const debouncedFilter = useDebounce(sourceFilter, 300);
  const requestSeqRef = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    // Track request identity so late responses to stale filters are dropped.
    const requestId = ++requestSeqRef.current;
    try {
      const { runs } = await api.get<{ runs: SyncRun[] }>(
        '/sync/runs',
        debouncedFilter ? { source: debouncedFilter, limit: 50 } : { limit: 50 },
      );
      if (requestId === requestSeqRef.current) setRuns(runs);
    } catch { /* silent */ } finally {
      if (requestId === requestSeqRef.current) setLoading(false);
    }
  }, [debouncedFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Activity className="w-5 h-5 text-gray-500" />
        <h3 className="font-medium text-gray-900">Sync geschiedenis</h3>
        <div className="flex-1" />
        <input
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          placeholder="Filter op bron…"
          className="px-2 py-1 border border-gray-300 rounded text-sm w-48"
        />
        <button onClick={load} className="text-gray-600 hover:text-gray-900 p-1" title="Ververs">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {runs.length === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center">
          {loading ? 'Laden…' : 'Nog geen sync runs geregistreerd.'}
        </p>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-3 py-2">Gestart</th>
                <th className="px-3 py-2">Bron</th>
                <th className="px-3 py-2">Trigger</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Rijen</th>
                <th className="px-3 py-2 text-right">Duur</th>
                <th className="px-3 py-2">Fout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {runs.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 text-xs text-gray-700 whitespace-nowrap">
                    {new Date(r.started_at).toLocaleString('nl-NL')}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900">{r.data_source_key}</div>
                    {r.cbs_table_id && <div className="text-xs text-gray-500">{r.cbs_table_id}</div>}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600">{r.trigger}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${STATUS_STYLES[r.status] || 'bg-gray-100'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-right whitespace-nowrap text-gray-700">
                    {r.rows_inserted.toLocaleString('nl-NL')}
                    <span className="text-gray-400"> / {r.rows_fetched.toLocaleString('nl-NL')}</span>
                  </td>
                  <td className="px-3 py-2 text-xs text-right whitespace-nowrap text-gray-500">
                    {r.duration_ms ? `${(r.duration_ms / 1000).toFixed(1)}s` : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-red-600 max-w-xs truncate" title={r.error_message || ''}>
                    {r.error_message || ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
