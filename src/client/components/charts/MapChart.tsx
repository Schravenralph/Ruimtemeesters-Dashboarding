import { useMemo } from 'react';
import type { DataPoint } from '@shared/api/contracts';
import { formatNumber } from '../../utils/format';

interface MapChartProps {
  data: DataPoint[];
}

/**
 * Interactive choropleth map visualization.
 * Uses a simplified SVG-based map of the Netherlands.
 * In production, this would integrate with MapLibre GL or Leaflet.
 */
export function MapChartComponent({ data }: MapChartProps) {
  // Aggregate data by geo code
  const aggregated = useMemo(() => {
    const map = new Map<string, { name: string; total: number }>();
    for (const d of data) {
      const existing = map.get(d.geoCode) || { name: d.geoName, total: 0 };
      existing.total += d.value;
      map.set(d.geoCode, existing);
    }
    return map;
  }, [data]);

  const entries = useMemo(() => {
    return [...aggregated.entries()]
      .sort((a, b) => b[1].total - a[1].total);
  }, [aggregated]);

  const maxValue = useMemo(() => Math.max(...entries.map(e => e[1].total), 1), [entries]);

  if (entries.length === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">Geen data beschikbaar</p>;
  }

  // Color scale
  const getColor = (value: number): string => {
    const ratio = value / maxValue;
    if (ratio > 0.8) return '#1e40af';
    if (ratio > 0.6) return '#3b82f6';
    if (ratio > 0.4) return '#60a5fa';
    if (ratio > 0.2) return '#93c5fd';
    return '#dbeafe';
  };

  const getBarWidth = (value: number): number => {
    return Math.max(5, (value / maxValue) * 100);
  };

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>Laag</span>
        <div className="flex gap-0.5">
          {['#dbeafe', '#93c5fd', '#60a5fa', '#3b82f6', '#1e40af'].map(c => (
            <div key={c} className="w-8 h-3 rounded-sm" style={{ backgroundColor: c }} />
          ))}
        </div>
        <span>Hoog</span>
        <span className="ml-auto text-gray-400">
          {entries.length} gebieden · Max: {formatNumber(maxValue)}
        </span>
      </div>

      {/* Horizontal bar map (choropleth-lite) */}
      <div className="space-y-1 max-h-[320px] overflow-y-auto pr-2">
        {entries.map(([code, { name, total }]) => (
          <div key={code} className="group flex items-center gap-2">
            <div className="w-32 text-sm text-gray-700 truncate shrink-0 text-right pr-2" title={name}>
              {name}
            </div>
            <div className="flex-1 relative h-7">
              <div
                className="absolute inset-y-0 left-0 rounded-r-md transition-all duration-300 group-hover:opacity-90"
                style={{
                  width: `${getBarWidth(total)}%`,
                  backgroundColor: getColor(total),
                }}
              />
              <span className="absolute inset-y-0 flex items-center text-xs font-mono pl-2"
                style={{ color: total / maxValue > 0.4 ? 'white' : '#374151' }}>
                {formatNumber(total)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="flex justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
        <span>Totaal: {formatNumber(entries.reduce((s, [, v]) => s + v.total, 0))}</span>
        <span>Gemiddelde: {formatNumber(Math.round(entries.reduce((s, [, v]) => s + v.total, 0) / entries.length))}</span>
      </div>
    </div>
  );
}
