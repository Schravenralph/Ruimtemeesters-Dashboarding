import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRecentAreas } from './useRecentAreas';

describe('useRecentAreas', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with empty recents', () => {
    const { result } = renderHook(() => useRecentAreas());
    expect(result.current.recentAreas).toHaveLength(0);
  });

  it('adds a recent area', () => {
    const { result } = renderHook(() => useRecentAreas());
    act(() => result.current.addRecent({ code: 'GM0363', name: 'Amsterdam', level: 'gemeente' }));
    expect(result.current.recentAreas).toHaveLength(1);
    expect(result.current.recentAreas[0].code).toBe('GM0363');
  });

  it('moves existing area to top', () => {
    const { result } = renderHook(() => useRecentAreas());
    act(() => {
      result.current.addRecent({ code: 'GM0363', name: 'Amsterdam', level: 'gemeente' });
      result.current.addRecent({ code: 'GM0599', name: 'Rotterdam', level: 'gemeente' });
      result.current.addRecent({ code: 'GM0363', name: 'Amsterdam', level: 'gemeente' });
    });
    expect(result.current.recentAreas).toHaveLength(2);
    expect(result.current.recentAreas[0].code).toBe('GM0363');
  });

  it('limits to 10 items', () => {
    const { result } = renderHook(() => useRecentAreas());
    act(() => {
      for (let i = 0; i < 15; i++) {
        result.current.addRecent({ code: `GM${i.toString().padStart(4, '0')}`, name: `City ${i}`, level: 'gemeente' });
      }
    });
    expect(result.current.recentAreas).toHaveLength(10);
  });

  it('clears all recents', () => {
    const { result } = renderHook(() => useRecentAreas());
    act(() => {
      result.current.addRecent({ code: 'GM0363', name: 'Amsterdam', level: 'gemeente' });
      result.current.clearRecent();
    });
    expect(result.current.recentAreas).toHaveLength(0);
  });
});
