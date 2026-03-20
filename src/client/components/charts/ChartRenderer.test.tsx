import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChartRenderer } from './ChartRenderer';

// Mock all chart components
vi.mock('./BarChart', () => ({
  BarChartComponent: () => <div data-testid="bar-chart">Bar</div>,
}));
vi.mock('./LineChart', () => ({
  LineChartComponent: () => <div data-testid="line-chart">Line</div>,
}));
vi.mock('./PieChart', () => ({
  PieChartComponent: () => <div data-testid="pie-chart">Pie</div>,
}));
vi.mock('./RadarChart', () => ({
  RadarChartComponent: () => <div data-testid="radar-chart">Radar</div>,
}));
vi.mock('./DataTable', () => ({
  DataTableComponent: () => <div data-testid="data-table">Table</div>,
}));
vi.mock('./ChoroplethMap', () => ({
  ChoroplethMapComponent: () => <div data-testid="choropleth-map">Map</div>,
}));
vi.mock('./PopulationPyramid', () => ({
  PopulationPyramidComponent: () => <div data-testid="population-pyramid">Pyramid</div>,
}));

const testData = [
  { geoCode: 'NL', geoName: 'Nederland', year: 2024, value: 17000000 },
];

describe('ChartRenderer', () => {
  it('renders loading state', () => {
    render(<ChartRenderer chartType="bar" data={[]} isLoading />);
    expect(screen.getByText('Data laden...')).toBeDefined();
  });

  it('renders error state', () => {
    render(<ChartRenderer chartType="bar" data={[]} error="Something failed" />);
    expect(screen.getByText('Something failed')).toBeDefined();
  });

  it('renders empty state', () => {
    render(<ChartRenderer chartType="bar" data={[]} />);
    expect(screen.getByText('Geen data beschikbaar voor deze selectie')).toBeDefined();
  });

  it('renders bar chart', () => {
    render(<ChartRenderer chartType="bar" data={testData} />);
    expect(screen.getByTestId('bar-chart')).toBeDefined();
  });

  it('renders stacked bar chart', () => {
    render(<ChartRenderer chartType="stacked-bar" data={testData} />);
    expect(screen.getByTestId('bar-chart')).toBeDefined();
  });

  it('renders line chart', () => {
    render(<ChartRenderer chartType="line" data={testData} />);
    expect(screen.getByTestId('line-chart')).toBeDefined();
  });

  it('renders pie chart', () => {
    render(<ChartRenderer chartType="pie" data={testData} />);
    expect(screen.getByTestId('pie-chart')).toBeDefined();
  });

  it('renders radar chart', () => {
    render(<ChartRenderer chartType="radar" data={testData} />);
    expect(screen.getByTestId('radar-chart')).toBeDefined();
  });

  it('renders data table', () => {
    render(<ChartRenderer chartType="table" data={testData} />);
    expect(screen.getByTestId('data-table')).toBeDefined();
  });

  it('renders choropleth map', () => {
    render(<ChartRenderer chartType="choropleth" data={testData} />);
    expect(screen.getByTestId('choropleth-map')).toBeDefined();
  });

  it('renders population pyramid', () => {
    render(<ChartRenderer chartType="pyramid" data={testData} />);
    expect(screen.getByTestId('population-pyramid')).toBeDefined();
  });
});
