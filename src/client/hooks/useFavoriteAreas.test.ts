import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFavoriteAreas } from './useFavoriteAreas';

describe('useFavoriteAreas', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with empty favorites', () => {
    const { result } = renderHook(() => useFavoriteAreas());
    expect(result.current.favorites).toHaveLength(0);
  });

  it('adds a favorite', () => {
    const { result } = renderHook(() => useFavoriteAreas());

    act(() => {
      result.current.addFavorite({ code: 'GM0363', name: 'Amsterdam', level: 'gemeente' });
    });

    expect(result.current.favorites).toHaveLength(1);
    expect(result.current.favorites[0].code).toBe('GM0363');
  });

  it('does not add duplicates', () => {
    const { result } = renderHook(() => useFavoriteAreas());

    act(() => {
      result.current.addFavorite({ code: 'GM0363', name: 'Amsterdam', level: 'gemeente' });
      result.current.addFavorite({ code: 'GM0363', name: 'Amsterdam', level: 'gemeente' });
    });

    expect(result.current.favorites).toHaveLength(1);
  });

  it('removes a favorite', () => {
    const { result } = renderHook(() => useFavoriteAreas());

    act(() => {
      result.current.addFavorite({ code: 'GM0363', name: 'Amsterdam', level: 'gemeente' });
      result.current.addFavorite({ code: 'GM0599', name: 'Rotterdam', level: 'gemeente' });
    });

    act(() => {
      result.current.removeFavorite('GM0363');
    });

    expect(result.current.favorites).toHaveLength(1);
    expect(result.current.favorites[0].code).toBe('GM0599');
  });

  it('checks if area is favorite', () => {
    const { result } = renderHook(() => useFavoriteAreas());

    act(() => {
      result.current.addFavorite({ code: 'GM0363', name: 'Amsterdam', level: 'gemeente' });
    });

    expect(result.current.isFavorite('GM0363')).toBe(true);
    expect(result.current.isFavorite('GM0599')).toBe(false);
  });

  it('toggles favorite', () => {
    const { result } = renderHook(() => useFavoriteAreas());
    const area = { code: 'GM0363', name: 'Amsterdam', level: 'gemeente' };

    act(() => {
      result.current.toggleFavorite(area);
    });
    expect(result.current.isFavorite('GM0363')).toBe(true);

    act(() => {
      result.current.toggleFavorite(area);
    });
    expect(result.current.isFavorite('GM0363')).toBe(false);
  });
});
