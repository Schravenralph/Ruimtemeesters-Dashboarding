import { useState, useEffect } from 'react';
import { Trophy, ArrowUp, ArrowDown, ChevronDown, ChevronUp } from 'lucide-react';
import { queryData } from '../../services/api/data';
import { useFilters } from '../../contexts/FilterContext';
import { formatNumber, formatCompact } from '../../utils/format';
import type { DataPoint } from '@shared/api/contracts';

interface RankingListProps {
  dataSource: string;
  title?: string;
  maxItems?: number;
}

interface RankedItem {
  rank: number;
  code: string;
  name: string;
  value: number;
}

export function RankingList({ dataSource, title = 'Top gebieden', maxItems = 10 }: RankingListProps) {
  const { filters } = useFilters();
  const [items, setItems] = useState<RankedItem[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    queryData({
      source: dataSource,
      geoLevel: filters.geoLevel === 'land' ? 'gemeente' : filters.geoLevel,
      year: filters.period.year,
    }).then(response => {
      // Aggregate by geo area
      const aggregated = new Map<string, { name: string; total: number }>();
      for (const d of response.data) {
        const existing = aggregated.get(d.geoCode) || { name: d.geoName, total: 0 };
        existing.total += d.value;
        aggregated.set(d.geoCode, existing);
      }

      const ranked = [...aggregated.entries()]
        .map(([code, { name, total }]) => ({ code, name, value: total }))
        .sort((a, b) => b.value - a.value)
        .map((item, i) => ({ ...item, rank: i + 1 }));

      setItems(ranked);
    }).finally(() => setIsLoading(false));
  }, [dataSource, filters.geoLevel, filters.period.year]);

  if (isLoading) return <div className="animate-pulse h-48 bg-gray-100 rounded-xl" />;
  if (items.length === 0) return null;

  const displayItems = showAll ? items : items.slice(0, maxItems);
  const maxValue = items[0]?.value || 1;

  const medalColors: Record<number, string> = {
    1: 'text-yellow-500',
    2: 'text-gray-400',
    3: 'text-orange-600',
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="h-4 w-4 text-yellow-500" />
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
        <span className="text-xs text-gray-400">({items.length} gebieden)</span>
      </div>

      <div className="space-y-1">
        {displayItems.map(item => (
          <div
            key={item.code}
            className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-50"
          >
            <span className={`text-sm font-bold w-6 text-right ${medalColors[item.rank] || 'text-gray-400'}`}>
              {item.rank}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-900 truncate">{item.name}</span>
                <span className="text-sm font-mono text-gray-700 ml-2 shrink-0">
                  {formatCompact(item.value)}
                </span>
              </div>
              <div className="mt-0.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${(item.value / maxValue) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {items.length > maxItems && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="flex w-full items-center justify-center gap-1 mt-2 pt-2 border-t border-gray-100 text-xs text-blue-600 hover:text-blue-700"
        >
          {showAll ? (
            <><ChevronUp className="h-3.5 w-3.5" /> Minder tonen</>
          ) : (
            <><ChevronDown className="h-3.5 w-3.5" /> Alle {items.length} tonen</>
          )}
        </button>
      )}
    </div>
  );
}
