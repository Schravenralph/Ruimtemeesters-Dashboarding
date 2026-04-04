import { createContext, useContext, useCallback, type ReactNode } from 'react';
import type { FilterState, GeoLevel } from '@shared/api/contracts';
import { usePresentations } from './PresentationContext';

interface FilterContextValue {
  filters: FilterState;
  setGeoLevel: (level: GeoLevel) => void;
  setGeoCode: (code: string) => void;
  setYear: (year: number) => void;
  setCompareYear: (year: number | null) => void;
  setComparisonEnabled: (enabled: boolean) => void;
  setDimension: (key: string, value: string) => void;
  setComparisonLevel: (level: GeoLevel | null) => void;
  setComparisonGeoCode: (code: string | null) => void;
  setShowPrognose: (show: boolean) => void;
  setComparedDimensionValues: (values: string[], dimension?: string) => void;
  resetFilters: () => void;
}

const defaultFilters: FilterState = {
  geoLevel: 'land',
  geoCode: 'NL',
  period: { year: 2024, compareYear: null },
  dimensions: {},
  comparisonEnabled: false,
  comparisonLevel: null,
  comparisonGeoCode: null,
  showPrognose: true,
  comparedDimension: null,
  comparedDimensionValues: [],
};

const FilterContext = createContext<FilterContextValue | null>(null);

/**
 * FilterProvider — pass-through to PresentationContext.
 *
 * Reads from and writes to the active presentation's filters.
 * All existing components that call useFilters() continue to work
 * without any changes — they just transparently operate on the
 * active tab's filter state.
 */
export function FilterProvider({ children }: { children: ReactNode }) {
  const { activePresentation, activeId, updatePresentation } = usePresentations();

  const filters = activePresentation?.filters ?? defaultFilters;

  const updateFilters = useCallback((updater: (prev: FilterState) => FilterState) => {
    if (!activeId || !activePresentation) return;
    const newFilters = updater(activePresentation.filters);
    updatePresentation(activeId, { filters: newFilters });
  }, [activeId, activePresentation, updatePresentation]);

  const setGeoLevel = useCallback((level: GeoLevel) => {
    updateFilters(prev => ({ ...prev, geoLevel: level }));
  }, [updateFilters]);

  const setGeoCode = useCallback((code: string) => {
    updateFilters(prev => ({ ...prev, geoCode: code }));
  }, [updateFilters]);

  const setYear = useCallback((year: number) => {
    updateFilters(prev => ({ ...prev, period: { ...prev.period, year } }));
  }, [updateFilters]);

  const setCompareYear = useCallback((compareYear: number | null) => {
    updateFilters(prev => ({
      ...prev,
      period: { ...prev.period, compareYear },
      comparisonEnabled: compareYear !== null,
    }));
  }, [updateFilters]);

  const setComparisonEnabled = useCallback((enabled: boolean) => {
    updateFilters(prev => ({
      ...prev,
      comparisonEnabled: enabled,
      period: enabled ? prev.period : { ...prev.period, compareYear: null },
    }));
  }, [updateFilters]);

  const setDimension = useCallback((key: string, value: string) => {
    updateFilters(prev => ({
      ...prev,
      dimensions: { ...prev.dimensions, [key]: value },
    }));
  }, [updateFilters]);

  const setComparisonLevel = useCallback((level: GeoLevel | null) => {
    updateFilters(prev => ({
      ...prev,
      comparisonLevel: level,
      comparisonGeoCode: level === 'land' ? 'NL' : prev.comparisonGeoCode,
    }));
  }, [updateFilters]);

  const setComparisonGeoCode = useCallback((code: string | null) => {
    updateFilters(prev => ({ ...prev, comparisonGeoCode: code }));
  }, [updateFilters]);

  const setShowPrognose = useCallback((show: boolean) => {
    updateFilters(prev => ({ ...prev, showPrognose: show }));
  }, [updateFilters]);

  const setComparedDimensionValues = useCallback((values: string[], dimension?: string) => {
    updateFilters(prev => ({
      ...prev,
      comparedDimensionValues: values,
      comparedDimension: dimension ?? prev.comparedDimension,
    }));
  }, [updateFilters]);

  const resetFilters = useCallback(() => {
    if (!activeId) return;
    updatePresentation(activeId, { filters: { ...defaultFilters } });
  }, [activeId, updatePresentation]);

  return (
    <FilterContext.Provider value={{
      filters,
      setGeoLevel,
      setGeoCode,
      setYear,
      setCompareYear,
      setComparisonEnabled,
      setDimension,
      setComparisonLevel,
      setComparisonGeoCode,
      setShowPrognose,
      setComparedDimensionValues,
      resetFilters,
    }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) throw new Error('useFilters must be used within FilterProvider');
  return context;
}
