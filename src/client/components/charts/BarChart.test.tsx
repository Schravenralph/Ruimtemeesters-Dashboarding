import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BarChartComponent } from './BarChart';
import type { DataPoint } from '@shared/api/contracts';

// Mock recharts to avoid canvas issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ReferenceLine: ({ y, label }: { y: number; label?: { value?: string } }) =>
    <div data-testid="reference-line" data-y={y} data-label={label?.value} />,
}));

describe('BarChartComponent', () => {
  const simpleData: DataPoint[] = [
    { geoCode: 'GM0363', geoName: 'Amsterdam', year: 2024, value: 900000 },
    { geoCode: 'GM0599', geoName: 'Rotterdam', year: 2024, value: 650000 },
    { geoCode: 'GM0518', geoName: "'s-Gravenhage", year: 2024, value: 550000 },
  ];

  const dimensionData: DataPoint[] = [
    { geoCode: 'GM0363', geoName: 'Amsterdam', year: 2024, dimensionValue: 'man', value: 441000 },
    { geoCode: 'GM0363', geoName: 'Amsterdam', year: 2024, dimensionValue: 'vrouw', value: 459000 },
    { geoCode: 'GM0599', geoName: 'Rotterdam', year: 2024, dimensionValue: 'man', value: 318500 },
    { geoCode: 'GM0599', geoName: 'Rotterdam', year: 2024, dimensionValue: 'vrouw', value: 331500 },
  ];

  it('renders a simple bar chart', () => {
    render(<BarChartComponent data={simpleData} />);
    expect(screen.getByTestId('responsive-container')).toBeDefined();
    expect(screen.getByTestId('bar-chart')).toBeDefined();
  });

  it('renders multi-bar chart with dimensions', () => {
    render(<BarChartComponent data={dimensionData} />);
    expect(screen.getByTestId('responsive-container')).toBeDefined();
  });

  it('renders stacked bar chart', () => {
    render(<BarChartComponent data={dimensionData} stacked />);
    expect(screen.getByTestId('responsive-container')).toBeDefined();
  });

  it('renders reference lines when references provided (SPEC-B)', () => {
    render(
      <BarChartComponent
        data={simpleData}
        references={[
          { kind: 'cohort', label: 'Cohort: Wmr Amsterdam', series: [{ year: 2024, value: 750000 }] },
          { kind: 'land', label: 'Nederland', series: [{ year: 2024, value: 600000 }] },
        ]}
      />,
    );
    const refLines = screen.getAllByTestId('reference-line');
    // 2 reference lines from the props
    expect(refLines.length).toBe(2);
    const labels = refLines.map(el => el.getAttribute('data-label'));
    expect(labels).toContain('Cohort: Wmr Amsterdam');
    expect(labels).toContain('Nederland');
  });

  it('renders no reference lines when references absent', () => {
    render(<BarChartComponent data={simpleData} />);
    const refLines = screen.queryAllByTestId('reference-line');
    expect(refLines.length).toBe(0);
  });
});
