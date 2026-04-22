import { useState, useEffect } from 'react';
import { Activity, AlertTriangle } from 'lucide-react';
import { Card } from '../ui/Card';
import { LoadingOverlay } from '../ui/Spinner';
import { DataQualityBadge } from '../dashboard/DataQualityBadge';
import { api } from '../../services/api/client';
import { formatNumber } from '../../utils/format';

interface QualityMetric {
  source: string;
  completeness: number;
  yearCoverage: number[];
  geoCoverage: number;
  nullValues: number;
  lastUpdated: string | null;
}

export function DataQualityPanel() {
  const [metrics, setMetrics] = useState<QualityMetric[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get<{ metrics: QualityMetric[] }>('/quality')
      .then(r => {
        if (cancelled) return;
        setMetrics(r.metrics);
        setError(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setMetrics([]);
      });
    return () => { cancelled = true; };
  }, []);

  if (metrics === null && !error) {
    return <LoadingOverlay message="Datakwaliteit berekenen..." />;
  }

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h2 className="text-lg font-semibold text-gray-900">Datakwaliteit per bron</h2>
        <p className="text-sm text-gray-500 mt-1">
          Volledigheid, dekking en null-waardes van alle geregistreerde databronnen.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <p className="text-sm text-red-700">Kwaliteitsmetrieken konden niet worden geladen.</p>
        </div>
      )}

      {metrics && metrics.length === 0 && !error && (
        <Card>
          <p className="text-sm text-gray-500">Geen databronnen gevonden.</p>
        </Card>
      )}

      {metrics && metrics.map(m => {
        const yearRange = m.yearCoverage.length > 0
          ? `${m.yearCoverage[0]}–${m.yearCoverage[m.yearCoverage.length - 1]}`
          : '—';
        return (
          <Card key={m.source}>
            <div className="flex items-center gap-3 mb-4">
              <Activity className="h-4 w-4 text-gray-400" />
              <span className="text-lg font-semibold text-gray-900 capitalize">{m.source}</span>
              <DataQualityBadge completeness={m.completeness} source={m.source} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Metric label="Jaren" value={`${m.yearCoverage.length} (${yearRange})`} />
              <Metric label="Gebieden" value={formatNumber(m.geoCoverage)} />
              <Metric label="Null-waardes" value={formatNumber(m.nullValues)} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}
