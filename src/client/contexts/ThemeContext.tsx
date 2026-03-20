import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { ThemeConfig } from '@shared/api/contracts';
import { listThemes } from '../services/api/themes';

interface ThemeContextValue {
  themes: ThemeConfig[];
  activeTheme: ThemeConfig | null;
  setActiveTheme: (theme: ThemeConfig) => void;
  isLoading: boolean;
  error: string | null;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themes, setThemes] = useState<ThemeConfig[]>([]);
  const [activeTheme, setActiveTheme] = useState<ThemeConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listThemes()
      .then(({ themes }) => {
        setThemes(themes);
        if (themes.length > 0) {
          setActiveTheme(themes[0]);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <ThemeContext.Provider value={{ themes, activeTheme, setActiveTheme, isLoading, error }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemes() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useThemes must be used within ThemeProvider');
  return context;
}
