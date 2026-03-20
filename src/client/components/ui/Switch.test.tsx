import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Switch } from './Switch';

describe('Switch', () => {
  it('renders unchecked', () => {
    render(<Switch checked={false} onChange={() => {}} />);
    const toggle = screen.getByRole('switch');
    expect(toggle.getAttribute('aria-checked')).toBe('false');
  });

  it('renders checked', () => {
    render(<Switch checked={true} onChange={() => {}} />);
    const toggle = screen.getByRole('switch');
    expect(toggle.getAttribute('aria-checked')).toBe('true');
  });

  it('calls onChange on click', () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('toggles off when checked', () => {
    const onChange = vi.fn();
    render(<Switch checked={true} onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('renders label', () => {
    render(<Switch checked={false} onChange={() => {}} label="Dark mode" />);
    expect(screen.getByText('Dark mode')).toBeDefined();
  });

  it('is disabled when disabled prop set', () => {
    render(<Switch checked={false} onChange={() => {}} disabled />);
    expect(screen.getByRole('switch')).toHaveProperty('disabled', true);
  });
});
