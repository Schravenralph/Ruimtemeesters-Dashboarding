import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeDefined();
  });

  it('applies default variant', () => {
    const { container } = render(<Badge>Default</Badge>);
    expect(container.firstElementChild?.className).toContain('bg-gray-100');
  });

  it('applies success variant', () => {
    const { container } = render(<Badge variant="success">Success</Badge>);
    expect(container.firstElementChild?.className).toContain('bg-green-100');
  });

  it('applies error variant', () => {
    const { container } = render(<Badge variant="error">Error</Badge>);
    expect(container.firstElementChild?.className).toContain('bg-red-100');
  });

  it('applies info variant', () => {
    const { container } = render(<Badge variant="info">Info</Badge>);
    expect(container.firstElementChild?.className).toContain('bg-blue-100');
  });

  it('applies sm size by default', () => {
    const { container } = render(<Badge>Small</Badge>);
    expect(container.firstElementChild?.className).toContain('text-xs');
  });

  it('applies md size', () => {
    const { container } = render(<Badge size="md">Medium</Badge>);
    expect(container.firstElementChild?.className).toContain('text-sm');
  });
});
