import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Printer, Download } from 'lucide-react';
import { ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { LoadingOverlay } from '../components/ui/Spinner';
import { useFilters } from '../contexts/FilterContext';
import { api } from '../services/api/client';
import { formatNumber, formatCompact } from '../utils/format';

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
  const [trend, setTrend] = useState<{ year: number; value: number; source: string; confidenceLower?: number; confidenceUpper?: number }[]>([]);
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
    api.get<{ timeSeries: { year: number; value: number; source: string; confidenceLower?: number; confidenceUpper?: number }[] }>(
      `/stats/timeseries/${source}`,
      { geoCode: filters.geoCode },
    )
      .then(d => {
        const all = d.timeSeries;
        const lastActualYear = all.filter(p => p.source === 'cbs_actuals').at(-1)?.year;
        if (lastActualYear === undefined) {
          setTrend(all.slice(-10));
          return;
        }
        const actuals = all.filter(p => p.source === 'cbs_actuals' && p.year >= lastActualYear - 9);
        const prognoses = all.filter(p => p.source !== 'cbs_actuals' && p.year > lastActualYear && p.year <= lastActualYear + 5);
        setTrend([...actuals, ...prognoses]);
      })
      .catch(() => setTrend([]));
  }, [source, filters.geoCode, filters.period.year, filters.period.compareYear]);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapport</h1>
          <p className="text-sm text-gray-500 mt-1">Genereer een gestructureerd rapport</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              const params = new URLSearchParams({
                geoCode: filters.geoCode,
                year: String(filters.period.year),
              });
              if (filters.period.compareYear) params.set('compareYear', String(filters.period.compareYear));
              const token = api.getToken();
              const resp = await fetch(`/api/reports/${source}/csv?${params.toString()}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });
              if (!resp.ok) return;
              const blob = await resp.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `rapport-${source}-${filters.geoCode}-${filters.period.year}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="h-4 w-4" /> CSV
          </Button>
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
              {idx === 0 && trend.length > 1 && (() => {
                // Shape data so Recharts draws actuals and prognose as two connected
                // lines — include the last actual point in both series so they meet.
                const lastActualIdx = trend.map(p => p.source).lastIndexOf('cbs_actuals');
                const chartData = trend.map((p, i) => ({
                  year: p.year,
                  actual: p.source === 'cbs_actuals' ? p.value : (i === lastActualIdx + 1 ? trend[lastActualIdx]?.value : undefined),
                  prognose: p.source !== 'cbs_actuals' || i === lastActualIdx ? p.value : undefined,
                  ...(p.confidenceLower != null && p.confidenceUpper != null
                    ? { ci: [p.confidenceLower, p.confidenceUpper] as [number, number] }
                    : {}),
                }));
                const hasPrognose = trend.some(p => p.source !== 'cbs_actuals');
                const hasCI = trend.some(p => p.confidenceLower != null && p.confidenceUpper != null);
                return (
                  <div className="h-40 mb-4 -mx-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
                        <XAxis
                          dataKey="year"
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                          axisLine={{ stroke: '#e5e7eb' }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                          axisLine={false}
                          tickLine={false}
                          width={50}
                          tickFormatter={(v) => formatCompact(Number(v))}
                        />
                        <Tooltip
                          formatter={(v: number | number[], name: string) => {
                            const unitSuffix = report.unit ? ` ${report.unit}` : '';
                            if (Array.isArray(v)) {
                              return [`${formatNumber(v[0]!)} – ${formatNumber(v[1]!)}${unitSuffix}`, name];
                            }
                            return [formatNumber(v) + unitSuffix, name];
                          }}
                          labelFormatter={(y) => `Jaar ${y}`}
                          contentStyle={{ fontSize: 12 }}
                        />
                        {hasCI && (
                          <Area type="monotone" dataKey="ci" fill="#a855f7" fillOpacity={0.12} stroke="none" name="95% CI" />
                        )}
                        <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Actueel" connectNulls={false} />
                        {hasPrognose && (
                          <Line type="monotone" dataKey="prognose" stroke="#a855f7" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} name="Prognose" connectNulls={false} />
                        )}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()}
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
