import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  PresentationProvider,
  usePresentations,
  routePathForPresentation,
} from './PresentationContext';
import type { ReactNode } from 'react';

function wrapper({ children }: { children: ReactNode }) {
  return <PresentationProvider>{children}</PresentationProvider>;
}

describe('PresentationContext', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('starts empty — tabs are created on first navigation', () => {
    const { result } = renderHook(() => usePresentations(), { wrapper });
    expect(result.current.presentations).toHaveLength(0);
    expect(result.current.activeId).toBeNull();
    expect(result.current.activePresentation).toBeNull();
  });

  it('adds a presentation for a theme and makes it active', () => {
    const { result } = renderHook(() => usePresentations(), { wrapper });
    act(() => { result.current.addPresentation({ themeSlug: 'bevolking', title: 'Bevolking' }); });
    expect(result.current.presentations).toHaveLength(1);
    expect(result.current.activePresentation?.themeSlug).toBe('bevolking');
  });

  it('removes a presentation and falls back to the rightmost remaining tab', () => {
    const { result } = renderHook(() => usePresentations(), { wrapper });
    let firstId: string; let secondId: string;
    act(() => { firstId = result.current.addPresentation({ themeSlug: 'wonen' }); });
    act(() => { secondId = result.current.addPresentation({ themeSlug: 'huishoudens' }); });
    expect(result.current.activeId).toBe(secondId!);
    act(() => { result.current.removePresentation(secondId!); });
    expect(result.current.presentations).toHaveLength(1);
    expect(result.current.activeId).toBe(firstId!);
  });

  it('clears activeId when the only remaining tab is closed', () => {
    const { result } = renderHook(() => usePresentations(), { wrapper });
    let onlyId: string;
    act(() => { onlyId = result.current.addPresentation({ themeSlug: 'wonen' }); });
    act(() => { result.current.removePresentation(onlyId!); });
    expect(result.current.presentations).toHaveLength(0);
    expect(result.current.activeId).toBeNull();
  });

  it('switches active presentation', () => {
    const { result } = renderHook(() => usePresentations(), { wrapper });
    let firstId: string; let secondId: string;
    act(() => { firstId = result.current.addPresentation({ themeSlug: 'wonen' }); });
    act(() => { secondId = result.current.addPresentation({ themeSlug: 'huishoudens' }); });
    act(() => { result.current.setActive(firstId!); });
    expect(result.current.activeId).toBe(firstId!);
    expect(result.current.activePresentation?.themeSlug).toBe('wonen');
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
    let id: string;
    act(() => { id = result.current.addPresentation({ themeSlug: 'wonen' }); });
    act(() => { result.current.updatePresentation(id!, { title: 'Updated' }); });
    expect(result.current.presentations[0].title).toBe('Updated');
  });

  it('persists to sessionStorage', () => {
    const { result } = renderHook(() => usePresentations(), { wrapper });
    act(() => { result.current.addPresentation({ themeSlug: 'woningen' }); });
    const stored = sessionStorage.getItem('ruimtemeesters_presentations');
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!).presentations).toHaveLength(1);
  });

  it('restores from sessionStorage', () => {
    const state = {
      presentations: [
        {
          id: 'restored-1', title: 'Restored', themeSlug: 'bevolking', projectSlug: null,
          filters: { geoLevel: 'land', geoCode: 'NL', period: { year: 2024, compareYear: null }, dimensions: {}, comparisonEnabled: false, comparisonLevel: null, comparisonGeoCode: null },
          chartType: 'table', transformation: 'none',
        },
      ],
      activeId: 'restored-1',
    };
    sessionStorage.setItem('ruimtemeesters_presentations', JSON.stringify(state));
    const { result } = renderHook(() => usePresentations(), { wrapper });
    expect(result.current.presentations).toHaveLength(1);
    expect(result.current.presentations[0].title).toBe('Restored');
  });

  it('drops legacy inert tabs (empty themeSlug) on restore', () => {
    const state = {
      presentations: [
        { id: 'legacy-blank', title: 'Dashboard', themeSlug: '', filters: {}, chartType: 'table', transformation: 'none' },
        { id: 'restored-1', title: 'Bevolking', themeSlug: 'bevolking', projectSlug: null, filters: {}, chartType: 'table', transformation: 'none' },
      ],
      activeId: 'legacy-blank',
    };
    sessionStorage.setItem('ruimtemeesters_presentations', JSON.stringify(state));
    const { result } = renderHook(() => usePresentations(), { wrapper });
    expect(result.current.presentations).toHaveLength(1);
    expect(result.current.presentations[0].themeSlug).toBe('bevolking');
    // activeId pointed at the dropped blank tab — should fall back to the surviving tab.
    expect(result.current.activeId).toBe('restored-1');
  });

  it('falls back to empty on corrupt sessionStorage', () => {
    sessionStorage.setItem('ruimtemeesters_presentations', 'not json');
    const { result } = renderHook(() => usePresentations(), { wrapper });
    expect(result.current.presentations).toHaveLength(0);
    expect(result.current.activeId).toBeNull();
  });

  it('addPresentation is idempotent on themeSlug+projectSlug (StrictMode safe)', () => {
    // React 18 StrictMode double-invokes effects in dev. Without dedup this
    // would create two identical tabs. Calling addPresentation twice with
    // the same scope returns the same id and leaves one tab.
    const { result } = renderHook(() => usePresentations(), { wrapper });
    let firstId: string; let secondId: string;
    act(() => { firstId = result.current.addPresentation({ themeSlug: 'wonen' }); });
    act(() => { secondId = result.current.addPresentation({ themeSlug: 'wonen' }); });
    expect(result.current.presentations).toHaveLength(1);
    expect(secondId!).toBe(firstId!);
    expect(result.current.activeId).toBe(firstId!);
  });

  it('addPresentation dedup respects projectSlug — same theme across projects = separate tabs', () => {
    const { result } = renderHook(() => usePresentations(), { wrapper });
    act(() => { result.current.addPresentation({ themeSlug: 'wonen' }); });
    act(() => { result.current.addPresentation({ themeSlug: 'wonen', projectSlug: 'eindhoven' }); });
    act(() => { result.current.addPresentation({ themeSlug: 'wonen', projectSlug: 'almere' }); });
    expect(result.current.presentations).toHaveLength(3);
  });
});

describe('routePathForPresentation', () => {
  it('builds /dashboard/:slug for theme-scoped tabs', () => {
    expect(routePathForPresentation({ themeSlug: 'wonen', projectSlug: null })).toBe('/dashboard/wonen');
  });
  it('builds /p/:project/:slug for project-scoped tabs', () => {
    expect(routePathForPresentation({ themeSlug: 'wonen', projectSlug: 'eindhoven' })).toBe('/p/eindhoven/wonen');
  });
  it('treats undefined projectSlug as theme-scoped', () => {
    expect(routePathForPresentation({ themeSlug: 'wonen' })).toBe('/dashboard/wonen');
  });
  it('returns /dashboard when themeSlug is empty (defensive)', () => {
    expect(routePathForPresentation({ themeSlug: '', projectSlug: null })).toBe('/dashboard');
  });
});
