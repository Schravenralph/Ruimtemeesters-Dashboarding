import type { DataPoint } from '@shared/api/contracts';

interface DataTableProps {
  data: DataPoint[];
}

export function DataTableComponent({ data }: DataTableProps) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">Geen data beschikbaar</p>;
  }

  // Determine columns from data
  const hasDimension = data.some(d => d.dimensionValue);
  const hasYear = data.some(d => d.year);

  return (
    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Gebied
            </th>
            {hasYear && (
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Jaar
              </th>
            )}
            {hasDimension && (
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Categorie
              </th>
            )}
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Waarde
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap">
                {row.geoName || row.geoCode}
              </td>
              {hasYear && (
                <td className="px-4 py-2 text-sm text-gray-600 whitespace-nowrap">
                  {row.year}
                </td>
              )}
              {hasDimension && (
                <td className="px-4 py-2 text-sm text-gray-600 whitespace-nowrap">
                  {row.dimensionValue}
                </td>
              )}
              <td className="px-4 py-2 text-sm text-gray-900 text-right whitespace-nowrap font-mono">
                {row.value.toLocaleString('nl-NL')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
