import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Divider } from './Divider';

describe('Divider', () => {
  it('renders simple divider', () => {
    const { container } = render(<Divider />);
    expect(container.querySelector('hr')).toBeDefined();
  });

  it('renders divider with text', () => {
    render(<Divider text="OR" />);
    expect(screen.getByText('OR')).toBeDefined();
  });

  it('applies custom className', () => {
    const { container } = render(<Divider className="my-8" />);
    expect(container.firstElementChild?.className).toContain('my-8');
  });
});
