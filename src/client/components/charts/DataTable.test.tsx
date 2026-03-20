import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTableComponent } from './DataTable';
import type { DataPoint } from '@shared/api/contracts';

describe('DataTableComponent', () => {
  const testData: DataPoint[] = [
    { geoCode: 'GM0363', geoName: 'Amsterdam', year: 2024, value: 900000 },
    { geoCode: 'GM0599', geoName: 'Rotterdam', year: 2024, value: 650000 },
    { geoCode: 'GM0518', geoName: "'s-Gravenhage", year: 2024, value: 550000 },
  ];

  const dimensionData: DataPoint[] = [
    { geoCode: 'GM0363', geoName: 'Amsterdam', year: 2024, dimensionValue: 'man', value: 441000 },
    { geoCode: 'GM0363', geoName: 'Amsterdam', year: 2024, dimensionValue: 'vrouw', value: 459000 },
  ];

  it('shows empty state when no data', () => {
    render(<DataTableComponent data={[]} />);
    expect(screen.getByText('Geen data beschikbaar')).toBeDefined();
  });

  it('renders table with data', () => {
    render(<DataTableComponent data={testData} />);
    expect(screen.getByText('Amsterdam')).toBeDefined();
    expect(screen.getByText('Rotterdam')).toBeDefined();
  });

  it('shows row count', () => {
    render(<DataTableComponent data={testData} />);
    expect(screen.getByText('3 rijen')).toBeDefined();
  });

  it('shows dimension column when data has dimensions', () => {
    render(<DataTableComponent data={dimensionData} />);
    expect(screen.getByText('Categorie')).toBeDefined();
  });

  it('has CSV download button', () => {
    render(<DataTableComponent data={testData} />);
    expect(screen.getByText('CSV downloaden')).toBeDefined();
  });
});
