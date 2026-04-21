import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Zap, CheckCircle, Map, Calendar, Layers, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api/client';
import { Button } from '../ui/Button';
import { useThemes } from '../../contexts/ThemeContext';

interface CbsDimension {
  Identifier: string;
  Title: string;
  Kind: string;
}

interface CbsMeasure {
  Identifier: string;
  Title: string;
  Unit: string;
  DataType: string;
}

interface InspectedMetadata {
  geoLevels: string[];
  periodRange: { min: number; max: number } | null;
  dimensions: Array<{ name: string; title: string; kind: string; valueCount: number }>;
  measures: Array<{ id: string; title: string; unit: string | null }>;
  recommendedDefaults: { measure: string | null; regionDim: string | null };
}

interface DimensionMapping {
  cbsDimension: string;
  targetColumn: string;
  valueMap: Record<string, string>;
}

interface ActivateTableDialogProps {
  identifier: string;
  title: string;
  onClose: () => void;
  onActivated: () => void;
}

const GEO_LEVEL_LABELS: Record<string, string> = {
  land: 'Nederland',
  landsdeel: 'Landsdeel',
  provincie: 'Provincie',
  corop: 'COROP',
  gemeente: 'Gemeente',
  wijk: 'Wijk',
  buurt: 'Buurt',
  postcode4: 'Postcode (PC4)',
  postcode6: 'Postcode (PC6)',
};

