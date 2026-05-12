import { useEffect, useState } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { api } from '../../services/api/client';
import type { SyncDemandsAdminRow, SyncDemandsAdminResponse } from '@shared/api/contracts';

export function SyncDemandsAdmin() {
  const [rows, setRows] = useState<SyncDemandsAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get<SyncDemandsAdminResponse>('/admin/sync-demands')
      .then(r => { if (!cancelled) setRows(r.rows); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Kon sync-demands niet ophalen'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="py-8 text-sm text-gray-600">Laden…</div>;
  if (error) return <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>;

  const totalActive = rows.reduce((s, r) => s + r.activeDemandCount, 0);
  const totalExpired = rows.reduce((s, r) => s + r.expiredDemandCount, 0);

  return (
    <div>
      <p className="mb-4 text-sm text-gray-600">
        Per databron — actieve sync-verzoeken (ADR-006). De huidige cron in <code>sync_schedules</code>
        wordt continu door de aggregator bijgewerkt op basis van het strengste verzoek, begrensd door <code>max_frequency_cron</code>.
      </p>

      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-3 py-1 text-blue-800">
          <Clock className="h-4 w-4" /> Actief: <strong>{totalActive}</strong>
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-3 py-1 text-gray-700">
          Verlopen (nog niet gereapt): <strong>{totalExpired}</strong>
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-3 py-1 text-amber-800">
          <AlertCircle className="h-4 w-4" /> Bronnen met activiteit: <strong>{rows.length}</strong>
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="py-4 text-sm text-gray-500">Geen sync-verzoeken (actief of verlopen) op enige databron.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Databron</th>
                <th className="px-4 py-2 text-right font-medium text-gray-700">Actief</th>
                <th className="px-4 py-2 text-right font-medium text-gray-700">Verlopen</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Strengste verzoek</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Huidig schema</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Maximumfrequentie (cap)</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Oudste verloopdatum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {rows.map(r => (
                <tr key={r.dataSourceKey}>
                  <td className="px-4 py-2">
                    <div className="font-medium text-gray-900">{r.name}</div>
                    <div className="text-xs text-gray-400">{r.dataSourceKey}</div>
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-blue-700">{r.activeDemandCount}</td>
                  <td className="px-4 py-2 text-right text-gray-500">{r.expiredDemandCount}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.strictestActiveCron ?? '—'}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.currentScheduleCron ?? '—'}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.maxFrequencyCron ?? '—'}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">{r.oldestExpiry ? new Date(r.oldestExpiry).toLocaleDateString('nl-NL') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
