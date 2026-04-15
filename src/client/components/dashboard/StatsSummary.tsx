import { useState, useEffect } from 'react';
import { Users, Home, Building2, TrendingDown, ArrowUp, ArrowDown, Brain, ArrowRight } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { api } from '../../services/api/client';
import { useFilters } from '../../contexts/FilterContext';
import { formatCompact } from '../../utils/format';

interface StatsData {
  bevolking: { value: number; change: string | null };
  huishoudens: { value: number; change: string | null };
  woningen: { value: number };
  woningtekort: { value: number };
}

interface PrognoseData {
  bevolking2030: number | null;
  bevolkingChange: number | null;
}

const statCards = [
  { key: 'bevolking' as const, label: 'Bevolking', icon: Users, color: 'blue' },
  { key: 'huishoudens' as const, label: 'Huishoudens', icon: Home, color: 'green' },
  { key: 'woningen' as const, label: 'Woningen', icon: Building2, color: 'purple' },
  { key: 'woningtekort' as const, label: 'Woningtekort', icon: TrendingDown, color: 'orange' },
];

const colorClasses: Record<string, { bg: string; icon: string; text: string }> = {
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', text: 'text-blue-700' },
  green: { bg: 'bg-green-50', icon: 'text-green-600', text: 'text-green-700' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', text: 'text-purple-700' },
  orange: { bg: 'bg-orange-50', icon: 'text-orange-600', text: 'text-orange-700' },
};

export function StatsSummary() {
  const { filters } = useFilters();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [prognose, setPrognose] = useState<PrognoseData | null>(null);
  const [sparklines, setSparklines] = useState<Record<string, { year: number; value: number }[]>>({});

  useEffect(() => {
    api.get<{ stats: StatsData }>('/stats/overview', {
      year: filters.period.year,
      geoCode: filters.geoCode,
    }).then(({ stats }) => setStats(stats))
      .catch(() => setStats(null));

    // Fetch 2030 prognose for the prognose hero card
    api.get<{ stats: StatsData }>('/stats/overview', {
      year: 2030,
      geoCode: filters.geoCode,
    }).then(({ stats: futureStats }) => {
      if (futureStats.bevolking.value > 0) {
        setPrognose({ bevolking2030: futureStats.bevolking.value, bevolkingChange: null });
      } else {
        setPrognose(null);
      }
    }).catch(() => setPrognose(null));

    // Fetch sparkline data for each source
    const sources = ['bevolking', 'huishoudens', 'woningen', 'woningtekort'];
    Promise.all(
      sources.map(s =>
        api.get<{ timeSeries: { year: number; value: number }[] }>(`/stats/timeseries/${s}`, { geoCode: filters.geoCode })
          .then(d => [s, d.timeSeries] as [string, { year: number; value: number }[]])
          .catch(() => [s, []] as [string, { year: number; value: number }[]])
      )
    ).then(results => {
      const map: Record<string, { year: number; value: number }[]> = {};
      for (const [source, ts] of results) map[source] = ts;
      setSparklines(map);
    });
  }, [filters.period.year, filters.geoCode]);

  if (!stats) return null;

  // Calculate prognose change
  const progChange = prognose?.bevolking2030 && stats.bevolking.value > 0
    ? ((prognose.bevolking2030 - stats.bevolking.value) / stats.bevolking.value) * 100
    : null;

  return (
    <>
      {/* Prognose Hero Card */}
      {prognose?.bevolking2030 && prognose.bevolking2030 > 0 && (
        <div className="mb-4 rounded-xl border border-purple-200 bg-gradient-to-r from-white via-purple-50/30 to-purple-50/50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="h-5 w-5 text-purple-600" />
            <h3 className="text-sm font-semibold text-purple-800">AI Bevolkingsprognose</h3>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
              TSA Engine &middot; 7 modellen
            </span>
          </div>
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Nu ({filters.period.year})</p>
              <p className="text-3xl font-bold text-gray-900">{formatCompact(stats.bevolking.value)}</p>
            </div>
            <ArrowRight className="h-8 w-8 text-purple-300 flex-shrink-0" />
            <div>
              <p className="text-xs text-purple-600 mb-0.5">Prognose (2030)</p>
              <p className="text-3xl font-bold text-purple-700">{formatCompact(prognose.bevolking2030)}</p>
            </div>
            {progChange !== null && (
              <div className={`ml-auto rounded-xl px-4 py-2 ${progChange > 0 ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
                <p className="text-xs text-gray-500">Verwachte groei</p>
                <p className={`text-xl font-bold ${progChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {progChange > 0 ? '+' : ''}{progChange.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-400">
                  {progChange > 0 ? '+' : ''}{formatCompact(prognose.bevolking2030 - stats.bevolking.value)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map(({ key, label, icon: Icon, color }) => {
          const data = stats[key];
          const value = data.value;
          const change = 'change' in data ? data.change : null;
          const colors = colorClasses[color];

          const spark = sparklines[key === 'woningtekort' ? 'woningtekort' : key] || [];
          const sparkColor = parseFloat(change || '0') >= 0 ? '#10b981' : '#ef4444';

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
                      {value.toLocaleString('nl-NL')}
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
    </>
  );
}
