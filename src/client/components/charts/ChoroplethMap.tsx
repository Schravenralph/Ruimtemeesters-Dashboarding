import type { DataPoint } from '@shared/api/contracts';

interface ChoroplethMapProps {
  data: DataPoint[];
}

// Simple choropleth placeholder — in production this would use MapLibre/Leaflet
// For now, render as a colored list showing relative values
export function ChoroplethMapComponent({ data }: ChoroplethMapProps) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">Geen data beschikbaar</p>;
  }

  // Aggregate by geoCode
  const aggregated = new Map<string, { name: string; total: number }>();
  for (const d of data) {
    const existing = aggregated.get(d.geoCode) || { name: d.geoName, total: 0 };
    existing.total += d.value;
    aggregated.set(d.geoCode, existing);
  }

  const entries = [...aggregated.entries()].sort((a, b) => b[1].total - a[1].total);
  const maxValue = Math.max(...entries.map(e => e[1].total), 1);

  const getColor = (value: number) => {
    const ratio = value / maxValue;
    if (ratio > 0.8) return 'bg-blue-700 text-white';
    if (ratio > 0.6) return 'bg-blue-500 text-white';
    if (ratio > 0.4) return 'bg-blue-400 text-white';
    if (ratio > 0.2) return 'bg-blue-200 text-gray-900';
    return 'bg-blue-100 text-gray-900';
  };

  return (
    <div className="space-y-1 max-h-[350px] overflow-y-auto">
      <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
        <span>Laag</span>
        <div className="flex gap-0.5">
          {['bg-blue-100', 'bg-blue-200', 'bg-blue-400', 'bg-blue-500', 'bg-blue-700'].map(c => (
            <div key={c} className={`w-6 h-3 ${c} rounded-sm`} />
          ))}
        </div>
        <span>Hoog</span>
      </div>
      {entries.map(([code, { name, total }]) => (
        <div key={code} className="flex items-center gap-2">
          <div
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${getColor(total)}`}
            style={{ width: `${Math.max(20, (total / maxValue) * 100)}%` }}
          >
            {name}
          </div>
          <span className="text-sm text-gray-600 font-mono whitespace-nowrap">
            {total.toLocaleString('nl-NL')}
          </span>
        </div>
      ))}
    </div>
  );
}
