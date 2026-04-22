import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '../services/api/client';
import { useAuth } from './AuthContext';

interface AppConfig {
  locale: string;
  defaultTheme: string;
  defaultYear: number;
  compactNumbers: boolean;
  chartAnimations: boolean;
  autoRefresh: boolean;
  autoRefreshInterval: number;
  sidebarCollapsed: boolean;
  colorScheme: string;
}

const defaultConfig: AppConfig = {
  locale: 'nl',
  defaultTheme: '',
  defaultYear: 2024,
  compactNumbers: true,
  chartAnimations: true,
  autoRefresh: false,
  autoRefreshInterval: 300,
  sidebarCollapsed: false,
  colorScheme: 'default',
};

interface AppConfigContextValue {
  config: AppConfig;
  updateConfig: (updates: Partial<AppConfig>) => Promise<void>;
  isLoading: boolean;
}

const AppConfigContext = createContext<AppConfigContextValue | null>(null);

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [config, setConfig] = useState<AppConfig>(defaultConfig);
  // Start true so consumers can wait for either the GET to settle or for
  // auth to resolve as "not signed in". Flipping to false happens in both
  // branches of the effect below.
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Don't short-circuit to "unauthenticated" while auth is still resolving,
    // otherwise a consumer that gates on `isLoading` will see a false
    // "loaded with defaults" state before the real preferences arrive.
    if (authLoading) return;

    if (!isAuthenticated) {
      setConfig(defaultConfig);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    api.get<AppConfig>('/preferences')
      .then(setConfig)
      .catch(() => setConfig(defaultConfig))
      .finally(() => setIsLoading(false));
  }, [isAuthenticated, authLoading]);

  async function updateConfig(updates: Partial<AppConfig>) {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);

    if (isAuthenticated) {
      try {
        await api.put('/preferences', updates);
      } catch {
        // Revert on failure
        setConfig(config);
      }
    }
  }

  return (
    <AppConfigContext.Provider value={{ config, updateConfig, isLoading }}>
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig() {
  const context = useContext(AppConfigContext);
  if (!context) throw new Error('useAppConfig must be used within AppConfigProvider');
  return context;
}
