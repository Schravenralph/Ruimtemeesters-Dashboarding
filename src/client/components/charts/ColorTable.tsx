import type { DataPoint, ReferenceSeries } from '@shared/api/contracts';
import { formatNumber, dimensionValueLabel } from '../../utils/format';
import { getSequentialColor } from '../../utils/chartColors';
import { sortReferences, pickReferenceValueAtYear } from '../../utils/referenceSeries';

interface ColorTableProps {
  data: DataPoint[];
  /** SPEC-B: cohort/provincie/land reference series rendered as appended rows above the data. */
  references?: ReferenceSeries[];
}

/**
 * Kleurentabel — Color-coded data table matching Primos's "Kleurentabel" presentation type.
 * Cell background color is proportional to value (sequential color scale).
 */
export function ColorTableComponent({ data, references }: ColorTableProps) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">Geen data beschikbaar</p>;
  }

  // Group by geo area (rows) and dimension/year (columns)
  const areas = [...new Set(data.map(d => d.geoName))];
  const hasDimension = data.some(d => d.dimensionValue);
  const columns = hasDimension
    ? [...new Set(data.map(d => d.dimensionValue).filter(Boolean))] as string[]
    : [...new Set(data.map(d => String(d.year)))];

  // SPEC-B: build reference rows from references prop. Each ref becomes one row at the top.
  // For dimension-columns layout, pick the latest-year ref value once and apply across all columns
  // (refs aren't per-dimension yet — the data layer aggregates the focal-cohort over the chart's dimension filter).
  // For year-columns layout, pick per-year reference value.
  const chartYears = [...new Set(data.map(d => d.year))];
  const refRows = (references && references.length > 0)
    ? sortReferences(references)
        .map(ref => {
          if (hasDimension) {
            const v = pickReferenceValueAtYear(ref, chartYears);
            if (v === undefined) return null;
            const valuesByColumn: Record<string, number> = {};
            for (const col of columns) valuesByColumn[col] = v;
            return { ref, valuesByColumn };
          } else {
            // Year-columns layout: pick per-year value
            const valuesByColumn: Record<string, number> = {};
            for (const col of columns) {
              const point = ref.series.find(p => String(p.year) === col);
              if (point) valuesByColumn[col] = point.value;
            }
            if (Object.keys(valuesByColumn).length === 0) return null;
            return { ref, valuesByColumn };
          }
        })
        .filter((r): r is { ref: ReferenceSeries; valuesByColumn: Record<string, number> } => r !== null)
    : [];

  // Find global min/max for color scale
  const allValues = data.map(d => d.value).filter(v => v !== null && v !== undefined);
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);

  // Build lookup: area -> column -> value
  const lookup = new Map<string, Map<string, number>>();
  for (const d of data) {
    const rowKey = d.geoName;
    const colKey = hasDimension ? (d.dimensionValue || '') : String(d.year);
    if (!lookup.has(rowKey)) lookup.set(rowKey, new Map());
    const existing = lookup.get(rowKey)!.get(colKey) || 0;
    lookup.get(rowKey)!.set(colKey, existing + d.value);
  }

  function getCellStyle(value: number): { backgroundColor: string; color: string } {
    const bgColor = getSequentialColor(value, minVal, maxVal);
    // Use white text for dark backgrounds
    const ratio = maxVal > minVal ? (value - minVal) / (maxVal - minVal) : 0;
    const textColor = ratio > 0.5 ? '#ffffff' : '#111827';
    return { backgroundColor: bgColor, color: textColor };
  }

  return (
    <div className="overflow-x-auto max-h-[450px] overflow-y-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50">
              Gebied
            </th>
            {columns.map(col => (
              <th key={col} className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                {hasDimension ? dimensionValueLabel(col) : col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* SPEC-B reference rows above the data, italic + light-grey background to distinguish */}
          {refRows.map(({ ref, valuesByColumn }) => (
            <tr key={`ref-${ref.kind}`} className="border-t border-gray-100 bg-gray-50 italic text-gray-600">
              <td className="px-3 py-1.5 font-medium whitespace-nowrap sticky left-0 bg-gray-50">
                {ref.label}
              </td>
              {columns.map(col => {
                const value = valuesByColumn[col];
                if (value === undefined) {
                  return <td key={col} className="px-3 py-1.5 text-center text-gray-300">—</td>;
                }
                return (
                  <td
                    key={col}
                    className="px-3 py-1.5 text-right font-mono text-xs"
                    title={`${ref.label}: ${formatNumber(value)}`}
                  >
                    {formatNumber(value)}
                  </td>
                );
              })}
            </tr>
          ))}
          {areas.slice(0, 100).map(area => (
            <tr key={area} className="border-t border-gray-100">
              <td className="px-3 py-1.5 text-gray-900 font-medium whitespace-nowrap sticky left-0 bg-white">
                {area}
              </td>
              {columns.map(col => {
                const value = lookup.get(area)?.get(col);
                if (value === undefined) {
                  return <td key={col} className="px-3 py-1.5 text-center text-gray-300">—</td>;
                }
                const style = getCellStyle(value);
                return (
                  <td
                    key={col}
                    className="px-3 py-1.5 text-right font-mono text-xs"
                    style={style}
                    title={`${area}: ${formatNumber(value)}`}
                  >
                    {formatNumber(value)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {areas.length > 100 && (
        <p className="text-xs text-gray-400 p-2">Toont 100 van {areas.length} gebieden</p>
      )}
    </div>
  );
}
