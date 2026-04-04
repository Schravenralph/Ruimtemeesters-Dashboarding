import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { FilterState, ChartType } from '@shared/api/contracts';
import type { TransformationType } from '../utils/transformations';

const STORAGE_KEY = 'ruimtemeesters_presentations';
const MAX_PRESENTATIONS = 10;

export interface Presentation {
  id: string;
  title: string;
  themeSlug: string;
  filters: FilterState;
  chartType: ChartType;
  transformation: TransformationType;
  transformationOptions?: {
    groeicijferType?: 'absoluut' | 'relatief' | 'index';
    baseYear?: number;
  };
}

interface PresentationState {
  presentations: Presentation[];
  activeId: string;
}

interface PresentationContextValue {
  presentations: Presentation[];
  activeId: string | null;
  activePresentation: Presentation | null;
  addPresentation: (config?: Partial<Presentation>) => string;
  removePresentation: (id: string) => void;
  setActive: (id: string) => void;
  updatePresentation: (id: string, updates: Partial<Presentation>) => void;
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
  comparedDimensionValues: [],
};

function createDefaultPresentation(): Presentation {
  return {
    id: `pres-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: 'Dashboard',
    themeSlug: '',
    filters: { ...defaultFilters },
    chartType: 'table',
    transformation: 'none',
  };
}

function loadFromStorage(): PresentationState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      Array.isArray(parsed.presentations) &&
      parsed.presentations.length > 0 &&
      typeof parsed.activeId === 'string'
    ) {
      return parsed as PresentationState;
    }
    return null;
  } catch {
    return null;
  }
}

function saveToStorage(state: PresentationState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage full or unavailable — silently fail
  }
}

const PresentationContext = createContext<PresentationContextValue | null>(null);

export function PresentationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PresentationState>(() => {
    const restored = loadFromStorage();
    if (restored) return restored;
    const defaultPres = createDefaultPresentation();
    return { presentations: [defaultPres], activeId: defaultPres.id };
  });

  // Persist to sessionStorage on every state change
  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  const addPresentation = useCallback((config?: Partial<Presentation>): string => {
    const newPres: Presentation = {
      ...createDefaultPresentation(),
      ...config,
      id: `pres-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };

    setState(prev => {
      if (prev.presentations.length >= MAX_PRESENTATIONS) return prev;
      return {
        presentations: [...prev.presentations, newPres],
        activeId: newPres.id,
      };
    });

    return newPres.id;
  }, []);

  const removePresentation = useCallback((id: string) => {
    setState(prev => {
      // Cannot remove the last presentation
      if (prev.presentations.length <= 1) return prev;

      const remaining = prev.presentations.filter(p => p.id !== id);
      const newActiveId = prev.activeId === id
        ? remaining[remaining.length - 1].id
        : prev.activeId;

      return { presentations: remaining, activeId: newActiveId };
    });
  }, []);

  const setActive = useCallback((id: string) => {
    setState(prev => {
      if (!prev.presentations.some(p => p.id === id)) return prev;
      return { ...prev, activeId: id };
    });
  }, []);

  const updatePresentation = useCallback((id: string, updates: Partial<Presentation>) => {
    setState(prev => ({
      ...prev,
      presentations: prev.presentations.map(p =>
        p.id === id ? { ...p, ...updates, id: p.id } : p, // never overwrite id
      ),
    }));
  }, []);

  const activePresentation = state.presentations.find(p => p.id === state.activeId) || null;

  return (
    <PresentationContext.Provider value={{
      presentations: state.presentations,
      activeId: state.activeId,
      activePresentation,
      addPresentation,
      removePresentation,
      setActive,
      updatePresentation,
    }}>
      {children}
    </PresentationContext.Provider>
  );
}

export function usePresentations() {
  const context = useContext(PresentationContext);
  if (!context) throw new Error('usePresentations must be used within PresentationProvider');
  return context;
}
