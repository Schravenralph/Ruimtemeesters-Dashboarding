import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { FilterProvider, useFilters } from './FilterContext';
import { PresentationProvider, usePresentations } from './PresentationContext';
import { useEffect as useReactEffect, type ReactNode } from 'react';

// FilterContext mutates the active presentation. Since PresentationProvider
// now starts with zero tabs (a real dashboard navigation is required to
// create one), the test wrapper seeds a single tab so filter setters have
// somewhere to write.
function SeedTab({ children }: { children: ReactNode }) {
  const { presentations, addPresentation } = usePresentations();
  useReactEffect(() => {
    if (presentations.length === 0) addPresentation({ themeSlug: 'test-theme', title: 'Test' });
  }, [presentations.length, addPresentation]);
  return <>{children}</>;
}

function wrapper({ children }: { children: ReactNode }) {
  return (
    <PresentationProvider>
      <SeedTab>
        <FilterProvider>{children}</FilterProvider>
      </SeedTab>
    </PresentationProvider>
  );
}

beforeEach(() => {
  sessionStorage.clear();
});

describe('FilterContext', () => {
  it('provides default filters', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });
    expect(result.current.filters.geoLevel).toBe('land');
    expect(result.current.filters.geoCode).toBe('NL');
    expect(result.current.filters.period.year).toBe(2024);
    expect(result.current.filters.comparisonEnabled).toBe(false);
  });

  it('sets geo level', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });
    act(() => result.current.setGeoLevel('gemeente'));
    expect(result.current.filters.geoLevel).toBe('gemeente');
  });

  it('sets geo code', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });
    act(() => result.current.setGeoCode('GM0363'));
    expect(result.current.filters.geoCode).toBe('GM0363');
  });

  it('sets year', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });
    act(() => result.current.setYear(2025));
    expect(result.current.filters.period.year).toBe(2025);
  });

  it('sets compare year', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });
    act(() => result.current.setCompareYear(2020));
    expect(result.current.filters.period.compareYear).toBe(2020);
    expect(result.current.filters.comparisonEnabled).toBe(true);
  });

  it('enables comparison mode', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });
    act(() => result.current.setComparisonEnabled(true));
    expect(result.current.filters.comparisonEnabled).toBe(true);
  });

  it('disables comparison and clears compare year', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });
    act(() => {
      result.current.setCompareYear(2020);
      result.current.setComparisonEnabled(false);
    });
    expect(result.current.filters.comparisonEnabled).toBe(false);
    expect(result.current.filters.period.compareYear).toBeNull();
  });

  it('sets dimension filter', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });
    act(() => result.current.setDimension('age_group', '25-44'));
    expect(result.current.filters.dimensions.age_group).toBe('25-44');
  });

  it('resets all filters', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });
    act(() => {
      result.current.setGeoCode('GM0363');
      result.current.setYear(2025);
      result.current.setCompareYear(2020);
      result.current.resetFilters();
    });
    expect(result.current.filters.geoCode).toBe('NL');
    expect(result.current.filters.period.year).toBe(2024);
    expect(result.current.filters.comparisonEnabled).toBe(false);
  });
});
