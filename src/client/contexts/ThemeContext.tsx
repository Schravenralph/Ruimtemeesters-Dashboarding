import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { ThemeConfig, Supercategory } from '@shared/api/contracts';
import { listThemes } from '../services/api/themes';
import { listSupercategories } from '../services/api/supercategories';
import { useAuth } from './AuthContext';

interface ThemeContextValue {
  themes: ThemeConfig[];
  activeTheme: ThemeConfig | null;
  setActiveTheme: (theme: ThemeConfig) => void;
  supercategories: Supercategory[];
  activeSupercategory: string | null;
  setActiveSupercategory: (key: string) => void;
  isLoading: boolean;
  error: string | null;
  /** Re-fetch themes + supercategories. Call after mutations (e.g. CBS table
   *  activation) so newly-created themes appear without a full page reload. */
  refresh: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [themes, setThemes] = useState<ThemeConfig[]>([]);
  const [activeTheme, setActiveTheme] = useState<ThemeConfig | null>(null);
  const [supercategories, setSupercategories] = useState<Supercategory[]>([]);
  const [activeSupercategory, setActiveSupercategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (initial: boolean) => {
    if (initial) setIsLoading(true);
    try {
      const [themesRes, scRes] = await Promise.all([listThemes(), listSupercategories()]);
      setThemes(themesRes.themes);
      setSupercategories(scRes.supercategories);
      if (initial) {
        if (scRes.supercategories.length > 0) {
          setActiveSupercategory(scRes.supercategories[0].key);
        }
        if (themesRes.themes.length > 0) {
          setActiveTheme(themesRes.themes[0]);
        }
        setError(null);
      }
    } catch (err) {
      // Initial load: surface the failure via shared `error` state so
      //   consumers can show a fallback.
      // Background refresh: don't touch shared error state (a transient
      //   refresh failure shouldn't surface as a load failure across the
      //   whole app when the existing data in memory is still valid).
      //   Re-throw so the caller's .catch() can react locally.
      if (initial) setError(err instanceof Error ? err.message : 'Laden mislukt');
      else throw err;
    } finally {
      if (initial) setIsLoading(false);
    }
  }, []);

  // Wait for auth to finish + user to be authenticated before loading themes.
  // Both /api/themes and /api/supercategories are auth-gated; firing them
  // before the Clerk session token is in `api.token` returns 401 and leaves
  // the gallery empty until a manual reload.
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    void load(true);
  }, [authLoading, isAuthenticated, load]);

  const refresh = useCallback(() => load(false), [load]);

  return (
    <ThemeContext.Provider value={{
      themes, activeTheme, setActiveTheme,
      supercategories, activeSupercategory, setActiveSupercategory,
      isLoading, error, refresh,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemes() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useThemes must be used within ThemeProvider');
  return context;
}
