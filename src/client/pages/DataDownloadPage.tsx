import { useState } from 'react';
import { Download, FileText, Table, FileSpreadsheet } from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { useFilters } from '../contexts/FilterContext';

const dataSources = [
  { value: 'bevolking', label: 'Bevolking', description: 'Bevolkingsgegevens per leeftijdsgroep en geslacht' },
  { value: 'huishoudens', label: 'Huishoudens', description: 'Huishoudenssamenstelling per type' },
  { value: 'woningen', label: 'Woningen', description: 'Woningvoorraad naar eigendom en type' },
  { value: 'woningtekort', label: 'Woningtekort', description: 'Woningtekort, vraag en aanbod' },
];

const formats = [
  { value: 'csv', label: 'CSV', icon: FileText, description: 'Komma-gescheiden waarden (puntkomma voor NL)' },
  { value: 'json', label: 'JSON', icon: Table, description: 'JavaScript Object Notation' },
];

export function DataDownloadPage() {
  const { filters } = useFilters();
  const { showToast } = useToast();
  const [selectedSource, setSelectedSource] = useState('bevolking');
  const [selectedFormat, setSelectedFormat] = useState('csv');
  const [year, setYear] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

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
        <div className="space-y-2">
          {dataSources.map(source => (
            <label
              key={source.value}
              className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                selectedSource === source.value
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="source"
                value={source.value}
                checked={selectedSource === source.value}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">{source.label}</p>
                <p className="text-xs text-gray-500">{source.description}</p>
              </div>
            </label>
          ))}
        </div>
      </Card>

      {/* Filters */}
      <Card className="mb-4">
        <CardHeader title="Filters" subtitle="Optioneel: beperk de export" />
        <div className="flex gap-4">
          <Select
            label="Jaar (optioneel)"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            options={[
              { value: '', label: 'Alle jaren' },
              ...Array.from({ length: 21 }, (_, i) => ({
                value: String(2020 + i),
                label: String(2020 + i),
              })),
            ]}
          />
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
      <Button onClick={handleDownload} disabled={isDownloading} size="lg" className="w-full">
        <Download className="h-5 w-5" />
        {isDownloading ? 'Downloaden...' : `${selectedSource} downloaden als ${selectedFormat.toUpperCase()}`}
      </Button>
    </div>
  );
}
