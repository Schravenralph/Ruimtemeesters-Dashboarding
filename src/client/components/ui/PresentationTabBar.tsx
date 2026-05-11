import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { usePresentations, routePathForPresentation } from '../../contexts/PresentationContext';
import { useThemes } from '../../contexts/ThemeContext';

const MAX_TABS = 10;

/**
 * Tab bar for open dashboards.
 *
 * Clicking a tab navigates to its route — the URL is the source of truth, so
 * DashboardPage will pick it up via :slug and (optionally) :projectSlug. The
 * `+` button opens a theme picker; choosing a theme navigates there, and
 * DashboardPage's effect adds the matching presentation.
 */
export function PresentationTabBar() {
  const { presentations, activeId, removePresentation } = usePresentations();
  const { themes } = useThemes();
  const navigate = useNavigate();
  const { projectSlug } = useParams<{ projectSlug?: string }>();
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  // Close the picker on click-outside.
  useEffect(() => {
    if (!pickerOpen) return;
    const onClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [pickerOpen]);

  // Position the picker fixed to the viewport (not absolute inside the tab
  // bar) — the tab bar uses overflow-x-auto, which implicitly clips overflow-y
  // and would chop the dropdown to a thin strip. Recompute on resize/scroll.
  useEffect(() => {
    if (!pickerOpen || !triggerRef.current) { setMenuPos(null); return; }
    const place = () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setMenuPos({ top: r.bottom + 4, left: r.left });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [pickerOpen]);

  // Themes already open in a tab for the *current* project scope. The picker
  // hides these so users don't double-open the same tab.
  const openSlugsInScope = new Set(
    presentations.filter(p => (p.projectSlug ?? null) === (projectSlug ?? null)).map(p => p.themeSlug),
  );
  const pickable = themes.filter(t => !openSlugsInScope.has(t.slug));

  const handlePick = (themeSlug: string) => {
    setPickerOpen(false);
    navigate(routePathForPresentation({ themeSlug, projectSlug: projectSlug ?? null }));
  };

  // Closing the active tab must also navigate — otherwise the URL keeps
  // pointing at the closed dashboard while activeId already moved to the
  // fallback tab, and DashboardPage would keep rendering the closed view.
  const handleClose = (pres: typeof presentations[number]) => {
    const wasActive = pres.id === activeId;
    removePresentation(pres.id);
    if (!wasActive) return;
    const remaining = presentations.filter(p => p.id !== pres.id);
    const fallback = remaining[remaining.length - 1];
    navigate(fallback ? routePathForPresentation(fallback) : '/dashboard');
  };

  if (presentations.length === 0) return null;

  return (
    <div className="flex items-center border-b border-gray-200 bg-white px-4 overflow-x-auto no-print">
      {presentations.map(pres => {
        const isActive = pres.id === activeId;
        return (
          <div
            key={pres.id}
            className={`group flex items-center gap-1 px-3 py-2 text-sm border-b-2 whitespace-nowrap transition-colors ${
              isActive
                ? 'border-blue-600 text-blue-600 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <button
              onClick={() => navigate(routePathForPresentation(pres))}
              className="truncate max-w-[180px] cursor-pointer"
              title={pres.title}
            >
              {pres.title}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClose(pres);
              }}
              className={`rounded p-0.5 transition-opacity ${
                isActive
                  ? 'text-blue-400 hover:text-blue-600 hover:bg-blue-50'
                  : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
              title="Sluiten"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}

      {presentations.length < MAX_TABS && (
        <div ref={pickerRef} className="relative">
          <button
            ref={triggerRef}
            onClick={() => setPickerOpen(o => !o)}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-400 hover:text-blue-600 border-b-2 border-transparent"
            title="Nieuw tabblad — kies een thema"
            aria-haspopup="menu"
            aria-expanded={pickerOpen}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          {pickerOpen && menuPos && (
            <div
              role="menu"
              style={{ position: 'fixed', top: menuPos.top, left: menuPos.left }}
              className="z-50 w-64 rounded-lg border border-gray-200 bg-white shadow-lg max-h-80 overflow-y-auto"
            >
              <div className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-gray-500 border-b border-gray-100">
                Open thema
              </div>
              {pickable.length === 0 ? (
                <div className="px-3 py-3 text-sm text-gray-500">Alle thema's zijn al geopend.</div>
              ) : (
                pickable.map(theme => (
                  <button
                    key={theme.slug}
                    onClick={() => handlePick(theme.slug)}
                    role="menuitem"
                    className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                  >
                    {theme.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
