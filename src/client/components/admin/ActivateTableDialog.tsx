import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Zap, CheckCircle } from 'lucide-react';
import { api } from '../../services/api/client';
import { Button } from '../ui/Button';

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

export function ActivateTableDialog({ identifier, title, onClose, onActivated }: ActivateTableDialogProps) {
  const [dimensions, setDimensions] = useState<CbsDimension[]>([]);
  const [measures, setMeasures] = useState<CbsMeasure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ themeSlug: string; message: string } | null>(null);
  const navigate = useNavigate();

  // Form state
  const [key, setKey] = useState(identifier.toLowerCase().replace(/[^a-z0-9]/g, '_'));
  const [name, setName] = useState(title.split(';')[0].trim());
  const [supercategory, setSupercategory] = useState('overig');
  const [unit, setUnit] = useState('aantal');
  const [selectedMeasure, setSelectedMeasure] = useState('');
  const [mappings, setMappings] = useState<DimensionMapping[]>([]);

  useEffect(() => {
    setIsLoading(true);
    api.get<{ dimensions: CbsDimension[] }>(`/catalog/${identifier}`)
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
      })
      .catch(() => setDimensions([]));

    // Fetch measures
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
