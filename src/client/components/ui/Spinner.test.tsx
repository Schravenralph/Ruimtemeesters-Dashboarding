import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner, LoadingOverlay } from './Spinner';

describe('Spinner', () => {
  it('renders', () => {
    const { container } = render(<Spinner />);
    expect(container.firstElementChild).toBeDefined();
  });

  it('applies size class', () => {
    const { container } = render(<Spinner size="lg" />);
    expect(container.firstElementChild?.className).toContain('h-8');
  });

  it('applies small size', () => {
    const { container } = render(<Spinner size="sm" />);
    expect(container.firstElementChild?.className).toContain('h-4');
  });
});

describe('LoadingOverlay', () => {
  it('renders without message', () => {
    const { container } = render(<LoadingOverlay />);
    expect(container.firstElementChild).toBeDefined();
  });

  it('renders with message', () => {
    render(<LoadingOverlay message="Loading data..." />);
    expect(screen.getByText('Loading data...')).toBeDefined();
  });
});
