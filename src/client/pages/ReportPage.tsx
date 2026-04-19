import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { FileText, Download, Printer } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { LoadingOverlay } from '../components/ui/Spinner';
import { useFilters } from '../contexts/FilterContext';
import { api } from '../services/api/client';
import { formatNumber, formatPercent } from '../utils/format';

interface ReportSection {
  title: string;
  data: { label: string; value: number; change?: number }[];
}

interface Report {
  title: string;
  generatedAt: string;
  geoCode: string;
  year: number;
  unit?: string;
  sections: ReportSection[];
}

const SOURCE_OPTIONS = [
  { value: 'bevolking', label: 'Bevolking (wonen)' },
  { value: 'huishoudens', label: 'Huishoudens (wonen)' },
  { value: 'woningen', label: 'Woningen (wonen)' },
  { value: 'woningtekort', label: 'Woningtekort (wonen)' },
  { value: 'energie', label: 'Energie (duurzaamheid)' },
  { value: 'emissies', label: 'Emissies (duurzaamheid)' },
  { value: 'hernieuwbaar', label: 'Hernieuwbare energie (duurzaamheid)' },
  { value: 'afval', label: 'Afval & circulair (duurzaamheid)' },
];

export function ReportPage() {
  const [searchParams] = useSearchParams();
  const { filters } = useFilters();
  const [source, setSource] = useState(searchParams.get('source') || 'bevolking');
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function loadReport() {
    setIsLoading(true);
    api.get<Report>(`/reports/${source}`, {
      geoCode: filters.geoCode,
      year: filters.period.year,
      ...(filters.period.compareYear ? { compareYear: filters.period.compareYear } : {}),
    })
      .then(setReport)
      .catch(() => setReport(null))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    loadReport();
  }, [source, filters.geoCode, filters.period.year, filters.period.compareYear]);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapport</h1>
          <p className="text-sm text-gray-500 mt-1">Genereer een gestructureerd rapport</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Afdrukken
          </Button>
        </div>
      </div>

      {/* Source selector */}
      <div className="mb-6">
        <Select
          label="Databron"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          options={SOURCE_OPTIONS}
        />
      </div>

      {isLoading && <LoadingOverlay message="Rapport genereren..." />}

      {report && !isLoading && (
        <div className="space-y-6 print:space-y-4">
          {/* Report Header */}
          <Card>
            <div className="flex items-start gap-3">
              <FileText className="h-6 w-6 text-blue-500 mt-0.5" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">{report.title}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Gegenereerd op {new Date(report.generatedAt).toLocaleString('nl-NL')}
                </p>
              </div>
            </div>
          </Card>

          {/* Sections */}
          {report.sections.map((section, idx) => (
            <Card key={idx}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                {section.title}
              </h3>
              <div className="space-y-2">
                {section.data.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-700">{item.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-900 font-mono">
                        {formatNumber(item.value)}
                        {report.unit && <span className="ml-1 text-xs font-normal text-gray-500">{report.unit}</span>}
                      </span>
                      {item.change !== undefined && (
                        <span className={`text-xs font-medium ${
                          item.change > 0 ? 'text-green-600' : item.change < 0 ? 'text-red-600' : 'text-gray-500'
                        }`}>
                          {item.change > 0 ? '+' : ''}{formatNumber(item.change)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
