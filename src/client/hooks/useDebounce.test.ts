import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('debounces value changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'hello' } },
    );

    rerender({ value: 'world' });
    expect(result.current).toBe('hello'); // Still old value

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('world'); // Updated after delay
  });

  it('resets timer on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } },
    );

    rerender({ value: 'b' });
    act(() => vi.advanceTimersByTime(100));

    rerender({ value: 'c' });
    act(() => vi.advanceTimersByTime(100));

    rerender({ value: 'd' });
    act(() => vi.advanceTimersByTime(100));

    expect(result.current).toBe('a'); // Not yet updated

    act(() => vi.advanceTimersByTime(200));

    expect(result.current).toBe('d'); // Final value
  });
});
