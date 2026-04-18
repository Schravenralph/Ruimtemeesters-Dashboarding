import { useEffect, useState } from 'react';
import { Calendar, Plus, Trash2, Play, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../../services/api/client.js';
import { Button } from '../ui/Button.js';

interface Schedule {
  id: string;
  data_source_key: string;
  source_name: string;
  cron_expression: string;
  timezone: string;
  year_filter: number | null;
  is_enabled: boolean;
  notify_email: boolean;
  notify_in_app: boolean;
  notify_on: 'always' | 'failure' | 'never';
  last_run_at: string | null;
  last_run_status: 'success' | 'partial' | 'failed' | null;
  created_at: string;
  updated_at: string;
}

interface DataSource {
  key: string;
  name: string;
  has_sync: boolean;
}

const CRON_PRESETS: { label: string; value: string }[] = [
  { label: 'Dagelijks 03:00', value: '0 3 * * *' },
  { label: 'Wekelijks zondag 04:00', value: '0 4 * * 0' },
  { label: 'Maandelijks 1e 05:00', value: '0 5 1 * *' },
  { label: 'Ieder uur', value: '0 * * * *' },
];

const STATUS_STYLES: Record<string, string> = {
  success: 'bg-green-100 text-green-700',
  partial: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
};

export function SyncScheduleManager() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [sources, setSources] = useState<DataSource[]>([]);
  // Split the initial-mount load from subsequent refreshes so mutations don't
  // flash the entire component (and blow away input focus) behind a spinner.
  const [initialLoading, setInitialLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New schedule form
  const [form, setForm] = useState({
    dataSourceKey: '',
    cronExpression: '0 3 * * *',
    timezone: 'Europe/Amsterdam',
    yearFilter: '',
    notifyEmail: true,
    notifyInApp: true,
    notifyOn: 'failure' as 'always' | 'failure' | 'never',
  });

  async function load() {
    try {
      const [scheds, status] = await Promise.all([
        api.get<{ schedules: Schedule[] }>('/sync/schedules'),
        api.get<{ dataSources: DataSource[] }>('/sync/status'),
      ]);
      setSchedules(scheds.schedules);
      setSources(status.dataSources.filter((ds) => ds.has_sync));
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Laden mislukt' });
    } finally {
      setInitialLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createSchedule() {
    if (!form.dataSourceKey) {
      setMessage({ type: 'error', text: 'Kies een databron.' });
      return;
    }
    setCreating(true);
    setMessage(null);
    try {
      await api.post('/sync/schedules', {
        dataSourceKey: form.dataSourceKey,
        cronExpression: form.cronExpression,
        timezone: form.timezone,
        yearFilter: form.yearFilter ? parseInt(form.yearFilter, 10) : null,
        notifyEmail: form.notifyEmail,
        notifyInApp: form.notifyInApp,
        notifyOn: form.notifyOn,
      });
      setMessage({ type: 'success', text: 'Schema aangemaakt.' });
      // Callback form avoids discarding concurrent edits to other fields
      // that happened while the POST was in flight.
      setForm(prev => ({ ...prev, dataSourceKey: '', yearFilter: '' }));
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Aanmaken mislukt' });
    } finally {
      setCreating(false);
    }
  }

  async function toggleEnabled(s: Schedule) {
    try {
      await api.patch(`/sync/schedules/${s.id}`, { isEnabled: !s.is_enabled });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Update mislukt' });
    }
  }

  async function removeSchedule(id: string) {
    if (!confirm('Dit schema verwijderen?')) return;
    try {
      await api.delete(`/sync/schedules/${id}`);
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Verwijderen mislukt' });
    }
  }

  async function runNow(id: string) {
    try {
      await api.post(`/sync/schedules/${id}/run`);
      setMessage({ type: 'success', text: 'Schema gestart. Ververs voor resultaat.' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Start mislukt' });
    }
  }

  if (initialLoading) return <p className="text-gray-500 py-4">Schema's laden…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-gray-500" />
        <h3 className="font-medium text-gray-900">Sync schema's</h3>
        <span className="text-xs text-gray-400">Automatische CBS sync met notificaties</span>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* New schedule form */}
      <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
        <p className="text-sm font-medium text-gray-900">Nieuw schema</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm space-y-1">
            <span className="text-gray-600">Databron</span>
            <select
              value={form.dataSourceKey}
              onChange={(e) => setForm({ ...form, dataSourceKey: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md bg-white"
            >
              <option value="">— kies —</option>
              {sources.map((s) => (
                <option key={s.key} value={s.key}>{s.name} ({s.key})</option>
              ))}
            </select>
          </label>
          <label className="text-sm space-y-1">
            <span className="text-gray-600">Cron expressie</span>
            <div className="flex gap-2">
              <input
                value={form.cronExpression}
                onChange={(e) => setForm({ ...form, cronExpression: e.target.value })}
                className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md font-mono text-xs"
                placeholder="0 3 * * *"
              />
              <select
                onChange={(e) => e.target.value && setForm({ ...form, cronExpression: e.target.value })}
                value=""
                className="px-2 py-1.5 border border-gray-300 rounded-md bg-white text-xs"
              >
                <option value="">preset…</option>
                {CRON_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </label>
          <label className="text-sm space-y-1">
            <span className="text-gray-600">Jaar filter (optioneel)</span>
            <input
              type="number" min={2000} max={2060}
              value={form.yearFilter}
              onChange={(e) => setForm({ ...form, yearFilter: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md"
              placeholder="Alle jaren"
            />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-gray-600">Notificaties</span>
            <select
              value={form.notifyOn}
              onChange={(e) => setForm({ ...form, notifyOn: e.target.value as 'always' | 'failure' | 'never' })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md bg-white"
            >
              <option value="always">Altijd</option>
              <option value="failure">Alleen bij fouten</option>
              <option value="never">Nooit</option>
            </select>
          </label>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.notifyEmail} onChange={(e) => setForm({ ...form, notifyEmail: e.target.checked })} />
            Email
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.notifyInApp} onChange={(e) => setForm({ ...form, notifyInApp: e.target.checked })} />
            In-app
          </label>
          <div className="flex-1" />
          <Button onClick={createSchedule} disabled={creating}>
            <Plus className="w-4 h-4 mr-1" />
            {creating ? 'Aanmaken…' : 'Toevoegen'}
          </Button>
        </div>
      </div>

      {/* Existing schedules */}
      {schedules.length === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center">Nog geen schema's aangemaakt.</p>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-3 py-2">Bron</th>
                <th className="px-3 py-2">Cron</th>
                <th className="px-3 py-2">Tz</th>
                <th className="px-3 py-2">Notif.</th>
                <th className="px-3 py-2">Laatste run</th>
                <th className="px-3 py-2">Actief</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {schedules.map((s) => (
                <tr key={s.id} className={s.is_enabled ? '' : 'bg-gray-50 text-gray-400'}>
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900">{s.source_name}</div>
                    <div className="text-xs text-gray-500">{s.data_source_key}</div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {s.cron_expression}
                    {s.year_filter && <span className="ml-1 text-gray-400">· {s.year_filter}</span>}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500">{s.timezone}</td>
                  <td className="px-3 py-2 text-xs">
                    <span className="text-gray-700">{s.notify_on === 'always' ? 'Altijd' : s.notify_on === 'failure' ? 'Fouten' : 'Nooit'}</span>
                    <div className="text-gray-400">
                      {s.notify_email && 'email '}{s.notify_in_app && 'in-app'}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {s.last_run_at ? (
                      <>
                        <div className="text-xs text-gray-700">{new Date(s.last_run_at).toLocaleString('nl-NL')}</div>
                        {s.last_run_status && (
                          <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_STYLES[s.last_run_status] || 'bg-gray-100'}`}>
                            {s.last_run_status}
                          </span>
                        )}
                      </>
                    ) : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="px-3 py-2">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={s.is_enabled}
                        onChange={() => toggleEnabled(s)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-checked:bg-blue-600 rounded-full relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                    </label>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => runNow(s.id)} title="Nu draaien" className="text-blue-600 hover:text-blue-800 p-1">
                      <Play className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => removeSchedule(s.id)} title="Verwijderen" className="text-red-600 hover:text-red-800 p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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
