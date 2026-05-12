import { useEffect, useState } from 'react';
import { Plus, Minus, Pencil } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { getThemeDiff, applyThemeDiff } from '../../services/api/project-dashboards';
import type { ThemeDiffEntry, ThemeDiffResponse } from '@shared/api/contracts';

interface ThemeUpdateDiffProps {
  isOpen: boolean;
  onClose: () => void;
  projectSlug: string;
  dashboardSlug: string;
  onApplied: () => void;
}

/**
 * Default-check logic: conservative — only `added` entries are pre-selected.
 * Removed + modified would silently overwrite project state, so the user has
 * to opt in. Exported for unit testing.
 */
export function pickDefaultSelection(entries: ThemeDiffEntry[]): Set<string> {
  return new Set(entries.filter(e => e.kind === 'added').map(e => e.tileId));
}

const KIND_LABEL: Record<ThemeDiffEntry['kind'], string> = {
  added: 'Toegevoegd',
  removed: 'Verwijderd',
  modified: 'Gewijzigd',
};

const KIND_CHIP: Record<ThemeDiffEntry['kind'], string> = {
  added: 'bg-green-100 text-green-800 border-green-200',
  removed: 'bg-red-100 text-red-800 border-red-200',
  modified: 'bg-blue-100 text-blue-800 border-blue-200',
};

function KindIcon({ kind }: { kind: ThemeDiffEntry['kind'] }) {
  if (kind === 'added') return <Plus className="h-3.5 w-3.5" />;
  if (kind === 'removed') return <Minus className="h-3.5 w-3.5" />;
  return <Pencil className="h-3.5 w-3.5" />;
}

export function ThemeUpdateDiff({
  isOpen, onClose, projectSlug, dashboardSlug, onApplied,
}: ThemeUpdateDiffProps) {
  const [diff, setDiff] = useState<ThemeDiffResponse | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getThemeDiff(projectSlug, dashboardSlug)
      .then(d => {
        if (cancelled) return;
        setDiff(d);
        setSelected(pickDefaultSelection(d.diff));
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Kon update niet ophalen');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, projectSlug, dashboardSlug]);

  function toggle(tileId: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(tileId)) next.delete(tileId);
      else next.add(tileId);
      return next;
    });
  }

  async function handleApply() {
    if (selected.size === 0) return;
    setApplying(true);
    setError(null);
    try {
      await applyThemeDiff(projectSlug, dashboardSlug, Array.from(selected));
      onApplied();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toepassen mislukt');
    } finally {
      setApplying(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bijwerken van thema" maxWidth="xl">
      {loading && (
        <div className="flex items-center gap-2 py-8 text-sm text-gray-600">
          <Spinner /> Wijzigingen ophalen…
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {!loading && diff && (
        <>
          <p className="mb-4 text-sm text-gray-600">
            Themaversie <strong>{diff.templateVersion}</strong> is beschikbaar
            (huidig: <strong>{diff.projectVersion}</strong>). Kies welke wijzigingen
            je wilt toepassen op dit dashboard.
          </p>

          {diff.diff.length === 0 ? (
            <p className="py-4 text-sm text-gray-500">Geen wijzigingen — dit dashboard is up-to-date.</p>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
              {diff.diff.map(entry => {
                const tile = entry.after ?? entry.before;
                const title = tile?.title ?? entry.tileId;
                const checked = selected.has(entry.tileId);
                return (
                  <li key={entry.tileId} className="flex items-center gap-3 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(entry.tileId)}
                      aria-label={`${KIND_LABEL[entry.kind]}: ${title}`}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${KIND_CHIP[entry.kind]}`}>
                      <KindIcon kind={entry.kind} />
                      {KIND_LABEL[entry.kind]}
                    </span>
                    <span className="flex-1 truncate text-sm text-gray-900">{title}</span>
                    <span className="text-xs text-gray-400">{entry.tileId.slice(0, 8)}</span>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-6 flex justify-end gap-2 border-t pt-4">
            <Button variant="ghost" size="sm" onClick={onClose}>Annuleren</Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleApply}
              disabled={selected.size === 0 || applying}
            >
              {applying ? 'Toepassen…' : `Toepassen (${selected.size})`}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
