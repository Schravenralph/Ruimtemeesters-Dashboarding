import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { ThemeConfig, Supercategory } from '@shared/api/contracts';
import { listThemes } from '../services/api/themes';
import { listSupercategories } from '../services/api/supercategories';

interface ThemeContextValue {
  themes: ThemeConfig[];
  activeTheme: ThemeConfig | null;
  setActiveTheme: (theme: ThemeConfig) => void;
  supercategories: Supercategory[];
  activeSupercategory: string | null;
  setActiveSupercategory: (key: string) => void;
  isLoading: boolean;
  error: string | null;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themes, setThemes] = useState<ThemeConfig[]>([]);
  const [activeTheme, setActiveTheme] = useState<ThemeConfig | null>(null);
  const [supercategories, setSupercategories] = useState<Supercategory[]>([]);
  const [activeSupercategory, setActiveSupercategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listThemes(), listSupercategories()])
      .then(([themesRes, scRes]) => {
        setThemes(themesRes.themes);
        setSupercategories(scRes.supercategories);
        if (scRes.supercategories.length > 0) {
          setActiveSupercategory(scRes.supercategories[0].key);
        }
        if (themesRes.themes.length > 0) {
          setActiveTheme(themesRes.themes[0]);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <ThemeContext.Provider value={{
      themes, activeTheme, setActiveTheme,
      supercategories, activeSupercategory, setActiveSupercategory,
      isLoading, error,
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
