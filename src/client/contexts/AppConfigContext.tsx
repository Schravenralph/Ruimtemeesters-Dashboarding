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
  const { isAuthenticated } = useAuth();
  const [config, setConfig] = useState<AppConfig>(defaultConfig);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setConfig(defaultConfig);
      return;
    }

    setIsLoading(true);
    api.get<AppConfig>('/preferences')
      .then(setConfig)
      .catch(() => setConfig(defaultConfig))
      .finally(() => setIsLoading(false));
  }, [isAuthenticated]);

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
