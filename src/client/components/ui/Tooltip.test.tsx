import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tooltip } from './Tooltip';

describe('Tooltip', () => {
  it('renders children', () => {
    render(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>,
    );
    expect(screen.getByText('Hover me')).toBeDefined();
  });

  it('shows tooltip on hover', () => {
    render(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>,
    );

    fireEvent.mouseEnter(screen.getByText('Hover me').closest('div')!);
    expect(screen.getByText('Tooltip text')).toBeDefined();
  });

  it('hides tooltip on mouse leave', () => {
    render(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>,
    );

    const wrapper = screen.getByText('Hover me').closest('div')!;
    fireEvent.mouseEnter(wrapper);
    expect(screen.getByText('Tooltip text')).toBeDefined();

    fireEvent.mouseLeave(wrapper);
    expect(screen.queryByText('Tooltip text')).toBeNull();
  });
});