export function ActivateTableDialog({ identifier, title, onClose, onActivated }: ActivateTableDialogProps) {
  const [dimensions, setDimensions] = useState<CbsDimension[]>([]);
  const [measures, setMeasures] = useState<CbsMeasure[]>([]);
  const [metadata, setMetadata] = useState<InspectedMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ themeSlug: string; message: string } | null>(null);
  const navigate = useNavigate();
  const { refresh: refreshThemes } = useThemes();

  // Form state
  const [key, setKey] = useState(identifier.toLowerCase().replace(/[^a-z0-9]/g, '_'));
  const [name, setName] = useState(title.split(';')[0].trim());
  const [supercategory, setSupercategory] = useState('overig');
  const [unit, setUnit] = useState('aantal');
  const [selectedMeasure, setSelectedMeasure] = useState('');
  const [mappings, setMappings] = useState<DimensionMapping[]>([]);

  useEffect(() => {
    setIsLoading(true);
    // Server returns Dimensions derived from inspected metadata when we have
    // it, falling back to a live CBS fetch; either way the client gets the
    // same Identifier/Title/Kind shape.
    api.get<{ dimensions: CbsDimension[]; metadata?: InspectedMetadata | null }>(`/catalog/${identifier}`)
      .then(data => {
        const dims = (data.dimensions || []) as CbsDimension[];
        setDimensions(dims.filter(d => d.Kind !== 'TimeDimension' && d.Kind !== 'GeoDimension'));

        // Auto-create mappings for non-time/geo dimensions
        setMappings(
          dims
            .filter(d => d.Kind !== 'TimeDimension' && d.Kind !== 'GeoDimension')
            .map(d => ({
              cbsDimension: d.Identifier,
              targetColumn: d.Identifier.toLowerCase().replace(/[^a-z0-9]/g, '_'),
              valueMap: {},
            }))
        );

        const meta = data.metadata ?? null;
        if (meta) {
          setMetadata(meta);
          // Serve measures straight from inspected metadata — avoids an
          // extra CORS call to CBS when we already have the answer.
          if (meta.measures?.length > 0) {
            const asMeasures = meta.measures.map(m => ({
              Identifier: m.id,
              Title: m.title,
              Unit: m.unit ?? '',
              DataType: '',
            }));
            setMeasures(asMeasures);
            const defaultId = meta.recommendedDefaults?.measure ?? asMeasures[0].Identifier;
            setSelectedMeasure(defaultId);
            const picked = asMeasures.find(m => m.Identifier === defaultId);
            if (picked?.Unit) setUnit(picked.Unit);
            setIsLoading(false);
            return;
          }
        }

        // Fall back to live CBS fetch when metadata is missing (pre-inspection)
        fetch(`https://datasets.cbs.nl/odata/v1/CBS/${identifier}/MeasureCodes`)
          .then(r => r.json())
          .then((d: { value: CbsMeasure[] }) => {
            setMeasures(d.value || []);
            if (d.value?.length > 0) {
              setSelectedMeasure(d.value[0].Identifier);
              setUnit(d.value[0].Unit || 'aantal');
            }
          })
          .catch(() => setMeasures([]))
          .finally(() => setIsLoading(false));
      })
      .catch(() => { setDimensions([]); setIsLoading(false); });
  }, [identifier]);

  async function handleActivate() {
    setIsActivating(true);
    setError(null);
    try {
      const result = await api.post<{ themeSlug: string; message: string; tilesCreated: number }>('/catalog/activate', {
        identifier,
        key,
        name,
        supercategory,
        unit,
        measureCode: selectedMeasure,
        filter: `Measure eq '${selectedMeasure}'`,
        dimensionMappings: mappings,
      });
      // Refresh the theme list so the new theme is visible in the sidebar
      // without requiring a full page reload. Errors here are non-fatal —
      // navigation still works, the list will catch up on next reload.
      refreshThemes().catch(() => { /* best-effort */ });
      setSuccess({ themeSlug: result.themeSlug, message: result.message });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Activatie mislukt');
    } finally {
      setIsActivating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">CBS tabel activeren</h2>
            <p className="text-sm text-gray-500">{identifier} — {title}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Tabel geactiveerd!</h3>
              <p className="text-sm text-gray-600 mb-6">{success.message}</p>
              <div className="flex items-center justify-center gap-3">
                <Button variant="secondary" onClick={() => { onActivated(); onClose(); }}>Sluiten</Button>
                <Button onClick={() => { onActivated(); navigate(`/dashboard/${success.themeSlug}`); onClose(); }}>
                  Naar dashboard →
                </Button>
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              {/* Shape preview — what does this CBS table actually contain? */}
              {metadata && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                    <div className="flex items-center gap-1.5 text-gray-700">
                      <Map className="h-3.5 w-3.5 text-gray-400" />
                      {metadata.geoLevels.length > 0
                        ? metadata.geoLevels.map(l => GEO_LEVEL_LABELS[l] || l).join(' · ')
                        : <span className="text-gray-400">Geen regio-dimensie (nationaal totaal)</span>}
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
                      {' · '}
                      {metadata.measures.length} meetwaarde{metadata.measures.length === 1 ? '' : 'n'}
                    </div>
                  </div>
                  {!metadata.geoLevels.includes('gemeente') && metadata.geoLevels.length > 0 && (
                    <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-700">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                      <span>
                        Deze tabel bevat geen gemeente-data. Een gemeente-choropleth wordt automatisch overgeslagen;
                        de kaart-tegel zal gebruikmaken van het beschikbare niveau (
                        {GEO_LEVEL_LABELS[metadata.geoLevels[0]] || metadata.geoLevels[0]}).
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Basic config */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Bronsleutel</label>
                  <input
                    type="text"
                    value={key}
                    onChange={e => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="bijv. criminaliteit"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Weergavenaam</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Supercategorie</label>
                  <select
                    value={supercategory}
                    onChange={e => setSupercategory(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="wonen">Wonen</option>
                    <option value="duurzaamheid">Duurzaamheid</option>
                    <option value="economie">Economie</option>
                    <option value="veiligheid">Veiligheid</option>
                    <option value="gezondheid">Gezondheid</option>
                    <option value="onderwijs">Onderwijs</option>
                    <option value="overig">Overig</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Eenheid</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="aantal, %, kg"
                  />
                </div>
              </div>

              {/* Measure selection */}
              {measures.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Meetwaarde ({measures.length} beschikbaar)
                  </label>
                  <select
                    value={selectedMeasure}
                    onChange={e => {
                      setSelectedMeasure(e.target.value);
                      const m = measures.find(m => m.Identifier === e.target.value);
                      if (m?.Unit) setUnit(m.Unit);
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    {measures.map(m => (
                      <option key={m.Identifier} value={m.Identifier}>
                        {m.Title} ({m.Unit || m.DataType})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Dimension mappings */}
              {dimensions.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Dimensies ({dimensions.length})
                  </label>
                  <div className="space-y-2">
                    {mappings.map((mapping, i) => {
                      const dim = dimensions.find(d => d.Identifier === mapping.cbsDimension);
                      return (
                        <div key={i} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{dim?.Title || mapping.cbsDimension}</p>
                            <p className="text-xs text-gray-400">CBS: {mapping.cbsDimension}</p>
                          </div>
                          <div className="text-xs text-gray-400">→</div>
                          <input
                            type="text"
                            value={mapping.targetColumn}
                            onChange={e => {
                              const updated = [...mappings];
                              updated[i] = { ...mapping, targetColumn: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') };
                              setMappings(updated);
                            }}
                            className="w-40 rounded border border-gray-300 px-2 py-1.5 text-sm font-mono"
                            placeholder="kolomnaam"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {!success && (
          <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
            <Button variant="secondary" onClick={onClose}>Annuleren</Button>
            <Button onClick={handleActivate} disabled={isActivating || isLoading || !key || !selectedMeasure}>
              <Zap className="h-4 w-4" />
              {isActivating ? 'Activeren...' : 'Tabel activeren'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
