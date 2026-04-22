import { useState, useEffect } from 'react';
import { X, Zap, Calendar, Map, Layers } from 'lucide-react';
import { api } from '../../services/api/client';
import { Button } from '../ui/Button';
import { GEO_LEVEL_LABELS } from '../../utils/geo';

/**
 * Slim "one-click" activation flow for the tile-picker CBS-catalogue tab.
 * Reads the inspected metadata (PR #45 inspector output) and pre-fills every
 * dimension mapping, measure, and default level via
 * `metadata.recommendedDefaults`. The user only sees a display name and the
 * Activeer button; the full /catalogus dialog remains for advanced cases
 * that need manual configuration.
 */

interface InspectedMetadata {
  geoLevels: string[];
  periodRange: { min: number; max: number } | null;
  dimensions: Array<{ name: string; title: string; kind: string; valueCount: number }>;
  measures: Array<{ id: string; title: string; unit: string | null }>;
  recommendedDefaults: { measure: string | null; regionDim: string | null };
}

interface QuickActivateDialogProps {
  identifier: string;
  title: string;
  themes: string[];
  onClose: () => void;
  /** Fires after the server returns a successful activation response (the
   *  actual data sync continues in the background). Parent is expected to
   *  refresh themes and show a "sync in progress" toast. */
  onActivated: (result: { themeSlug: string; key: string }) => void;
}

// Map CBS high-level themes → existing platform supercategories.
// Conservative: unknowns land in 'overig' so tile generation still works.
function guessSupercategory(themes: string[]): string {
  const joined = themes.join(' ').toLowerCase();
  if (/wonen|bevolking|huishoudens|bouw|demograf/.test(joined)) return 'wonen';
  if (/milieu|energie|emissie|duurzaam|klimaat|natuur/.test(joined)) return 'duurzaamheid';
  if (/economie|arbeid|inkomen|werk|bedrijf/.test(joined)) return 'economie';
  if (/veiligheid|criminaliteit|rechtsorde/.test(joined)) return 'veiligheid';
  if (/gezondheid|zorg|welzijn/.test(joined)) return 'gezondheid';
  if (/onderwijs|leerling|studeren/.test(joined)) return 'onderwijs';
  return 'overig';
}

export function QuickActivateDialog({
  identifier, title, themes, onClose, onActivated,
}: QuickActivateDialogProps) {
  const [metadata, setMetadata] = useState<InspectedMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(title.split(';')[0].trim());

  useEffect(() => {
    setIsLoading(true);
    api.get<{ metadata: InspectedMetadata | null; inspection_status: string | null }>(`/catalog/${identifier}`)
      .then(data => {
        if (!data.metadata) {
          setError('Deze tabel is nog niet geïnspecteerd. Gebruik de uitgebreide activatie via /catalogus.');
        } else {
          setMetadata(data.metadata);
        }
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Metadata ophalen mislukt'))
      .finally(() => setIsLoading(false));
  }, [identifier]);

  async function handleActivate() {
    if (!metadata) return;
    if (!metadata.recommendedDefaults.measure) {
      setError('Geen standaard meetwaarde gevonden in deze tabel. Gebruik de uitgebreide activatie.');
      return;
    }
    setIsActivating(true);
    setError(null);
    try {
      // Auto-derive mappings from dimensions that aren't time or geo.
      // targetColumn is the lowercase snake-cased dim name; the server's
      // shape-aware activation handles the rest (tile generation, geo
      // levels, allowedLevels in sync_config) based on metadata.
      const mappings = metadata.dimensions
        .filter(d => d.kind !== 'TimeDimension' && d.kind !== 'GeoDimension')
        .map(d => ({
          cbsDimension: d.name,
          targetColumn: d.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          valueMap: {},
        }));
      const key = identifier.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const result = await api.post<{ themeSlug: string; message: string }>('/catalog/activate', {
        identifier,
        key,
        name: displayName,
        supercategory: guessSupercategory(themes),
        unit: metadata.measures.find(m => m.id === metadata.recommendedDefaults.measure)?.unit || 'aantal',
        measureCode: metadata.recommendedDefaults.measure,
        filter: `Measure eq '${metadata.recommendedDefaults.measure}'`,
        dimensionMappings: mappings,
      });
      onActivated({ themeSlug: result.themeSlug, key });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Activatie mislukt');
    } finally {
      setIsActivating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Snelle activatie</h2>
            <p className="text-xs text-gray-500">{identifier}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : metadata ? (
            <>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-gray-700">
                  <Map className="h-3.5 w-3.5 text-gray-400" />
                  {metadata.geoLevels.length > 0
                    ? metadata.geoLevels.map(l => GEO_LEVEL_LABELS[l] || l).join(' · ')
                    : <span className="text-gray-400">Geen regio-dimensie (nationaal)</span>}
                </div>
                {metadata.periodRange && (
                  <div className="flex items-center gap-1.5 text-gray-700">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    {metadata.periodRange.min}–{metadata.periodRange.max}
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-gray-700">
                  <Layers className="h-3.5 w-3.5 text-gray-400" />
                  {metadata.dimensions.length} dimensie{metadata.dimensions.length === 1 ? '' : 's'}
                  {' · '}{metadata.measures.length} meetwaarde{metadata.measures.length === 1 ? '' : 'n'}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Weergavenaam</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Overige instellingen (meetwaarde, dimensies, regio-niveau) worden automatisch gekozen
                  op basis van de geïnspecteerde metadata.
                </p>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error ?? 'Onbekende fout.'}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
          <Button variant="secondary" onClick={onClose}>Annuleren</Button>
          <Button onClick={handleActivate} disabled={isActivating || isLoading || !metadata || !displayName}>
            <Zap className="h-4 w-4" />
            {isActivating ? 'Activeren…' : 'Activeer & sync'}
          </Button>
        </div>
      </div>
    </div>
  );
}
