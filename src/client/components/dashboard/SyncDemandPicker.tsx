import { useState } from 'react';
import { Clock, Check, AlertCircle, ChevronDown } from 'lucide-react';
import type { TileConfig } from '@shared/api/contracts';
import { submitSyncDemand } from '../../services/api/sync-demands';

/**
 * ADR-006 user-facing entry point for sync demand requests.
 *
 * Shows a "Updatefrequentie" dropdown. Picking a cadence submits a demand
 * for every distinct data source the dashboard's tiles reference. Hidden
 * when there are no data sources (e.g. narrative-only dashboards).
 */

export interface SyncDemandPreset {
  label: string;
  cron: string;
}

export const SYNC_DEMAND_PRESETS: SyncDemandPreset[] = [
  { label: 'Maandelijks', cron: '0 6 1 * *' },
  { label: 'Wekelijks', cron: '0 6 * * 1' },
  { label: 'Dagelijks', cron: '0 6 * * *' },
  { label: 'Per uur', cron: '0 * * * *' },
];

/** Distinct data_source keys referenced by the dashboard's tiles. Pure. */
export function distinctDataSources(tiles: TileConfig[]): string[] {
  const seen = new Set<string>();
  for (const t of tiles) if (t.dataSource) seen.add(t.dataSource);
  return Array.from(seen);
}

interface SyncDemandPickerProps {
  tiles: TileConfig[];
}

type Status =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; submittedCount: number }
  | { kind: 'error'; message: string };

export function SyncDemandPicker({ tiles }: SyncDemandPickerProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const sources = distinctDataSources(tiles);

  if (sources.length === 0) return null;

  async function pick(preset: SyncDemandPreset) {
    setOpen(false);
    setStatus({ kind: 'submitting' });
    try {
      const results = await Promise.all(sources.map(s => submitSyncDemand(s, preset.cron)));
      setStatus({ kind: 'success', submittedCount: results.length });
      window.setTimeout(() => setStatus(s => (s.kind === 'success' ? { kind: 'idle' } : s)), 5000);
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Verzoek mislukt' });
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={status.kind === 'submitting'}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Clock className="h-4 w-4" />
        {status.kind === 'submitting' ? 'Indienen…' : 'Updatefrequentie'}
        <ChevronDown className="h-3 w-3 text-gray-500" />
      </button>

      {open && (
        <ul role="listbox" className="absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {SYNC_DEMAND_PRESETS.map(p => (
            <li
              key={p.cron}
              role="option"
              aria-selected={false}
              onClick={() => pick(p)}
              className="cursor-pointer px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              {p.label}
            </li>
          ))}
        </ul>
      )}

      {status.kind === 'success' && (
        <span className="ml-2 inline-flex items-center gap-1 text-xs text-green-700" role="status">
          <Check className="h-3.5 w-3.5" /> Verzoek ingediend voor {status.submittedCount} {status.submittedCount === 1 ? 'bron' : 'bronnen'}
        </span>
      )}

      {status.kind === 'error' && (
        <span className="ml-2 inline-flex items-center gap-1 text-xs text-red-700" role="alert">
          <AlertCircle className="h-3.5 w-3.5" /> {status.message}
        </span>
      )}
    </div>
  );
}
