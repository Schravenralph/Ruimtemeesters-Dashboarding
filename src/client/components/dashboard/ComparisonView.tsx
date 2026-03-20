import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { queryData } from '../../services/api/data';
import { useFilters } from '../../contexts/FilterContext';
import type { DataPoint } from '@shared/api/contracts';

interface ComparisonViewProps {
  dataSource: string;
  title: string;
}

interface ComparisonItem {
  label: string;
  currentValue: number;
  compareValue: number;
  change: number;
  changePercent: number;
}

export function ComparisonView({ dataSource, title }: ComparisonViewProps) {
  const { filters } = useFilters();
  const [items, setItems] = useState<ComparisonItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!filters.comparisonEnabled || !filters.period.compareYear) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    Promise.all([
      queryData({
        source: dataSource,
        geoCode: filters.geoCode,
        geoLevel: filters.geoLevel,
        year: filters.period.year,
      }),
      queryData({
        source: dataSource,
        geoCode: filters.geoCode,
        geoLevel: filters.geoLevel,
        year: filters.period.compareYear,
      }),
    ]).then(([currentRes, compareRes]) => {
      const currentMap = new Map<string, number>();
      const compareMap = new Map<string, number>();

      for (const d of currentRes.data) {
        const key = d.dimensionValue || d.geoName || 'Totaal';
        currentMap.set(key, (currentMap.get(key) || 0) + d.value);
      }

      for (const d of compareRes.data) {
        const key = d.dimensionValue || d.geoName || 'Totaal';
        compareMap.set(key, (compareMap.get(key) || 0) + d.value);
      }

      const allKeys = new Set([...currentMap.keys(), ...compareMap.keys()]);
      const comparisonItems: ComparisonItem[] = Array.from(allKeys).map(key => {
        const current = currentMap.get(key) || 0;
        const compare = compareMap.get(key) || 0;
        const change = current - compare;
        const changePercent = compare > 0 ? ((change / compare) * 100) : 0;

        return {
          label: key,
          currentValue: current,
          compareValue: compare,
          change,
          changePercent,
        };
      });

      setItems(comparisonItems.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)));
    }).finally(() => setIsLoading(false));
  }, [dataSource, filters]);

  if (!filters.comparisonEnabled || items.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 mb-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        {title}: {filters.period.year} vs {filters.period.compareYear}
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.slice(0, 8).map(item => (
          <div key={item.label} className="rounded-lg border border-gray-100 p-3">
            <p className="text-xs text-gray-500 truncate">{item.label}</p>
            <p className="text-lg font-bold text-gray-900 mt-1">
              {item.currentValue.toLocaleString('nl-NL')}
            </p>
            <div className={`flex items-center gap-1 mt-1 text-sm ${
              item.change > 0 ? 'text-green-600' : item.change < 0 ? 'text-red-600' : 'text-gray-500'
            }`}>
              {item.change > 0 ? (
                <ArrowUp className="h-3.5 w-3.5" />
              ) : item.change < 0 ? (
                <ArrowDown className="h-3.5 w-3.5" />
              ) : (
                <Minus className="h-3.5 w-3.5" />
              )}
              <span className="font-medium">
                {item.change > 0 ? '+' : ''}{item.changePercent.toFixed(1)}%
              </span>
              <span className="text-xs text-gray-400">
                ({item.change > 0 ? '+' : ''}{item.change.toLocaleString('nl-NL')})
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
