import { useState, useEffect } from 'react';
import { Users, Home, Building2, TrendingDown, ArrowUp, ArrowDown } from 'lucide-react';
import { api } from '../../services/api/client';
import { useFilters } from '../../contexts/FilterContext';

interface StatsData {
  bevolking: { value: number; change: string | null };
  huishoudens: { value: number; change: string | null };
  woningen: { value: number };
  woningtekort: { value: number };
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

  useEffect(() => {
    api.get<{ stats: StatsData }>('/stats/overview', {
      year: filters.period.year,
      geoCode: filters.geoCode,
    }).then(({ stats }) => setStats(stats))
      .catch(() => setStats(null));
  }, [filters.period.year, filters.geoCode]);

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statCards.map(({ key, label, icon: Icon, color }) => {
        const data = stats[key];
        const value = data.value;
        const change = 'change' in data ? data.change : null;
        const colors = colorClasses[color];

        return (
          <div key={key} className="rounded-xl border border-gray-200 bg-white p-5">
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
