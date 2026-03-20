import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CounterBadge } from './CounterBadge';

describe('CounterBadge', () => {
  it('renders count', () => {
    render(<CounterBadge count={5} />);
    expect(screen.getByText('5')).toBeDefined();
  });

  it('renders nothing for zero count', () => {
    const { container } = render(<CounterBadge count={0} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing for negative count', () => {
    const { container } = render(<CounterBadge count={-1} />);
    expect(container.innerHTML).toBe('');
  });

  it('caps at max value', () => {
    render(<CounterBadge count={150} max={99} />);
    expect(screen.getByText('99+')).toBeDefined();
  });

  it('shows exact count below max', () => {
    render(<CounterBadge count={50} max={99} />);
    expect(screen.getByText('50')).toBeDefined();
  });

  it('has aria-label', () => {
    render(<CounterBadge count={3} />);
    expect(screen.getByLabelText('3 items')).toBeDefined();
  });
});
