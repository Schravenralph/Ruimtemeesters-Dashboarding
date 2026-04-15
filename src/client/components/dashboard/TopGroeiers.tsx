import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';
import { api } from '../../services/api/client';
import { formatCompact, formatPercent } from '../../utils/format';

interface AreaComparison {
  areaCode: string;
  areaName: string;
  currentValue: number;
  previousValue: number;
  absoluteChange: number;
  percentChange: number;
  rank: number;
}

interface TopGroeiersProps {
  source?: string;
  currentYear?: number;
  previousYear?: number;
  limit?: number;
}

export function TopGroeiers({
  source = 'bevolking',
  currentYear = 2024,
  previousYear = 2020,
  limit = 10,
}: TopGroeiersProps) {
  const [groeiers, setGroeiers] = useState<AreaComparison[]>([]);
  const [krimpers, setKrimpers] = useState<AreaComparison[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<'groeiers' | 'krimpers'>('groeiers');

  useEffect(() => {
    setIsLoading(true);
    api.get<AreaComparison[]>('/comparison/areas', {
      source,
      level: 'gemeente',
      currentYear,
      previousYear,
    })
      .then((data) => {
        // Filter out tiny gemeenten (< 5000 pop) to avoid noise
        const filtered = data.filter(a => a.currentValue > 5000);
        const sorted = [...filtered].sort((a, b) => b.percentChange - a.percentChange);
        setGroeiers(sorted.slice(0, limit));
        setKrimpers([...filtered].sort((a, b) => a.percentChange - b.percentChange).slice(0, limit));
      })
      .catch(() => { setGroeiers([]); setKrimpers([]); })
      .finally(() => setIsLoading(false));
  }, [source, currentYear, previousYear, limit]);

  const items = tab === 'groeiers' ? groeiers : krimpers;
  const maxAbsChange = Math.max(...items.map(a => Math.abs(a.percentChange)), 1);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-6">
        <div className="h-[300px] flex items-center justify-center">
          <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          <h3 className="text-base font-semibold text-gray-900">
            Bevolkingsgroei {previousYear}–{currentYear}
          </h3>
        </div>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          <button
            onClick={() => setTab('groeiers')}
            className={`px-3 py-1.5 ${tab === 'groeiers' ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Snelste groeiers
          </button>
          <button
            onClick={() => setTab('krimpers')}
            className={`px-3 py-1.5 ${tab === 'krimpers' ? 'bg-red-50 text-red-700 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Sterkste krimp
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((area, i) => {
          const isGrowing = area.percentChange > 0;
          const barWidth = Math.abs(area.percentChange) / maxAbsChange * 100;

          return (
            <div key={area.areaCode} className="flex items-center gap-3 group">
              <span className="text-xs font-mono text-gray-400 w-5 text-right">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-medium text-gray-900 truncate">{area.areaName}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-400">{formatCompact(area.currentValue)}</span>
                    <span className={`text-sm font-bold tabular-nums ${isGrowing ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercent(area.percentChange)}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isGrowing ? 'bg-green-400' : 'bg-red-400'}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 mt-3">
        Gemeenten met {'>'} 5.000 inwoners &middot; Bron: CBS, StatLine
      </p>
    </div>
  );
}
