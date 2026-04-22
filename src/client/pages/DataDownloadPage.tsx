import { useState, useEffect, useMemo } from 'react';
import { Download, FileText, Table, AlertTriangle } from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { useFilters } from '../contexts/FilterContext';
import {
  listDataSources,
  getAvailableYears,
  type DataSourceSummary,
} from '../services/api/data';

const formats = [
  { value: 'csv', label: 'CSV', icon: FileText, description: 'Komma-gescheiden waarden (puntkomma voor NL)' },
  { value: 'json', label: 'JSON', icon: Table, description: 'JavaScript Object Notation' },
];

const SUPERCATEGORY_LABELS: Record<string, string> = {
  wonen: 'Wonen',
  duurzaamheid: 'Duurzaamheid',
  economie: 'Economie',
  mobiliteit: 'Mobiliteit',
  gezondheid: 'Gezondheid',
};

export function DataDownloadPage() {
  const { filters } = useFilters();
  const { showToast } = useToast();
  const [sources, setSources] = useState<DataSourceSummary[] | null>(null);
  const [sourcesError, setSourcesError] = useState(false);
  const [selectedSource, setSelectedSource] = useState('bevolking');
  const [selectedFormat, setSelectedFormat] = useState('csv');
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [year, setYear] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    listDataSources()
      .then(r => {
        setSources(r.sources);
        setSourcesError(false);
        if (r.sources.length > 0 && !r.sources.some(s => s.key === selectedSource)) {
          setSelectedSource(r.sources[0]!.key);
        }
      })
      .catch(() => {
        setSources([]);
        setSourcesError(true);
      });
    // selectedSource intentionally excluded — we only want to reconcile once on first load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedSource) return;
    getAvailableYears(selectedSource)
      .then(r => {
        const ys = [...r.years].sort((a, b) => a - b);
        setAvailableYears(ys);
        // Reset selected year if it's no longer in the list.
        if (year && !ys.includes(Number(year))) setYear('');
      })
      .catch(() => setAvailableYears([]));
    // year intentionally excluded — we only re-validate against new lists here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSource]);

  const grouped = useMemo(() => {
    if (!sources) return [] as [string, DataSourceSummary[]][];
    const order = ['wonen', 'duurzaamheid', 'economie', 'mobiliteit', 'gezondheid'];
    const bucket: Record<string, DataSourceSummary[]> = {};
    for (const s of sources) {
      (bucket[s.supercategory] ??= []).push(s);
    }
    const keys = Object.keys(bucket).sort(
      (a, b) => (order.indexOf(a) < 0 ? 99 : order.indexOf(a)) - (order.indexOf(b) < 0 ? 99 : order.indexOf(b)),
    );
    return keys.map(k => [k, bucket[k]!] as [string, DataSourceSummary[]]);
  }, [sources]);

  async function handleDownload() {
    setIsDownloading(true);
    try {
      const params = new URLSearchParams({
        source: selectedSource,
        format: selectedFormat,
        ...(filters.geoCode !== 'NL' ? { geoCode: filters.geoCode } : {}),
        ...(year ? { year } : {}),
      });

      const response = await fetch(`/api/export?${params}`);

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedSource}_export.${selectedFormat}`;
      a.click();
      URL.revokeObjectURL(url);

      showToast('success', 'Download gestart');
    } catch {
      showToast('error', 'Download mislukt');
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Data downloaden</h1>
        <p className="text-sm text-gray-500 mt-1">
          Download datasets in verschillende formaten
        </p>
      </div>

      {/* Source Selection */}
      <Card className="mb-4">
        <CardHeader title="Databron" subtitle="Selecteer de dataset die je wilt downloaden" />
        {sourcesError && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 mb-3">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <p className="text-sm text-red-700">Databronnen konden niet worden geladen.</p>
          </div>
        )}
        {!sources && !sourcesError && (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
        )}
        {grouped.map(([cat, list]) => (
          <div key={cat} className="mb-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">
              {SUPERCATEGORY_LABELS[cat] ?? cat}
            </p>
            <div className="space-y-2">
              {list.map(source => (
                <label
                  key={source.key}
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    selectedSource === source.key
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="source"
                    value={source.key}
                    checked={selectedSource === source.key}
                    onChange={(e) => setSelectedSource(e.target.value)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{source.name}</p>
                    <p className="text-xs text-gray-500">
                      {source.unit !== 'aantal' && source.unit !== '' ? `Eenheid: ${source.unit}` : 'Kerncijfers'}
                      {source.cbsTableId && ` · CBS ${source.cbsTableId}`}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}
      </Card>

      {/* Filters */}
      <Card className="mb-4">
        <CardHeader title="Filters" subtitle="Optioneel: beperk de export" />
        <div className="flex gap-4">
          {availableYears.length > 0 ? (
            <Select
              label="Jaar (optioneel)"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              options={[
                { value: '', label: 'Alle jaren' },
                ...availableYears.map(y => ({
                  value: String(y),
                  label: y > new Date().getFullYear() ? `${y} (prognose)` : String(y),
                })),
              ]}
            />
          ) : (
            <p className="text-sm text-gray-500">Geen jaren beschikbaar voor deze bron.</p>
          )}
        </div>
        {filters.geoCode !== 'NL' && (
          <p className="text-xs text-blue-600 mt-2">
            Gefilterd op geselecteerd gebied: {filters.geoCode}
          </p>
        )}
      </Card>

      {/* Format Selection */}
      <Card className="mb-6">
        <CardHeader title="Formaat" />
        <div className="flex gap-3">
          {formats.map(format => {
            const Icon = format.icon;
            return (
              <label
                key={format.value}
                className={`flex-1 flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  selectedFormat === format.value
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  value={format.value}
                  checked={selectedFormat === format.value}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                />
                <Icon className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{format.label}</p>
                  <p className="text-xs text-gray-500">{format.description}</p>
                </div>
              </label>
            );
          })}
        </div>
      </Card>

      {/* Download Button */}
      <Button
        onClick={handleDownload}
        disabled={isDownloading || !sources || sources.length === 0}
        size="lg"
        className="w-full"
      >
        <Download className="h-5 w-5" />
        {isDownloading ? 'Downloaden...' : `${selectedSource} downloaden als ${selectedFormat.toUpperCase()}`}
      </Button>
    </div>
  );
}
