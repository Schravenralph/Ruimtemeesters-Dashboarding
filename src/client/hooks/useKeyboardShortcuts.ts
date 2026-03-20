import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Global keyboard shortcuts for navigation.
 *
 * Alt+1..5: Navigate to themes
 * Alt+M: My Dashboards
 * Alt+A: Admin
 * Alt+F: Focus filter bar search
 * Escape: Close modals/menus
 */
export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const themeRoutes = [
      '/dashboard/overzicht',
      '/dashboard/bevolking',
      '/dashboard/huishoudens',
      '/dashboard/woningen',
      '/dashboard/woningtekort',
    ];

    function handleKeyDown(e: KeyboardEvent) {
      // Ignore when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.altKey) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 5) {
          e.preventDefault();
          navigate(themeRoutes[num - 1]);
          return;
        }

        switch (e.key.toLowerCase()) {
          case 'm':
            e.preventDefault();
            navigate('/mijn-dashboards');
            break;
          case 'a':
            e.preventDefault();
            navigate('/admin');
            break;
          case 'f':
            e.preventDefault();
            // Focus the first search input
            const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
            searchInput?.focus();
            break;
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);
}
