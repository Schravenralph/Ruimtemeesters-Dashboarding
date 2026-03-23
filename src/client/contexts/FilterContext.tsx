import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { FilterState, GeoLevel } from '@shared/api/contracts';

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
};

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const setGeoLevel = useCallback((level: GeoLevel) => {
    setFilters(prev => ({ ...prev, geoLevel: level }));
  }, []);

  const setGeoCode = useCallback((code: string) => {
    setFilters(prev => ({ ...prev, geoCode: code }));
  }, []);

  const setYear = useCallback((year: number) => {
    setFilters(prev => ({ ...prev, period: { ...prev.period, year } }));
  }, []);

  const setCompareYear = useCallback((compareYear: number | null) => {
    setFilters(prev => ({
      ...prev,
      period: { ...prev.period, compareYear },
      comparisonEnabled: compareYear !== null,
    }));
  }, []);

  const setComparisonEnabled = useCallback((enabled: boolean) => {
    setFilters(prev => ({
      ...prev,
      comparisonEnabled: enabled,
      period: enabled ? prev.period : { ...prev.period, compareYear: null },
    }));
  }, []);

  const setDimension = useCallback((key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      dimensions: { ...prev.dimensions, [key]: value },
    }));
  }, []);

  const setComparisonLevel = useCallback((level: GeoLevel | null) => {
    setFilters(prev => ({
      ...prev,
      comparisonLevel: level,
      // Auto-select NL when switching to land level
      comparisonGeoCode: level === 'land' ? 'NL' : prev.comparisonGeoCode,
    }));
  }, []);

  const setComparisonGeoCode = useCallback((code: string | null) => {
    setFilters(prev => ({ ...prev, comparisonGeoCode: code }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

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
