import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { queryData } from '../../services/api/data';
import { useFilters } from '../../contexts/FilterContext';
import { formatNumber, formatPercent, dimensionValueLabel } from '../../utils/format';
import type { DataPoint } from '@shared/api/contracts';

interface ComparisonTableProps {
  dataSource: string;
}

interface ComparisonRow {
  label: string;
  currentValue: number;
  compareValue: number;
  absoluteChange: number;
  percentChange: number;
}

export function ComparisonTable({ dataSource }: ComparisonTableProps) {
  const { filters } = useFilters();
  const [rows, setRows] = useState<ComparisonRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'label' | 'change'>('change');

  useEffect(() => {
    if (!filters.comparisonEnabled || !filters.period.compareYear) {
      setRows([]);
      return;
    }

    setIsLoading(true);

    Promise.all([
      queryData({
        source: dataSource,
        geoLevel: filters.geoLevel,
        year: filters.period.year,
      }),
      queryData({
        source: dataSource,
        geoLevel: filters.geoLevel,
        year: filters.period.compareYear,
      }),
    ]).then(([currentRes, compareRes]) => {
      // Group by geographic area
      const currentMap = new Map<string, { name: string; total: number }>();
      const compareMap = new Map<string, { name: string; total: number }>();

      for (const d of currentRes.data) {
        const key = d.geoCode;
        const existing = currentMap.get(key) || { name: d.geoName, total: 0 };
        existing.total += d.value;
        currentMap.set(key, existing);
      }

      for (const d of compareRes.data) {
        const key = d.geoCode;
        const existing = compareMap.get(key) || { name: d.geoName, total: 0 };
        existing.total += d.value;
        compareMap.set(key, existing);
      }

      const allKeys = new Set([...currentMap.keys(), ...compareMap.keys()]);
      const comparisonRows: ComparisonRow[] = [...allKeys].map(key => {
        const current = currentMap.get(key);
        const compare = compareMap.get(key);
        const currentValue = current?.total || 0;
        const compareValue = compare?.total || 0;
        const absoluteChange = currentValue - compareValue;
        const percentChange = compareValue > 0 ? (absoluteChange / compareValue) * 100 : 0;

        return {
          label: current?.name || compare?.name || key,
          currentValue,
          compareValue,
          absoluteChange,
          percentChange,
        };
      });

      setRows(comparisonRows);
    }).finally(() => setIsLoading(false));
  }, [dataSource, filters]);

  if (!filters.comparisonEnabled || rows.length === 0) return null;

  const sortedRows = [...rows].sort((a, b) => {
    if (sortBy === 'change') return Math.abs(b.percentChange) - Math.abs(a.percentChange);
    return a.label.localeCompare(b.label, 'nl');
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">
          Vergelijking {filters.period.year} vs {filters.period.compareYear}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('label')}
            className={`text-xs px-2 py-1 rounded ${sortBy === 'label' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}
          >
            Naam
          </button>
          <button
            onClick={() => setSortBy('change')}
            className={`text-xs px-2 py-1 rounded ${sortBy === 'change' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}
          >
            Verschil
          </button>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2 text-xs text-gray-500 uppercase">Gebied</th>
              <th className="text-right px-3 py-2 text-xs text-gray-500 uppercase">{filters.period.year}</th>
              <th className="text-right px-3 py-2 text-xs text-gray-500 uppercase">{filters.period.compareYear}</th>
              <th className="text-right px-3 py-2 text-xs text-gray-500 uppercase">Verschil</th>
              <th className="text-right px-3 py-2 text-xs text-gray-500 uppercase">%</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(row => (
              <tr key={row.label} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-900">{row.label}</td>
                <td className="px-3 py-2 text-right font-mono">{formatNumber(row.currentValue)}</td>
                <td className="px-3 py-2 text-right font-mono text-gray-500">{formatNumber(row.compareValue)}</td>
                <td className="px-3 py-2 text-right font-mono">
                  <span className={row.absoluteChange > 0 ? 'text-green-600' : row.absoluteChange < 0 ? 'text-red-600' : 'text-gray-500'}>
                    {row.absoluteChange > 0 ? '+' : ''}{formatNumber(row.absoluteChange)}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                    row.percentChange > 0 ? 'text-green-600' : row.percentChange < 0 ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {row.percentChange > 0 ? <ArrowUp className="h-3 w-3" /> :
                     row.percentChange < 0 ? <ArrowDown className="h-3 w-3" /> :
                     <Minus className="h-3 w-3" />}
                    {formatPercent(row.percentChange)}
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
