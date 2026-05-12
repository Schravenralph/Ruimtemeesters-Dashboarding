import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { api } from '../../services/api/client';
import type { ThemeReadinessEntry, ThemeReadinessResponse } from '@shared/api/contracts';

function statusOf(e: ThemeReadinessEntry): 'shipped' | 'broken' | 'partial' {
  if (e.shipped) return 'shipped';
  if (e.tileCount === 0 || e.distinctDataSources.length === 0) return 'broken';
  return 'partial';
}

function StatusCell({ entry }: { entry: ThemeReadinessEntry }) {
  const s = statusOf(entry);
  if (s === 'shipped') {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-green-700">
        <CheckCircle2 className="h-4 w-4" /> Shipped
      </span>
    );
  }
  if (s === 'broken') {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-red-700">
        <XCircle className="h-4 w-4" /> Broken
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-yellow-700">
      <AlertCircle className="h-4 w-4" /> Partial
    </span>
  );
}

export function ThemeReadiness() {
  const [themes, setThemes] = useState<ThemeReadinessEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get<ThemeReadinessResponse>('/admin/themes/readiness')
      .then(r => { if (!cancelled) setThemes(r.themes); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Kon themaprestatie niet ophalen'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="py-8 text-sm text-gray-600">Laden…</div>;
  if (error) return <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>;

  const totals = {
    shipped: themes.filter(t => statusOf(t) === 'shipped').length,
    partial: themes.filter(t => statusOf(t) === 'partial').length,
    broken: themes.filter(t => statusOf(t) === 'broken').length,
  };

  return (
    <div>
      <p className="mb-4 text-sm text-gray-600">
        Per thema — is het 'shipped' volgens ADR-002? Bar: tiles + kpi_config + dashboard_templates row + ten minste één databron.
      </p>

      <div className="mb-4 flex gap-3 text-sm">
        <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-3 py-1 text-green-800">
          <CheckCircle2 className="h-4 w-4" /> Shipped: <strong>{totals.shipped}</strong>
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-yellow-50 px-3 py-1 text-yellow-800">
          <AlertCircle className="h-4 w-4" /> Partial: <strong>{totals.partial}</strong>
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-3 py-1 text-red-800">
          <XCircle className="h-4 w-4" /> Broken: <strong>{totals.broken}</strong>
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Status</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Supercategorie</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Thema</th>
              <th className="px-4 py-2 text-right font-medium text-gray-700">Tiles</th>
              <th className="px-4 py-2 text-right font-medium text-gray-700">KPI's</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Template</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Databronnen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {themes.map(e => (
              <tr key={e.slug}>
                <td className="px-4 py-2"><StatusCell entry={e} /></td>
                <td className="px-4 py-2 text-gray-600">{e.supercategory ?? '—'}</td>
                <td className="px-4 py-2">
                  <div className="font-medium text-gray-900">{e.name}</div>
                  <div className="text-xs text-gray-400">{e.slug}</div>
                </td>
                <td className="px-4 py-2 text-right">{e.tileCount}</td>
                <td className="px-4 py-2 text-right">{e.kpiConfigCount}</td>
                <td className="px-4 py-2 text-gray-600">{e.templateSeeded ? `v${e.templateVersion ?? '?'}` : '—'}</td>
                <td className="px-4 py-2 text-xs text-gray-500">{e.distinctDataSources.join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
