import type { DataPoint } from '@shared/api/contracts';
import { formatNumber, formatCompact } from '../../utils/format';

interface PointMapProps {
  data: DataPoint[];
}

/**
 * Point map (graduated symbols) — matches Primos's "Kaart (punten)" presentation type.
 * Shows circles sized proportionally to values, positioned by area.
 * This is a simplified CSS-based version; production would use OpenLayers.
 */
export function PointMapComponent({ data }: PointMapProps) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">Geen data beschikbaar</p>;
  }

  // Aggregate by geo area
  const aggregated = new Map<string, { name: string; total: number }>();
  for (const d of data) {
    const existing = aggregated.get(d.geoCode) || { name: d.geoName, total: 0 };
    existing.total += d.value;
    aggregated.set(d.geoCode, existing);
  }

  const entries = [...aggregated.entries()]
    .sort((a, b) => b[1].total - a[1].total);
  const maxValue = entries[0]?.[1].total || 1;

  // Calculate circle sizes (min 8px, max 48px)
  function getSize(value: number): number {
    const ratio = value / maxValue;
    return Math.max(8, Math.round(Math.sqrt(ratio) * 48));
  }

  // Color based on value intensity
  function getColor(value: number): string {
    const ratio = value / maxValue;
    if (ratio > 0.7) return '#1e40af';
    if (ratio > 0.4) return '#3b82f6';
    if (ratio > 0.2) return '#60a5fa';
    return '#93c5fd';
  }

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span>Klein</span>
        <div className="flex items-end gap-1">
          {[0.1, 0.3, 0.6, 1.0].map(ratio => (
            <div
              key={ratio}
              className="rounded-full bg-blue-400 opacity-60"
              style={{
                width: `${Math.max(8, Math.round(Math.sqrt(ratio) * 24))}px`,
                height: `${Math.max(8, Math.round(Math.sqrt(ratio) * 24))}px`,
              }}
            />
          ))}
        </div>
        <span>Groot</span>
        <span className="ml-auto text-gray-400">
          {entries.length} gebieden · Max: {formatCompact(maxValue)}
        </span>
      </div>

      {/* Point grid */}
      <div className="flex flex-wrap gap-2 max-h-[350px] overflow-y-auto p-2">
        {entries.map(([code, { name, total }]) => {
          const size = getSize(total);
          const color = getColor(total);
          return (
            <div
              key={code}
              className="flex flex-col items-center gap-0.5 group cursor-default"
              title={`${name}: ${formatNumber(total)}`}
            >
              <div
                className="rounded-full opacity-70 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  backgroundColor: color,
                }}
              >
                {size > 24 && (
                  <span className="text-white text-[8px] font-bold">
                    {formatCompact(total)}
                  </span>
                )}
              </div>
              <span className="text-[9px] text-gray-500 truncate max-w-[60px] opacity-0 group-hover:opacity-100">
                {name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
