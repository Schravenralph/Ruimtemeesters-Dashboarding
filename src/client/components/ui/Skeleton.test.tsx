import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton, SkeletonCard, SkeletonTileGrid, SkeletonTable } from './Skeleton';

describe('Skeleton components', () => {
  it('Skeleton renders with className', () => {
    const { container } = render(<Skeleton className="h-10 w-40" />);
    expect(container.firstElementChild?.className).toContain('animate-pulse');
    expect(container.firstElementChild?.className).toContain('h-10');
  });

  it('SkeletonCard renders', () => {
    const { container } = render(<SkeletonCard />);
    expect(container.firstElementChild).toBeDefined();
    expect(container.innerHTML).toContain('animate-pulse');
  });

  it('SkeletonTileGrid renders 4 cards', () => {
    const { container } = render(<SkeletonTileGrid />);
    const cards = container.querySelectorAll('.col-span-6');
    expect(cards.length).toBe(4);
  });

  it('SkeletonTable renders with default rows', () => {
    const { container } = render(<SkeletonTable />);
    expect(container.firstElementChild).toBeDefined();
  });

  it('SkeletonTable renders custom row count', () => {
    const { container } = render(<SkeletonTable rows={3} cols={2} />);
    expect(container.firstElementChild).toBeDefined();
  });
});
