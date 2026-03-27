import { useState, useEffect, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { queryData } from '../../services/api/data';
import { useFilters } from '../../contexts/FilterContext';
import { formatCompact } from '../../utils/format';
import type { DataPoint } from '@shared/api/contracts';

interface MultiAreaTableProps {
  dataSource: string;
  dimension?: string;
  dimensionValue?: string;
  years?: number[];
}

type SortDir = 'asc' | 'desc' | null;

/**
 * Primos-style multi-area comparison table.
 * Rows = geographic areas, Columns = years.
 * Sortable columns, totals row, scroll.
 */
export function MultiAreaTable({ dataSource, dimension, dimensionValue, years: yearsProp }: MultiAreaTableProps) {
  const { filters } = useFilters();
  const [data, setData] = useState<DataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [showTotals, setShowTotals] = useState(true);

  const geoLevel = filters.geoLevel;
  const years = yearsProp || [filters.period.year - 2, filters.period.year - 1, filters.period.year];

  useEffect(() => {
    if (!dataSource) return;
    setIsLoading(true);

    // Fetch data for all years at the current geo level
    Promise.all(
      years.map(year =>
        queryData({
          source: dataSource,
          geoLevel,
          year,
          dimension,
          dimensionValue,
        }).then(r => r.data).catch(() => [] as DataPoint[])
      )
    ).then(results => {
      setData(results.flat());
    }).finally(() => setIsLoading(false));
  }, [dataSource, geoLevel, years.join(','), dimension, dimensionValue]);

  // Build table: rows = geo areas, columns = years
  const { rows, areaNames, totals } = useMemo(() => {
    const areaMap = new Map<string, { name: string; values: Record<number, number> }>();

    for (const d of data) {
      const key = d.geoCode;
      if (!areaMap.has(key)) {
        areaMap.set(key, { name: d.geoName || key, values: {} });
      }
      areaMap.get(key)!.values[d.year] = d.value;
    }

    const rows = Array.from(areaMap.entries()).map(([code, info]) => ({
      code,
      name: info.name,
      ...info.values,
    }));

    // Sort
    if (sortCol && sortDir) {
      rows.sort((a, b) => {
        const aVal = sortCol === 'name' ? a.name : (a as any)[sortCol] ?? 0;
        const bVal = sortCol === 'name' ? b.name : (b as any)[sortCol] ?? 0;
        const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal;
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    // Totals
    const totals: Record<number, number> = {};
    for (const yr of years) {
      totals[yr] = rows.reduce((sum, r) => sum + ((r as any)[yr] || 0), 0);
    }

    return { rows, areaNames: rows.map(r => r.name), totals };
  }, [data, sortCol, sortDir, years]);

  function toggleSort(col: string) {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : sortDir === 'desc' ? null : 'asc');
      if (sortDir === 'desc') setSortCol(null);
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  }

  function SortIcon({ col }: { col: string }) {
    if (sortCol !== col) return <ArrowUpDown className="h-3 w-3 text-gray-300" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-500" /> : <ArrowDown className="h-3 w-3 text-blue-500" />;
  }

  if (isLoading) {
    return <div className="text-sm text-gray-400 py-8 text-center">Vergelijkingstabel laden...</div>;
  }

  if (rows.length === 0) {
    return <div className="text-sm text-gray-400 py-8 text-center">Geen gebieden gevonden</div>;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50">
        <h4 className="text-sm font-medium text-gray-700">Gebiedenvergelijking ({rows.length} gebieden)</h4>
        <label className="flex items-center gap-1.5 text-xs text-gray-500">
          <input type="checkbox" checked={showTotals} onChange={(e) => setShowTotals(e.target.checked)} className="rounded" />
          Kolomtotalen
        </label>
      </div>

      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white z-10">
            <tr>
              <th
                className="text-left px-4 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-50 min-w-[200px]"
                onClick={() => toggleSort('name')}
              >
                <span className="flex items-center gap-1">Gebied <SortIcon col="name" /></span>
              </th>
              {years.map(yr => (
                <th
                  key={yr}
                  className="text-right px-4 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-50 min-w-[100px]"
                  onClick={() => toggleSort(String(yr))}
                >
                  <span className="flex items-center gap-1 justify-end">{yr} <SortIcon col={String(yr)} /></span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.code} className="hover:bg-blue-50 border-t border-gray-50">
                <td className="px-4 py-1.5 text-gray-800 font-medium">{row.name}</td>
                {years.map(yr => (
                  <td key={yr} className="px-4 py-1.5 text-right text-gray-700 tabular-nums">
                    {(row as any)[yr] != null ? formatCompact((row as any)[yr]) : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {showTotals && (
            <tfoot className="sticky bottom-0 bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td className="px-4 py-2 font-bold text-gray-800">Totaal</td>
                {years.map(yr => (
                  <td key={yr} className="px-4 py-2 text-right font-bold text-gray-800 tabular-nums">
                    {formatCompact(totals[yr])}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
