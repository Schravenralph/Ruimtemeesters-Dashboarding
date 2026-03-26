import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemes } from '../contexts/ThemeContext';

/**
 * Global keyboard shortcuts for navigation.
 *
 * Alt+1..9: Navigate to themes (dynamic, based on loaded themes)
 * Alt+H: Home (first overview theme)
 * Alt+M: My Dashboards
 * Alt+A: Admin
 * Alt+F: Focus filter bar search
 */
export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const { themes } = useThemes();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.altKey) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= Math.min(9, themes.length)) {
          e.preventDefault();
          navigate(`/dashboard/${themes[num - 1].slug}`);
          return;
        }

        switch (e.key.toLowerCase()) {
          case 'h': {
            e.preventDefault();
            const overview = themes.find(t => t.isOverview);
            navigate(`/dashboard/${overview?.slug || themes[0]?.slug || ''}`);
            break;
          }
          case 'm':
            e.preventDefault();
            navigate('/mijn-dashboards');
            break;
          case 'a':
            e.preventDefault();
            navigate('/admin');
            break;
          case 'f': {
            e.preventDefault();
            const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
            searchInput?.focus();
            break;
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, themes]);
}
