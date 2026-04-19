import { useState, useEffect } from 'react';
import { Zap, Cloud, Sun, Recycle, ArrowUp, ArrowDown } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { api } from '../../services/api/client';
import { useFilters } from '../../contexts/FilterContext';

interface Kpi {
  value: number;
  change: string | null;
}

interface DuurzStats {
  energie: Kpi;
  emissies: Kpi;
  hernieuwbaar: Kpi;
  afval: Kpi;
}

const CARDS = [
  { key: 'energie' as const, label: 'Energie (woningen)', icon: Zap, color: 'orange', unit: 'TJ' },
  { key: 'emissies' as const, label: 'CO2-uitstoot', icon: Cloud, color: 'red', unit: 'ton CO2-eq' },
  { key: 'hernieuwbaar' as const, label: 'Zonnepaneel-installaties', icon: Sun, color: 'yellow', unit: '' },
  { key: 'afval' as const, label: 'Huishoudelijk afval', icon: Recycle, color: 'green', unit: 'kg/inw' },
];

const COLORS: Record<string, { bg: string; icon: string }> = {
  orange: { bg: 'bg-orange-50', icon: 'text-orange-600' },
  red: { bg: 'bg-red-50', icon: 'text-red-600' },
  yellow: { bg: 'bg-yellow-50', icon: 'text-yellow-600' },
  green: { bg: 'bg-green-50', icon: 'text-green-600' },
};

function formatKpi(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString('nl-NL', { maximumFractionDigits: 1 });
}

export function DuurzaamheidStats() {
  const { filters } = useFilters();
  const [stats, setStats] = useState<DuurzStats | null>(null);
  const [sparklines, setSparklines] = useState<Record<string, { year: number; value: number }[]>>({});

  useEffect(() => {
    api.get<{ stats: DuurzStats }>('/stats/overview/duurzaamheid', {
      year: filters.period.year,
      geoCode: filters.geoCode,
    }).then(({ stats }) => setStats(stats))
      .catch(() => setStats(null));

    const sources = ['energie', 'emissies', 'hernieuwbaar', 'afval'] as const;
    Promise.all(
      sources.map(s =>
        api.get<{ timeSeries: { year: number; value: number }[] }>(`/stats/timeseries/${s}`, { geoCode: filters.geoCode })
          .then(d => [s, d.timeSeries] as [string, { year: number; value: number }[]])
          .catch(() => [s, []] as [string, { year: number; value: number }[]]),
      ),
    ).then(results => {
      const map: Record<string, { year: number; value: number }[]> = {};
      for (const [source, ts] of results) map[source] = ts;
      setSparklines(map);
    });
  }, [filters.period.year, filters.geoCode]);

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {CARDS.map(({ key, label, icon: Icon, color, unit }) => {
        const data = stats[key];
        const value = data.value;
        const change = data.change;
        const colors = COLORS[color]!;
        const spark = sparklines[key] || [];
        const sparkColor = change === null ? '#6b7280' : parseFloat(change) >= 0 ? '#10b981' : '#ef4444';

        return (
          <div key={key} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colors.bg}`}>
                  <Icon className={`h-5 w-5 ${colors.icon}`} />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">{label}</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatKpi(value)}
                    {unit && <span className="ml-1 text-xs font-normal text-gray-500">{unit}</span>}
                  </p>
                </div>
              </div>
              {spark.length > 2 && (
                <div className="w-20 h-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={spark.slice(-10)}>
                      <Line type="monotone" dataKey="value" stroke={sparkColor} strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            {change !== null && (
              <div className={`mt-3 flex items-center gap-1 text-sm ${
                parseFloat(change) > 0 ? 'text-green-600' : parseFloat(change) < 0 ? 'text-red-600' : 'text-gray-500'
              }`}>
                {parseFloat(change) > 0 ? (
                  <ArrowUp className="h-3.5 w-3.5" />
                ) : parseFloat(change) < 0 ? (
                  <ArrowDown className="h-3.5 w-3.5" />
                ) : null}
                <span className="font-medium">
                  {parseFloat(change) > 0 ? '+' : ''}{change}%
                </span>
                <span className="text-xs text-gray-400">t.o.v. vorig jaar</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
