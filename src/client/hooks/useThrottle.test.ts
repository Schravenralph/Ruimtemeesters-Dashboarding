import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useThrottle } from './useThrottle';

describe('useThrottle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useThrottle('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('throttles value updates', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useThrottle(value, 300),
      { initialProps: { value: 'a' } },
    );

    // Rapid updates
    rerender({ value: 'b' });
    rerender({ value: 'c' });
    rerender({ value: 'd' });

    // Should not have updated yet (within throttle window)
    // After throttle period, should show latest
    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe('d');
  });

  it('updates after throttle period elapses', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useThrottle(value, 100),
      { initialProps: { value: 'initial' } },
    );

    rerender({ value: 'updated' });

    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe('updated');
  });
});
