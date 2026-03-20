import type { DataPoint } from '@shared/api/contracts';
import { formatCompact, dimensionValueLabel } from '../../utils/format';
import { getSequentialColor } from '../../utils/chartColors';

interface HeatmapProps {
  data: DataPoint[];
}

/**
 * Heatmap visualization showing values in a matrix of areas × dimensions.
 * Good for comparing multiple metrics across multiple regions.
 */
export function HeatmapComponent({ data }: HeatmapProps) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">Geen data beschikbaar</p>;
  }

  // Group by area (rows) and dimension (columns)
  const areas = [...new Set(data.map(d => d.geoName))].sort();
  const dimensions = [...new Set(data.map(d => d.dimensionValue).filter(Boolean))];

  if (dimensions.length === 0) {
    // No dimensions, just show areas × years
    const years = [...new Set(data.map(d => d.year))].sort();
    return renderMatrix(data, areas, years.map(String), 'year');
  }

  return renderMatrix(data, areas, dimensions as string[], 'dimension');

  function renderMatrix(data: DataPoint[], rows: string[], cols: string[], colType: 'year' | 'dimension') {
    // Find min/max for color scale
    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Build matrix
    const matrix = new Map<string, Map<string, number>>();
    for (const d of data) {
      const rowKey = d.geoName;
      const colKey = colType === 'year' ? String(d.year) : (d.dimensionValue || '');
      if (!matrix.has(rowKey)) matrix.set(rowKey, new Map());
      matrix.get(rowKey)!.set(colKey, (matrix.get(rowKey)!.get(colKey) || 0) + d.value);
    }

    return (
      <div className="overflow-x-auto">
        <table className="text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white px-2 py-1.5 text-left text-gray-500 font-medium">Gebied</th>
              {cols.map(col => (
                <th key={col} className="px-2 py-1.5 text-center text-gray-500 font-medium whitespace-nowrap">
                  {colType === 'dimension' ? dimensionValueLabel(col) : col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 20).map(row => (
              <tr key={row}>
                <td className="sticky left-0 bg-white px-2 py-1 text-gray-700 whitespace-nowrap border-r border-gray-100">
                  {row}
                </td>
                {cols.map(col => {
                  const value = matrix.get(row)?.get(col) || 0;
                  const bgColor = getSequentialColor(value, min, max);
                  const textColor = value > (min + max) / 2 ? 'white' : '#374151';
                  return (
                    <td
                      key={col}
                      className="px-2 py-1 text-center font-mono"
                      style={{ backgroundColor: bgColor, color: textColor }}
                      title={`${row} × ${colType === 'dimension' ? dimensionValueLabel(col) : col}: ${formatCompact(value)}`}
                    >
                      {formatCompact(value)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 20 && (
          <p className="text-xs text-gray-400 mt-1">Toont 20 van {rows.length} gebieden</p>
        )}
      </div>
    );
  }
}
