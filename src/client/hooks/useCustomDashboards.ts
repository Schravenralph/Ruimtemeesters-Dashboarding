import { useState, useEffect, useCallback } from 'react';
import { listCustomDashboards } from '../services/api/dashboards';
import { useAuth } from '../contexts/AuthContext';
import type { CustomDashboard } from '@shared/api/contracts';

export function useCustomDashboards() {
  const { isAuthenticated } = useAuth();
  const [dashboards, setDashboards] = useState<CustomDashboard[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const { dashboards } = await listCustomDashboards();
      setDashboards(dashboards);
    } catch {}
    setIsLoading(false);
  }, [isAuthenticated]);

  useEffect(() => {
    load();
  }, [load]);

  return { dashboards, isLoading, reload: load };
}
