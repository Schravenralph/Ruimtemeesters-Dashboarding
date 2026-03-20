import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { queryData } from '../../services/api/data';
import { useFilters } from '../../contexts/FilterContext';
import { formatCompact } from '../../utils/format';
import type { DataPoint } from '@shared/api/contracts';

interface YearOverYearChartProps {
  dataSource: string;
  title?: string;
  yearsToCompare?: number[];
}

const LINE_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

/**
 * Year-over-year comparison chart.
 * Shows multiple years on the same axis for easy comparison.
 * Uses dimension values as the x-axis categories.
 */
export function YearOverYearChart({
  dataSource,
  title = 'Jaar-over-jaar vergelijking',
  yearsToCompare,
}: YearOverYearChartProps) {
  const { filters } = useFilters();
  const [chartData, setChartData] = useState<Record<string, string | number>[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const selectedYears = yearsToCompare || [
    filters.period.year,
    filters.period.year - 1,
    filters.period.year - 5,
  ].filter(y => y >= 2000);

  useEffect(() => {
    setIsLoading(true);

    Promise.all(
      selectedYears.map(year =>
        queryData({
          source: dataSource,
          geoCode: filters.geoCode,
          year,
        }).catch(() => ({ data: [] as DataPoint[], metadata: { source: dataSource, totalRecords: 0 } })),
      ),
    ).then(results => {
      // Get all dimension values across years
      const allDimValues = new Set<string>();
      for (const result of results) {
        for (const d of result.data) {
          if (d.dimensionValue) allDimValues.add(d.dimensionValue);
        }
      }

      if (allDimValues.size === 0) {
        // No dimensions — use geo areas as categories
        const allGeo = new Set<string>();
        for (const result of results) {
          for (const d of result.data) allGeo.add(d.geoName);
        }

        const data = [...allGeo].map(geoName => {
          const entry: Record<string, string | number> = { name: geoName };
          selectedYears.forEach((year, i) => {
            const total = results[i].data
              .filter(d => d.geoName === geoName)
              .reduce((sum, d) => sum + d.value, 0);
            entry[String(year)] = total;
          });
          return entry;
        }).slice(0, 15); // Limit to 15 categories

        setChartData(data);
      } else {
        // Use dimensions as categories
        const data = [...allDimValues].map(dimVal => {
          const entry: Record<string, string | number> = { name: dimVal };
          selectedYears.forEach((year, i) => {
            const total = results[i].data
              .filter(d => d.dimensionValue === dimVal)
              .reduce((sum, d) => sum + d.value, 0);
            entry[String(year)] = total;
          });
          return entry;
        });

        setChartData(data);
      }

      setYears(selectedYears);
      setIsLoading(false);
    });
  }, [dataSource, filters.geoCode, selectedYears.join(',')]);

  if (isLoading || chartData.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 mb-4">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">{title}</h4>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatCompact(v)} />
          <Tooltip formatter={(v: number) => formatCompact(v)} />
          <Legend />
          {years.map((year, i) => (
            <Line
              key={year}
              type="monotone"
              dataKey={String(year)}
              stroke={LINE_COLORS[i % LINE_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
