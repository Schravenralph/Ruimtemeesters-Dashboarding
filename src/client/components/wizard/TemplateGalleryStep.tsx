import { useEffect, useState } from 'react';
import type { ThemeConfig, UserTemplate } from '@shared/api/contracts';
import { listUserTemplates, type UserTemplateScope } from '../../services/api/user-templates';

/**
 * Issue #94 — first wizard step, with tabs for system themes + the three
 * user-template scopes (Mijn / Org / Publiek). Stateless w.r.t. selection:
 * the parent owns `selected*` and is updated via callbacks.
 */

export type GallerySelection =
  | { kind: 'theme'; themeSlug: string }
  | { kind: 'template'; userTemplateId: string }
  | { kind: 'none' };

interface Props {
  themes: ThemeConfig[];
  selection: GallerySelection;
  onSelect: (sel: GallerySelection) => void;
}

type Tab = 'systeem' | 'mijn' | 'org' | 'publiek';

const SCOPE_BY_TAB: Record<Exclude<Tab, 'systeem'>, UserTemplateScope> = {
  mijn: 'mine',
  org: 'org',
  publiek: 'public',
};

const TAB_LABELS: Record<Tab, string> = {
  systeem: 'Systeem',
  mijn: 'Mijn',
  org: 'Org',
  publiek: 'Publiek',
};

const EMPTY_LABELS: Record<Exclude<Tab, 'systeem'>, string> = {
  mijn: 'Je hebt nog geen persoonlijke templates. Gebruik "Bewaren als template" op een dashboard om er één te maken.',
  org: 'Geen org-templates beschikbaar.',
  publiek: 'Geen publieke templates beschikbaar.',
};

export function TemplateGalleryStep({ themes, selection, onSelect }: Props) {
  const [tab, setTab] = useState<Tab>('systeem');
  const [templates, setTemplates] = useState<Record<Exclude<Tab, 'systeem'>, UserTemplate[] | null>>({ mijn: null, org: null, publiek: null });
  const [loadingTab, setLoadingTab] = useState<Tab | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tab === 'systeem') return;
    if (templates[tab] !== null) return;
    setLoadingTab(tab);
    setError(null);
    listUserTemplates(SCOPE_BY_TAB[tab])
      .then(rows => setTemplates(prev => ({ ...prev, [tab]: rows })))
      .catch(err => setError(err instanceof Error ? err.message : 'Kon templates niet ophalen'))
      .finally(() => setLoadingTab(curr => (curr === tab ? null : curr)));
  }, [tab, templates]);

  // Group themes by supercategory (mirrors existing wizard behaviour).
  const grouped = themes.reduce<Record<string, ThemeConfig[]>>((acc, t) => {
    const key = t.supercategory ?? 'overig';
    (acc[key] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-6" data-testid="template-gallery">
      <div role="tablist" aria-label="Sjabloon kiezen" className="flex gap-1 border-b border-gray-200">
        {(['systeem', 'mijn', 'org', 'publiek'] as Tab[]).map(t => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${tab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === 'systeem' && (
        <div className="space-y-6">
          {Object.entries(grouped).map(([supercat, list]) => (
            <section key={supercat}>
              <h2 className="mb-2 text-xs font-semibold uppercase text-gray-500">{supercat}</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {list.map(t => {
                  const sel = selection.kind === 'theme' && selection.themeSlug === t.slug;
                  return (
                    <button
                      key={t.slug}
                      type="button"
                      onClick={() => onSelect({ kind: 'theme', themeSlug: t.slug })}
                      className={`rounded-lg border px-4 py-3 text-left transition ${sel ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                    >
                      <div className="text-sm font-semibold text-gray-900">{t.name}</div>
                      {t.description && <div className="mt-0.5 text-xs text-gray-500">{t.description}</div>}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {tab !== 'systeem' && (
        <div className="space-y-3">
          {loadingTab === tab && <p className="text-sm text-gray-500">Templates laden…</p>}
          {error && <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-700" role="alert">{error}</p>}
          {(templates[tab] ?? []).length === 0 && loadingTab !== tab && !error && (
            <p className="rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-500">{EMPTY_LABELS[tab]}</p>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {(templates[tab] ?? []).map(t => {
              const sel = selection.kind === 'template' && selection.userTemplateId === t.id;
              const distinctSources = new Set(t.tiles.map(tile => tile.dataSource).filter(Boolean));
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelect({ kind: 'template', userTemplateId: t.id })}
                  className={`rounded-lg border px-4 py-3 text-left transition ${sel ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                >
                  <div className="text-sm font-semibold text-gray-900">{t.name}</div>
                  {t.description && <div className="mt-0.5 text-xs text-gray-500">{t.description}</div>}
                  <div className="mt-1 text-xs text-gray-400">{t.tiles.length} tegels · {distinctSources.size} databron{distinctSources.size === 1 ? '' : 'nen'}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
