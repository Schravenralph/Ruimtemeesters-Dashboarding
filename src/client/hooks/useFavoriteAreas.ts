import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

interface FavoriteArea {
  code: string;
  name: string;
  level: string;
  addedAt: string;
}

const MAX_FAVORITES = 20;

export function useFavoriteAreas() {
  const [favorites, setFavorites] = useLocalStorage<FavoriteArea[]>('favoriteAreas', []);

  const addFavorite = useCallback((area: { code: string; name: string; level: string }) => {
    setFavorites(prev => {
      if (prev.some(f => f.code === area.code)) return prev; // Already favorited
      return [
        { ...area, addedAt: new Date().toISOString() },
        ...prev,
      ].slice(0, MAX_FAVORITES);
    });
  }, [setFavorites]);

  const removeFavorite = useCallback((code: string) => {
    setFavorites(prev => prev.filter(f => f.code !== code));
  }, [setFavorites]);

  const isFavorite = useCallback((code: string) => {
    return favorites.some(f => f.code === code);
  }, [favorites]);

  const toggleFavorite = useCallback((area: { code: string; name: string; level: string }) => {
    if (isFavorite(area.code)) {
      removeFavorite(area.code);
    } else {
      addFavorite(area);
    }
  }, [isFavorite, addFavorite, removeFavorite]);

  return { favorites, addFavorite, removeFavorite, isFavorite, toggleFavorite };
}
