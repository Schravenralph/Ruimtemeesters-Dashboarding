import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';
import { Button } from './Button';

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No data" />);
    expect(screen.getByText('No data')).toBeDefined();
  });

  it('renders description', () => {
    render(<EmptyState title="Empty" description="Nothing to show here" />);
    expect(screen.getByText('Nothing to show here')).toBeDefined();
  });

  it('renders action button', () => {
    render(
      <EmptyState
        title="Empty"
        action={<Button>Add item</Button>}
      />,
    );
    expect(screen.getByText('Add item')).toBeDefined();
  });

  it('renders without description', () => {
    const { container } = render(<EmptyState title="Just title" />);
    expect(container.firstElementChild).toBeDefined();
  });
});
