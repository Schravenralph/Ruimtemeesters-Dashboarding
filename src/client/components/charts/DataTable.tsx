import { useState } from 'react';
import { Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { DataPoint } from '@shared/api/contracts';
import { dimensionValueLabel } from '../../utils/format';

interface DataTableProps {
  data: DataPoint[];
}

type SortField = 'geoName' | 'year' | 'dimensionValue' | 'value';
type SortDir = 'asc' | 'desc';

export function DataTableComponent({ data }: DataTableProps) {
  const [sortField, setSortField] = useState<SortField>('value');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  if (data.length === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">Geen data beschikbaar</p>;
  }

  const hasDimension = data.some(d => d.dimensionValue);
  const hasYear = data.some(d => d.year);

  // Sort data
  const sortedData = [...data].sort((a, b) => {
    let aVal: string | number = '';
    let bVal: string | number = '';

    switch (sortField) {
      case 'geoName':
        aVal = a.geoName || a.geoCode;
        bVal = b.geoName || b.geoCode;
        break;
      case 'year':
        aVal = a.year;
        bVal = b.year;
        break;
      case 'dimensionValue':
        aVal = a.dimensionValue || '';
        bVal = b.dimensionValue || '';
        break;
      case 'value':
        aVal = a.value;
        bVal = b.value;
        break;
    }

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    }
    const cmp = String(aVal).localeCompare(String(bVal), 'nl');
    return sortDir === 'asc' ? cmp : -cmp;
  });

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'value' ? 'desc' : 'asc');
    }
  }

  function downloadCsv() {
    const headers = ['Gebied', ...(hasYear ? ['Jaar'] : []), ...(hasDimension ? ['Categorie'] : []), 'Waarde'];
    const rows = sortedData.map(row => [
      row.geoName || row.geoCode,
      ...(hasYear ? [String(row.year)] : []),
      ...(hasDimension ? [row.dimensionValue || ''] : []),
      String(row.value),
    ]);

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }); // BOM for Excel NL
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data_export.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-gray-300" />;
    return sortDir === 'asc'
      ? <ArrowUp className="h-3 w-3 text-blue-500" />
      : <ArrowDown className="h-3 w-3 text-blue-500" />;
  }

  return (
    <div>
      <div className="flex justify-end mb-2">
        <button
          onClick={downloadCsv}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
        >
          <Download className="h-3 w-3" />
          CSV downloaden
        </button>
      </div>

      <div className="overflow-x-auto max-h-[400px] overflow-y-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => toggleSort('geoName')}
              >
                <span className="flex items-center gap-1">Gebied <SortIcon field="geoName" /></span>
              </th>
              {hasYear && (
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('year')}
                >
                  <span className="flex items-center gap-1">Jaar <SortIcon field="year" /></span>
                </th>
              )}
              {hasDimension && (
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('dimensionValue')}
                >
                  <span className="flex items-center gap-1">Categorie <SortIcon field="dimensionValue" /></span>
                </th>
              )}
              <th
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => toggleSort('value')}
              >
                <span className="flex items-center gap-1 justify-end">Waarde <SortIcon field="value" /></span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map((row, index) => (
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
                    {dimensionValueLabel(row.dimensionValue || '')}
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

      <div className="mt-2 text-xs text-gray-400">
        {sortedData.length} rij{sortedData.length !== 1 ? 'en' : ''}
      </div>
    </div>
  );
}
