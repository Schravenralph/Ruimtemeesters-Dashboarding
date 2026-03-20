import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchInput } from './SearchInput';

describe('SearchInput', () => {
  it('renders with placeholder', () => {
    render(<SearchInput placeholder="Zoek..." onChange={() => {}} />);
    expect(screen.getByPlaceholderText('Zoek...')).toBeDefined();
  });

  it('shows clear button when value is set', () => {
    const onClear = vi.fn();
    render(<SearchInput value="test" onClear={onClear} onChange={() => {}} />);

    // Should have clear button
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('calls onChange on input', () => {
    const onChange = vi.fn();
    render(<SearchInput onChange={onChange} />);

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'Amsterdam' } });
    expect(onChange).toHaveBeenCalled();
  });
});
