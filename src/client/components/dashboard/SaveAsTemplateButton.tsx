import { useState } from 'react';
import { BookmarkPlus, Check, AlertCircle, X } from 'lucide-react';
import type { TileConfig, LayoutItem, UserTemplateVisibility } from '@shared/api/contracts';
import { saveUserTemplate } from '../../services/api/user-templates';

/**
 * Issue #93 — capture the current dashboard's tiles + layout as a personal
 * user_template. Visible whenever there is at least one tile; gated by no
 * extra role check (any authenticated user owns their own private templates).
 */

interface Props {
  tiles: TileConfig[];
  layout: LayoutItem[];
  sourceThemeSlug?: string | null;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; name: string }
  | { kind: 'error'; message: string };

export function SaveAsTemplateButton({ tiles, layout, sourceThemeSlug }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<UserTemplateVisibility>('private');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  if (tiles.length === 0) return null;

  function reset() {
    setName('');
    setDescription('');
    setVisibility('private');
    setStatus({ kind: 'idle' });
  }

  function close() {
    setOpen(false);
    reset();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setStatus({ kind: 'error', message: 'Naam is verplicht' });
      return;
    }
    setStatus({ kind: 'submitting' });
    try {
      await saveUserTemplate({
        name: name.trim(),
        description: description.trim() || null,
        sourceThemeSlug: sourceThemeSlug ?? null,
        tiles,
        layout,
        visibility,
      });
      setStatus({ kind: 'success', name: name.trim() });
      window.setTimeout(() => { setOpen(false); reset(); }, 1500);
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Opslaan mislukt' });
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        aria-label="Bewaren als template"
      >
        <BookmarkPlus className="h-4 w-4" />
        Bewaren als template
      </button>

      {open && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/30"
          role="dialog"
          aria-modal="true"
          aria-labelledby="save-template-title"
          onClick={close}
        >
          <form
            onClick={e => e.stopPropagation()}
            onSubmit={submit}
            className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl"
          >
            <div className="mb-4 flex items-start justify-between">
              <h2 id="save-template-title" className="text-base font-semibold text-gray-900">Bewaren als template</h2>
              <button type="button" onClick={close} aria-label="Sluiten" className="text-gray-500 hover:text-gray-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mb-3 block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Naam</span>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                maxLength={255}
                autoFocus
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </label>

            <label className="mb-3 block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Omschrijving <span className="text-gray-400">(optioneel)</span></span>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                maxLength={2000}
                className="w-full resize-y rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </label>

            <fieldset className="mb-4">
              <legend className="mb-1 block text-sm font-medium text-gray-700">Zichtbaarheid</legend>
              <div className="flex flex-col gap-1 text-sm text-gray-700">
                {(['private', 'org', 'public'] as const).map(v => (
                  <label key={v} className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="visibility"
                      value={v}
                      checked={visibility === v}
                      onChange={() => setVisibility(v)}
                    />
                    {v === 'private' ? 'Alleen ik (privé)' : v === 'org' ? 'Mijn organisatie' : 'Iedereen (publiek)'}
                  </label>
                ))}
              </div>
            </fieldset>

            {status.kind === 'error' && (
              <div className="mb-3 flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                <AlertCircle className="h-4 w-4" /> {status.message}
              </div>
            )}
            {status.kind === 'success' && (
              <div className="mb-3 flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700" role="status">
                <Check className="h-4 w-4" /> Template "{status.name}" opgeslagen
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Annuleren
              </button>
              <button
                type="submit"
                disabled={status.kind === 'submitting' || !name.trim()}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status.kind === 'submitting' ? 'Opslaan…' : 'Opslaan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
