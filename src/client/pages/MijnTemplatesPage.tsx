import { useCallback, useEffect, useState } from 'react';
import { Bookmark, Trash2, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { UserTemplate, UserTemplateVisibility } from '@shared/api/contracts';
import {
  listUserTemplates,
  updateUserTemplate,
  deleteUserTemplate,
} from '../services/api/user-templates';

const VISIBILITY_LABEL: Record<UserTemplateVisibility, string> = {
  private: 'Privé',
  org: 'Organisatie',
  public: 'Publiek',
};

export function MijnTemplatesPage() {
  const [rows, setRows] = useState<UserTemplate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<{ id: string; value: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await listUserTemplates('mine');
      setRows(r);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kon templates niet ophalen');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleVisibility(id: string, visibility: UserTemplateVisibility) {
    const previous = rows?.find(t => t.id === id)?.visibility;
    setRows(prev => (prev ?? []).map(t => (t.id === id ? { ...t, visibility } : t)));
    try {
      const updated = await updateUserTemplate(id, { visibility });
      setRows(prev => (prev ?? []).map(t => (t.id === id ? updated : t)));
    } catch (err) {
      if (previous) {
        setRows(prev => (prev ?? []).map(t => (t.id === id ? { ...t, visibility: previous } : t)));
      }
      setError(err instanceof Error ? err.message : 'Kon zichtbaarheid niet aanpassen');
    }
  }

  async function commitName(id: string) {
    if (!editingName || editingName.id !== id) return;
    const value = editingName.value.trim();
    setEditingName(null);
    if (!value) return;
    const previous = rows?.find(t => t.id === id)?.name;
    if (previous === value) return;
    setRows(prev => (prev ?? []).map(t => (t.id === id ? { ...t, name: value } : t)));
    try {
      const updated = await updateUserTemplate(id, { name: value });
      setRows(prev => (prev ?? []).map(t => (t.id === id ? updated : t)));
    } catch (err) {
      if (previous) {
        setRows(prev => (prev ?? []).map(t => (t.id === id ? { ...t, name: previous } : t)));
      }
      setError(err instanceof Error ? err.message : 'Kon naam niet opslaan');
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Template "${name}" definitief verwijderen?`)) return;
    const snapshot = rows ?? [];
    setRows(prev => (prev ?? []).filter(t => t.id !== id));
    try {
      await deleteUserTemplate(id);
    } catch (err) {
      setRows(snapshot);
      setError(err instanceof Error ? err.message : 'Kon template niet verwijderen');
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Bookmark className="h-6 w-6 text-blue-600" />
            Mijn templates
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Beheer je opgeslagen dashboards-as-template: hernoemen, zichtbaarheid wijzigen, verwijderen.
          </p>
        </div>
        <Link
          to="/projects/new"
          className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Nieuw project starten <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {error && <div className="mb-4 rounded-md bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error}</div>}

      {rows === null && <p className="py-8 text-sm text-gray-500">Laden…</p>}

      {rows !== null && rows.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 px-6 py-10 text-center">
          <Sparkles className="mx-auto mb-2 h-6 w-6 text-gray-400" />
          <p className="text-sm text-gray-600">
            Je hebt nog geen persoonlijke templates.
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Maak er één: open een dashboard, kies <strong>Bewaren als template</strong>, en kom hier terug.
          </p>
        </div>
      )}

      {rows !== null && rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Template</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Bron-thema</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Tegels</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Zichtbaarheid</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Bijgewerkt</th>
                <th className="px-4 py-2 text-right font-medium text-gray-700">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {rows.map(t => {
                const distinctSources = new Set(t.tiles.map(tile => tile.dataSource).filter(Boolean));
                const isEditing = editingName?.id === t.id;
                return (
                  <tr key={t.id}>
                    <td className="px-4 py-2 align-top">
                      {isEditing ? (
                        <input
                          autoFocus
                          value={editingName.value}
                          onChange={e => setEditingName({ id: t.id, value: e.target.value })}
                          onBlur={() => void commitName(t.id)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            if (e.key === 'Escape') setEditingName(null);
                          }}
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                          aria-label="Naam bewerken"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingName({ id: t.id, value: t.name })}
                          className="text-left text-sm font-medium text-gray-900 hover:text-blue-700"
                          title="Klik om te hernoemen"
                        >
                          {t.name}
                        </button>
                      )}
                      {t.description && <div className="mt-0.5 text-xs text-gray-500">{t.description}</div>}
                    </td>
                    <td className="px-4 py-2 align-top text-xs text-gray-500">{t.sourceThemeSlug ?? '—'}</td>
                    <td className="px-4 py-2 align-top text-xs text-gray-500">
                      {t.tiles.length} · {distinctSources.size} databron{distinctSources.size === 1 ? '' : 'nen'}
                    </td>
                    <td className="px-4 py-2 align-top">
                      <label className="sr-only" htmlFor={`vis-${t.id}`}>Zichtbaarheid van {t.name}</label>
                      <select
                        id={`vis-${t.id}`}
                        value={t.visibility}
                        onChange={e => void handleVisibility(t.id, e.target.value as UserTemplateVisibility)}
                        className="rounded border border-gray-300 bg-white px-2 py-0.5 text-xs focus:border-blue-500 focus:outline-none"
                      >
                        {(Object.keys(VISIBILITY_LABEL) as UserTemplateVisibility[]).map(v => (
                          <option key={v} value={v}>{VISIBILITY_LABEL[v]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2 align-top text-xs text-gray-500">
                      {new Date(t.updatedAt).toLocaleDateString('nl-NL')}
                    </td>
                    <td className="px-4 py-2 align-top text-right">
                      <button
                        type="button"
                        onClick={() => void handleDelete(t.id, t.name)}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-500 hover:bg-rose-50 hover:text-rose-700"
                        aria-label={`Template "${t.name}" verwijderen`}
                      >
                        <Trash2 className="h-3 w-3" />
                        Verwijderen
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
