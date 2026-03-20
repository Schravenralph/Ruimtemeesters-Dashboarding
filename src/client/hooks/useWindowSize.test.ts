import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWindowSize } from './useWindowSize';

describe('useWindowSize', () => {
  it('returns initial window size', () => {
    const { result } = renderHook(() => useWindowSize());
    expect(result.current.width).toBeGreaterThan(0);
    expect(result.current.height).toBeGreaterThan(0);
  });

  it('classifies as desktop by default in tests', () => {
    // jsdom has a default viewport of 1024x768
    const { result } = renderHook(() => useWindowSize());
    expect(result.current.isDesktop).toBe(true);
  });

  it('responds to resize events', () => {
    const { result } = renderHook(() => useWindowSize());

    act(() => {
      // Simulate resize
      Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current.width).toBe(500);
    expect(result.current.isMobile).toBe(true);
    expect(result.current.isDesktop).toBe(false);
  });
});
