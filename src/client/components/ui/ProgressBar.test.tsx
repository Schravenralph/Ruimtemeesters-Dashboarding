import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('renders with value', () => {
    render(<ProgressBar value={50} />);
    expect(screen.getByText('50%')).toBeDefined();
  });

  it('renders with label', () => {
    render(<ProgressBar value={75} label="Progress" />);
    expect(screen.getByText('Progress')).toBeDefined();
    expect(screen.getByText('75%')).toBeDefined();
  });

  it('clamps value to 0-100', () => {
    render(<ProgressBar value={150} />);
    expect(screen.getByText('100%')).toBeDefined();
  });

  it('hides percentage when showPercent is false', () => {
    render(<ProgressBar value={50} showPercent={false} />);
    expect(screen.queryByText('50%')).toBeNull();
  });

  it('renders without label', () => {
    const { container } = render(<ProgressBar value={25} />);
    expect(container.firstElementChild).toBeDefined();
  });
});
