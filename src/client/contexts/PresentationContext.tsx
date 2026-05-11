import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { FilterState, ChartType, CohortType } from '@shared/api/contracts';
import type { TransformationType } from '../utils/transformations';

const STORAGE_KEY = 'ruimtemeesters_presentations';
const MAX_PRESENTATIONS = 10;

// SPEC-B: per-tab visibility of cohort/provincie/land reference series + envelope toggle.
// cohortType undefined → use the per-supercategory default returned by GET /api/cohorts/.
export interface ReferenceVisibility {
  cohort: boolean;
  provincie: boolean;
  land: boolean;
  envelope: boolean;
  cohortType?: CohortType;
}

export const DEFAULT_REFERENCE_VISIBILITY: ReferenceVisibility = {
  cohort: true,
  provincie: true,
  land: true,
  envelope: false,
};

export interface Presentation {
  id: string;
  title: string;
  themeSlug: string;
  // Optional project scope — when set, the tab points at /p/:projectSlug/:themeSlug
  // rather than /dashboard/:themeSlug. Tab clicks reconstruct the route from these
  // two fields, so the URL stays the source of truth for what's rendered.
  projectSlug?: string | null;
  filters: FilterState;
  chartType: ChartType;
  transformation: TransformationType;
  transformationOptions?: {
    groeicijferType?: 'absoluut' | 'relatief' | 'index';
    baseYear?: number;
  };
  referenceVisibility: ReferenceVisibility;
}

/** Derive the route a tab navigates to. Pure function — kept here so the
 *  PresentationTabBar and DashboardPage agree on the URL shape. */
export function routePathForPresentation(p: Pick<Presentation, 'themeSlug' | 'projectSlug'>): string {
  if (!p.themeSlug) return '/dashboard';
  return p.projectSlug ? `/p/${p.projectSlug}/${p.themeSlug}` : `/dashboard/${p.themeSlug}`;
}

interface PresentationState {
  presentations: Presentation[];
  activeId: string | null;
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
  comparedDimension: null,
  comparedDimensionValues: [],
};

function createDefaultPresentation(): Presentation {
  return {
    id: `pres-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: 'Dashboard',
    themeSlug: '',
    projectSlug: null,
    filters: { ...defaultFilters },
    chartType: 'table',
    transformation: 'none',
    referenceVisibility: { ...DEFAULT_REFERENCE_VISIBILITY },
  };
}

// Migrate old persisted presentations that lack referenceVisibility.
function migratePresentation(p: Partial<Presentation>): Presentation {
  return {
    ...createDefaultPresentation(),
    ...p,
    referenceVisibility: p.referenceVisibility ?? { ...DEFAULT_REFERENCE_VISIBILITY },
  } as Presentation;
}

function loadFromStorage(): PresentationState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.presentations)) {
      // Drop legacy inert tabs (themeSlug === '') created by the old + button.
      // Keeps only tabs that point at a real route.
      const presentations = parsed.presentations
        .map(migratePresentation)
        .filter((p: Presentation) => p.themeSlug);
      const activeId = presentations.some((p: Presentation) => p.id === parsed.activeId)
        ? parsed.activeId
        : (presentations[0]?.id ?? null);
      return { presentations, activeId };
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
    // Start empty: tabs only exist once the user opens a dashboard. The first
    // navigation (sidebar click, direct URL, or + picker) will create one via
    // DashboardPage's effect.
    return { presentations: [], activeId: null };
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
      const remaining = prev.presentations.filter(p => p.id !== id);
      // When closing the active tab, fall back to the rightmost remaining tab
      // (matches the visual ordering); when none remain, leave activeId null —
      // navigation will recreate a tab on next URL change.
      const newActiveId = prev.activeId === id
        ? (remaining[remaining.length - 1]?.id ?? null)
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
