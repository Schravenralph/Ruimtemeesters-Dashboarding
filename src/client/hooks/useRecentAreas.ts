import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

interface RecentArea {
  code: string;
  name: string;
  level: string;
  visitedAt: string;
}

const MAX_RECENT = 10;

export function useRecentAreas() {
  const [recentAreas, setRecentAreas] = useLocalStorage<RecentArea[]>('recentAreas', []);

  const addRecent = useCallback((area: { code: string; name: string; level: string }) => {
    setRecentAreas(prev => {
      const filtered = prev.filter(a => a.code !== area.code);
      return [
        { ...area, visitedAt: new Date().toISOString() },
        ...filtered,
      ].slice(0, MAX_RECENT);
    });
  }, [setRecentAreas]);

  const clearRecent = useCallback(() => {
    setRecentAreas([]);
  }, [setRecentAreas]);

  return { recentAreas, addRecent, clearRecent };
}
