import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { LineChartComponent } from './LineChart';
import type { DataPoint } from '@shared/api/contracts';

let capturedChartData: Array<Record<string, unknown>> | null = null;

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
    <div data-testid="responsive-container">{children}</div>,
  ComposedChart: ({ data, children }: { data: Array<Record<string, unknown>>; children: React.ReactNode }) => {
    capturedChartData = data;
    return <div data-testid="composed-chart">{children}</div>;
  },
  Line: () => <div data-testid="line" />,
  Area: () => <div data-testid="area" />,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ReferenceLine: () => null,
  ReferenceArea: () => null,
}));

describe('LineChartComponent — actuals/prognose grouping (#162)', () => {
  beforeEach(() => {
    capturedChartData = null;
  });

  it('collapses duplicate boundary-year rows into one entry', () => {
    // Mirrors the Amsterdam bevolking case: cbs_actuals through 2025 plus
    // ruimtemeesters_prognose starting 2025 — same year present twice.
    const data: DataPoint[] = [
      { geoCode: 'GM0363', geoName: 'Amsterdam', year: 2023, value: 918117, source: 'cbs_actuals' },
      { geoCode: 'GM0363', geoName: 'Amsterdam', year: 2024, value: 931298, source: 'cbs_actuals' },
      { geoCode: 'GM0363', geoName: 'Amsterdam', year: 2025, value: 966269.64, source: 'ruimtemeesters_prognose', confidenceLower: 946944.25, confidenceUpper: 985595.04 },
      { geoCode: 'GM0363', geoName: 'Amsterdam', year: 2025, value: 934526, source: 'cbs_actuals' },
      { geoCode: 'GM0363', geoName: 'Amsterdam', year: 2026, value: 985280.26, source: 'ruimtemeesters_prognose', confidenceLower: 965574.65, confidenceUpper: 1004985.87 },
    ];

    render(<LineChartComponent data={data} />);

    expect(capturedChartData).not.toBeNull();
    const rows = capturedChartData!;

    // 5 input rows → 4 chartData rows (2025 collapsed)
    expect(rows.length).toBe(4);

    // Each year appears exactly once
    const names = rows.map(r => r.name);
    expect(names).toEqual(['2023', '2024', '2025', '2026']);

    // Boundary year: cbs_actuals wins for `actuals`; prognose value is set via
    // the bridge so the prognose line is anchored at the handoff.
    const row2025 = rows.find(r => r.name === '2025')!;
    expect(row2025.actuals).toBe(934526);
    expect(row2025.prognose).toBe(934526); // bridge → equals actuals, not 966269.64
    expect(row2025.confidenceBand).toEqual([946944.25, 985595.04]);
  });

  it('handles boundary year where prognose row arrives before the actual row', () => {
    // Ordering of overlapping rows from the API isn't guaranteed; we must
    // produce the same chartData regardless of input order.
    const data: DataPoint[] = [
      { geoCode: 'GM0363', geoName: 'Amsterdam', year: 2024, value: 931298, source: 'cbs_actuals' },
      { geoCode: 'GM0363', geoName: 'Amsterdam', year: 2025, value: 934526, source: 'cbs_actuals' },
      { geoCode: 'GM0363', geoName: 'Amsterdam', year: 2025, value: 966269.64, source: 'ruimtemeesters_prognose', confidenceLower: 946944.25, confidenceUpper: 985595.04 },
      { geoCode: 'GM0363', geoName: 'Amsterdam', year: 2026, value: 985280.26, source: 'ruimtemeesters_prognose' },
    ];

    render(<LineChartComponent data={data} />);
    const row2025 = capturedChartData!.find(r => r.name === '2025')!;
    expect(row2025.actuals).toBe(934526);
    expect(row2025.prognose).toBe(934526);
    expect(row2025.confidenceBand).toEqual([946944.25, 985595.04]);
  });

  it('preserves bridge continuity when there is no overlap row', () => {
    // Common case: prognose starts the year after the last actual.
    const data: DataPoint[] = [
      { geoCode: 'GM0363', geoName: 'Amsterdam', year: 2024, value: 931298, source: 'cbs_actuals' },
      { geoCode: 'GM0363', geoName: 'Amsterdam', year: 2025, value: 950000, source: 'ruimtemeesters_prognose' },
    ];
    render(<LineChartComponent data={data} />);
    const rows = capturedChartData!;
    expect(rows.length).toBe(2);
    const row2024 = rows.find(r => r.name === '2024')!;
    // Last actual year carries the prognose value too (bridge) so the
    // prognose line starts visibly from the same point.
    expect(row2024.actuals).toBe(931298);
    expect(row2024.prognose).toBe(931298);
  });

  it('renders without grouping when there is no prognose', () => {
    const data: DataPoint[] = [
      { geoCode: 'NL', geoName: 'Nederland', year: 2022, value: 17500000, source: 'cbs_actuals' },
      { geoCode: 'NL', geoName: 'Nederland', year: 2023, value: 17600000, source: 'cbs_actuals' },
      { geoCode: 'NL', geoName: 'Nederland', year: 2024, value: 17700000, source: 'cbs_actuals' },
    ];
    render(<LineChartComponent data={data} />);
    expect(capturedChartData!.length).toBe(3);
    expect(capturedChartData!.every(r => r.actuals !== undefined)).toBe(true);
    expect(capturedChartData!.every(r => r.prognose === undefined)).toBe(true);
  });
});
