import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar } from './Avatar';

describe('Avatar', () => {
  it('renders initials from name', () => {
    render(<Avatar name="Jan de Vries" />);
    expect(screen.getByText('JD')).toBeDefined();
  });

  it('handles single name', () => {
    render(<Avatar name="Admin" />);
    expect(screen.getByText('A')).toBeDefined();
  });

  it('limits to 2 initials', () => {
    render(<Avatar name="Jan Peter van der Berg" />);
    expect(screen.getByText('JP')).toBeDefined();
  });

  it('applies size classes', () => {
    const { container } = render(<Avatar name="Test" size="lg" />);
    expect(container.firstElementChild?.className).toContain('h-10');
  });

  it('has aria-label', () => {
    render(<Avatar name="Test User" />);
    expect(screen.getByLabelText('Test User')).toBeDefined();
  });

  it('assigns consistent colors for same name', () => {
    const { container: c1 } = render(<Avatar name="Test" />);
    const { container: c2 } = render(<Avatar name="Test" />);
    expect(c1.firstElementChild?.className).toBe(c2.firstElementChild?.className);
  });
});
