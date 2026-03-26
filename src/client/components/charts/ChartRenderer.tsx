import type { ChartType, DataPoint } from '@shared/api/contracts';
import { BarChartComponent } from './BarChart';
import { LineChartComponent } from './LineChart';
import { PieChartComponent } from './PieChart';
import { DonutChartComponent } from './DonutChart';
import { RadarChartComponent } from './RadarChart';
import { DataTableComponent } from './DataTable';
import { ColorTableComponent } from './ColorTable';
import { ChoroplethMapComponent } from './ChoroplethMap';
import { PopulationPyramidComponent } from './PopulationPyramid';
import { NumberDisplay } from './NumberDisplay';
import { HorizontalBarChartComponent } from './HorizontalBarChart';
import { StackedAreaChartComponent } from './StackedAreaChart';
import { TreemapChartComponent } from './TreemapChart';
import { HeatmapComponent } from './Heatmap';
import { WaterfallChartComponent } from './WaterfallChart';
import { LoadingOverlay } from '../ui/Spinner';

// Color scheme presets
const COLOR_SCHEMES: Record<string, string[]> = {
  default: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'],
  warm: ['#ef4444', '#f97316', '#fbbf24', '#fb923c', '#f87171', '#fca5a5'],
  cool: ['#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#22d3ee', '#34d399'],
  purple: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#7c3aed', '#6d28d9', '#ddd6fe'],
  earth: ['#92400e', '#b45309', '#d97706', '#ca8a04', '#a16207', '#854d0e'],
  contrast: ['#1e40af', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#0891b2'],
  pastel: ['#93c5fd', '#fca5a5', '#86efac', '#fde68a', '#c4b5fd', '#fbcfe8'],
  monochrome: ['#1f2937', '#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db'],
};

export interface ChartConfig {
  colorScheme?: string;
  showLegend?: boolean;
  showLabels?: boolean;
  showGrid?: boolean;
  sortOrder?: string;
  maxItems?: number;
  showTotals?: boolean;
  showPrognose?: boolean;
  yAxisMin?: number;
  yAxisMax?: number;
  tileSize?: string;
  filterDimension?: string;
  filterValue?: string;
}

interface ChartRendererProps {
  chartType: ChartType;
  data: DataPoint[];
  isLoading?: boolean;
  error?: string | null;
  config?: ChartConfig;
}

function getColors(config?: ChartConfig): string[] {
  return COLOR_SCHEMES[config?.colorScheme || 'default'] || COLOR_SCHEMES.default;
}

function applySort(data: DataPoint[], config?: ChartConfig): DataPoint[] {
  if (!config?.sortOrder || config.sortOrder === 'default') return data;
  const sorted = [...data];
  switch (config.sortOrder) {
    case 'value-asc': return sorted.sort((a, b) => a.value - b.value);
    case 'value-desc': return sorted.sort((a, b) => b.value - a.value);
    case 'label-asc': return sorted.sort((a, b) => (a.dimensionValue || '').localeCompare(b.dimensionValue || ''));
    case 'label-desc': return sorted.sort((a, b) => (b.dimensionValue || '').localeCompare(a.dimensionValue || ''));
    default: return data;
  }
}

function applyFilters(data: DataPoint[], config?: ChartConfig): DataPoint[] {
  let filtered = data;

  // Apply dimension filter
  if (config?.filterDimension && config?.filterValue) {
    filtered = filtered.filter(d => d.dimensionValue === config.filterValue);
  }

  // Filter prognose if disabled
  if (config?.showPrognose === false) {
    filtered = filtered.filter(d => d.source !== 'ruimtemeesters_prognose' && d.source !== 'cbs_prognose');
  }

  // Apply max items
  if (config?.maxItems && config.maxItems > 0) {
    filtered = filtered.slice(0, config.maxItems);
  }

  return filtered;
}

export function ChartRenderer({ chartType, data, isLoading, error, config }: ChartRendererProps) {
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

  const colors = getColors(config);
  const processedData = applySort(applyFilters(data, config), config);

  switch (chartType) {
    case 'bar':
      return <BarChartComponent data={processedData} colors={colors} />;
    case 'stacked-bar':
      return <BarChartComponent data={processedData} stacked colors={colors} />;
    case 'horizontal-bar':
      return <HorizontalBarChartComponent data={processedData} colors={colors} />;
    case 'line':
      return <LineChartComponent data={processedData} colors={colors} />;
    case 'stacked-area':
      return <StackedAreaChartComponent data={processedData} colors={colors} />;
    case 'pie':
      return <PieChartComponent data={processedData} colors={colors} />;
    case 'donut':
      return <DonutChartComponent data={processedData} colors={colors} />;
    case 'radar':
      return <RadarChartComponent data={processedData} colors={colors} />;
    case 'table':
      return <DataTableComponent data={processedData} />;
    case 'color-table':
      return <ColorTableComponent data={processedData} />;
    case 'number':
      return <NumberDisplay data={processedData} />;
    case 'treemap':
      return <TreemapChartComponent data={processedData} colors={colors} />;
    case 'heatmap':
      return <HeatmapComponent data={processedData} />;
    case 'waterfall':
      return <WaterfallChartComponent data={processedData} colors={colors} />;
    case 'choropleth':
      return <ChoroplethMapComponent data={processedData} />;
    case 'pyramid':
      return <PopulationPyramidComponent data={processedData} />;
    default:
      return <p className="text-sm text-gray-500">Onbekend grafiektype: {chartType}</p>;
  }
}
