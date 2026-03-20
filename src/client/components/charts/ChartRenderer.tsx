import type { ChartType, DataPoint } from '@shared/api/contracts';
import { BarChartComponent } from './BarChart';
import { LineChartComponent } from './LineChart';
import { PieChartComponent } from './PieChart';
import { RadarChartComponent } from './RadarChart';
import { DataTableComponent } from './DataTable';
import { ChoroplethMapComponent } from './ChoroplethMap';
import { PopulationPyramidComponent } from './PopulationPyramid';
import { LoadingOverlay } from '../ui/Spinner';

interface ChartRendererProps {
  chartType: ChartType;
  data: DataPoint[];
  isLoading?: boolean;
  error?: string | null;
}

export function ChartRenderer({ chartType, data, isLoading, error }: ChartRendererProps) {
  if (isLoading) {
    return <LoadingOverlay message="Data laden..." />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-gray-500">Geen data beschikbaar voor deze selectie</p>
      </div>
    );
  }

  switch (chartType) {
    case 'bar':
      return <BarChartComponent data={data} />;
    case 'stacked-bar':
      return <BarChartComponent data={data} stacked />;
    case 'line':
      return <LineChartComponent data={data} />;
    case 'pie':
      return <PieChartComponent data={data} />;
    case 'radar':
      return <RadarChartComponent data={data} />;
    case 'table':
      return <DataTableComponent data={data} />;
    case 'choropleth':
      return <ChoroplethMapComponent data={data} />;
    case 'pyramid':
      return <PopulationPyramidComponent data={data} />;
    default:
      return <p className="text-sm text-gray-500">Onbekend grafiektype: {chartType}</p>;
  }
}
