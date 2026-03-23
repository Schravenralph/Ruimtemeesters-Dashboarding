import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { PresentationProvider, usePresentations } from './PresentationContext';
import type { ReactNode } from 'react';

function wrapper({ children }: { children: ReactNode }) {
  return <PresentationProvider>{children}</PresentationProvider>;
}

describe('PresentationContext', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('starts with one default presentation', () => {
    const { result } = renderHook(() => usePresentations(), { wrapper });
    expect(result.current.presentations).toHaveLength(1);
    expect(result.current.activeId).toBeTruthy();
    expect(result.current.activePresentation).not.toBeNull();
  });

  it('adds a new presentation', () => {
    const { result } = renderHook(() => usePresentations(), { wrapper });
    act(() => {
      result.current.addPresentation({ themeSlug: 'bevolking' });
    });
    expect(result.current.presentations).toHaveLength(2);
  });

  it('removes a presentation', () => {
    const { result } = renderHook(() => usePresentations(), { wrapper });
    let secondId: string;
    act(() => {
      secondId = result.current.addPresentation({ themeSlug: 'bevolking' });
    });
    act(() => {
      result.current.removePresentation(secondId!);
    });
    expect(result.current.presentations).toHaveLength(1);
  });

  it('cannot remove the last presentation', () => {
    const { result } = renderHook(() => usePresentations(), { wrapper });
    const onlyId = result.current.presentations[0].id;
    act(() => {
      result.current.removePresentation(onlyId);
    });
    expect(result.current.presentations).toHaveLength(1);
  });

  it('switches active presentation', () => {
    const { result } = renderHook(() => usePresentations(), { wrapper });
    let secondId: string;
    act(() => {
      secondId = result.current.addPresentation({ themeSlug: 'huishoudens' });
    });
    act(() => {
      result.current.setActive(secondId!);
    });
    expect(result.current.activeId).toBe(secondId!);
    expect(result.current.activePresentation?.themeSlug).toBe('huishoudens');
  });

  it('enforces max 10 presentations', () => {
    const { result } = renderHook(() => usePresentations(), { wrapper });
    act(() => {
      for (let i = 0; i < 12; i++) {
        result.current.addPresentation({ themeSlug: `theme-${i}` });
      }
    });
    expect(result.current.presentations.length).toBeLessThanOrEqual(10);
  });

  it('updates a presentation', () => {
    const { result } = renderHook(() => usePresentations(), { wrapper });
    const id = result.current.presentations[0].id;
    act(() => {
      result.current.updatePresentation(id, { title: 'Updated Title' });
    });
    expect(result.current.presentations[0].title).toBe('Updated Title');
  });

  it('persists to sessionStorage', () => {
    const { result } = renderHook(() => usePresentations(), { wrapper });
    act(() => {
      result.current.addPresentation({ themeSlug: 'woningen' });
    });
    const stored = sessionStorage.getItem('ruimtemeesters_presentations');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.presentations).toHaveLength(2);
  });

  it('restores from sessionStorage', () => {
    const state = {
      presentations: [
        { id: 'restored-1', title: 'Restored', themeSlug: 'bevolking', filters: { geoLevel: 'land', geoCode: 'NL', period: { year: 2024, compareYear: null }, dimensions: {}, comparisonEnabled: false, comparisonLevel: null, comparisonGeoCode: null }, chartType: 'table', transformation: 'none' },
      ],
      activeId: 'restored-1',
    };
    sessionStorage.setItem('ruimtemeesters_presentations', JSON.stringify(state));

    const { result } = renderHook(() => usePresentations(), { wrapper });
    expect(result.current.presentations).toHaveLength(1);
    expect(result.current.presentations[0].title).toBe('Restored');
  });

  it('falls back to default on corrupt sessionStorage', () => {
    sessionStorage.setItem('ruimtemeesters_presentations', 'not json');
    const { result } = renderHook(() => usePresentations(), { wrapper });
    expect(result.current.presentations).toHaveLength(1);
    expect(result.current.activePresentation).not.toBeNull();
  });
});
