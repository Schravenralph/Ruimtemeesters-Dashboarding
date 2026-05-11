import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NumberDisplay } from './NumberDisplay';

describe('NumberDisplay', () => {
  it('renders the headline value and label', () => {
    render(<NumberDisplay value={882000} label="Bevolking" />);
    expect(screen.getByText('Bevolking')).toBeDefined();
    expect(screen.getByText(/882/)).toBeDefined();
  });

  it('omits delta chips when no references provided', () => {
    render(<NumberDisplay value={100} label="Test" />);
    expect(screen.queryByText(/vs cohort/)).toBeNull();
    expect(screen.queryByText(/vs landelijk/)).toBeNull();
  });

  it('renders vs-cohort + vs-landelijk chips when references provided (SPEC-B)', () => {
    render(
      <NumberDisplay
        value={100}
        label="Test"
        references={[
          { kind: 'cohort', label: 'Cohort: G4', series: [{ year: 2024, value: 80 }] },
          { kind: 'land', label: 'Nederland', series: [{ year: 2024, value: 90 }] },
        ]}
      />,
    );
    expect(screen.getByText(/vs cohort/)).toBeDefined();
    expect(screen.getByText(/vs landelijk/)).toBeDefined();
    // 100 vs 80 = +25%
    expect(screen.getByText(/\+25\.0%/)).toBeDefined();
    // 100 vs 90 = +11.1%
    expect(screen.getByText(/\+11\.1%/)).toBeDefined();
  });

  it('uses higher-is-bad direction for woningtekort-style metrics', () => {
    const { container } = render(
      <NumberDisplay
        value={100}
        label="Woningtekort"
        deltaDirection="higher-is-bad"
        references={[
          { kind: 'cohort', label: 'Cohort', series: [{ year: 2024, value: 80 }] },
        ]}
      />,
    );
    // 100 vs 80 = +25%, direction higher-is-bad → positive delta should be RED
    const cohortChip = container.querySelector('.text-rose-600');
    expect(cohortChip).not.toBeNull();
  });

  it('omits chip when reference series has no points', () => {
    render(
      <NumberDisplay
        value={100}
        label="Test"
        references={[{ kind: 'cohort', label: 'Cohort', series: [] }]}
      />,
    );
    expect(screen.queryByText(/vs cohort/)).toBeNull();
  });
});
