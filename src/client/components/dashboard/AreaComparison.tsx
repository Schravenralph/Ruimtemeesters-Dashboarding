import { useState, useEffect } from 'react';
import { ArrowRight, BarChart3 } from 'lucide-react';
import { queryData } from '../../services/api/data';
import { useFilters } from '../../contexts/FilterContext';
import { formatNumber, formatCompact, formatPercent } from '../../utils/format';
import type { DataPoint } from '@shared/api/contracts';

interface AreaComparisonProps {
  dataSource: string;
  areaCode1: string;
  areaCode2: string;
}

interface ComparisonMetric {
  label: string;
  value1: number;
  value2: number;
  difference: number;
  percentDiff: number;
}

export function AreaComparison({ dataSource, areaCode1, areaCode2 }: AreaComparisonProps) {
  const { filters } = useFilters();
  const [metrics, setMetrics] = useState<ComparisonMetric[]>([]);
  const [names, setNames] = useState<[string, string]>(['', '']);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!areaCode1 || !areaCode2) return;

    setIsLoading(true);

    Promise.all([
      queryData({ source: dataSource, geoCode: areaCode1, year: filters.period.year }),
      queryData({ source: dataSource, geoCode: areaCode2, year: filters.period.year }),
    ]).then(([res1, res2]) => {
      // Get area names
      const name1 = res1.data[0]?.geoName || areaCode1;
      const name2 = res2.data[0]?.geoName || areaCode2;
      setNames([name1, name2]);

      // Aggregate by dimension
      const agg1 = new Map<string, number>();
      const agg2 = new Map<string, number>();

      for (const d of res1.data) {
        const key = d.dimensionValue || 'Totaal';
        agg1.set(key, (agg1.get(key) || 0) + d.value);
      }
      for (const d of res2.data) {
        const key = d.dimensionValue || 'Totaal';
        agg2.set(key, (agg2.get(key) || 0) + d.value);
      }

      // Build comparison metrics
      const allKeys = new Set([...agg1.keys(), ...agg2.keys()]);
      const compMetrics: ComparisonMetric[] = [...allKeys].map(key => {
        const v1 = agg1.get(key) || 0;
        const v2 = agg2.get(key) || 0;
        const diff = v1 - v2;
        const pctDiff = v2 > 0 ? (diff / v2) * 100 : 0;
        return { label: key, value1: v1, value2: v2, difference: diff, percentDiff: pctDiff };
      });

      // Add totals
      const total1 = [...agg1.values()].reduce((a, b) => a + b, 0);
      const total2 = [...agg2.values()].reduce((a, b) => a + b, 0);
      compMetrics.unshift({
        label: 'Totaal',
        value1: total1,
        value2: total2,
        difference: total1 - total2,
        percentDiff: total2 > 0 ? ((total1 - total2) / total2) * 100 : 0,
      });

      setMetrics(compMetrics);
    }).finally(() => setIsLoading(false));
  }, [dataSource, areaCode1, areaCode2, filters.period.year]);

  if (isLoading) {
    return <div className="animate-pulse h-32 bg-gray-100 rounded-xl" />;
  }

  if (metrics.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 mb-4">
      {/* Header */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900">{names[0]}</p>
        </div>
        <ArrowRight className="h-5 w-5 text-gray-300" />
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900">{names[1]}</p>
        </div>
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-2 text-left text-xs text-gray-500 uppercase">Indicator</th>
              <th className="py-2 text-right text-xs text-gray-500 uppercase">{names[0]}</th>
              <th className="py-2 text-right text-xs text-gray-500 uppercase">{names[1]}</th>
              <th className="py-2 text-right text-xs text-gray-500 uppercase">Verschil</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map(m => (
              <tr key={m.label} className={`border-b border-gray-50 ${m.label === 'Totaal' ? 'font-semibold bg-gray-50' : ''}`}>
                <td className="py-2 text-gray-700">{m.label}</td>
                <td className="py-2 text-right font-mono">{formatNumber(m.value1)}</td>
                <td className="py-2 text-right font-mono">{formatNumber(m.value2)}</td>
                <td className={`py-2 text-right font-mono ${
                  m.difference > 0 ? 'text-green-600' : m.difference < 0 ? 'text-red-600' : ''
                }`}>
                  {m.difference > 0 ? '+' : ''}{formatCompact(m.difference)}
                  <span className="text-xs text-gray-400 ml-1">
                    ({formatPercent(m.percentDiff)})
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
