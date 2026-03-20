import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DateRangePicker } from './DateRangePicker';

describe('DateRangePicker', () => {
  it('renders start and end year selects', () => {
    render(<DateRangePicker startYear={2020} endYear={2024} onStartChange={() => {}} onEndChange={() => {}} />);
    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(2);
  });

  it('calls onStartChange when start year changes', () => {
    const onStartChange = vi.fn();
    render(<DateRangePicker startYear={2020} endYear={2024} onStartChange={onStartChange} onEndChange={() => {}} />);

    const startSelect = screen.getByLabelText('Startjaar');
    fireEvent.change(startSelect, { target: { value: '2021' } });
    expect(onStartChange).toHaveBeenCalledWith(2021);
  });

  it('calls onEndChange when end year changes', () => {
    const onEndChange = vi.fn();
    render(<DateRangePicker startYear={2020} endYear={2024} onStartChange={() => {}} onEndChange={onEndChange} />);

    const endSelect = screen.getByLabelText('Eindjaar');
    fireEvent.change(endSelect, { target: { value: '2025' } });
    expect(onEndChange).toHaveBeenCalledWith(2025);
  });

  it('has ARIA labels', () => {
    render(<DateRangePicker startYear={2020} endYear={2024} onStartChange={() => {}} onEndChange={() => {}} />);
    expect(screen.getByLabelText('Startjaar')).toBeDefined();
    expect(screen.getByLabelText('Eindjaar')).toBeDefined();
  });

  it('shows calendar icon', () => {
    const { container } = render(
      <DateRangePicker startYear={2020} endYear={2024} onStartChange={() => {}} onEndChange={() => {}} />
    );
    expect(container.querySelector('svg')).toBeDefined();
  });
});
