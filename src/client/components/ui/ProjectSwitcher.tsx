import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, FolderKanban, Plus } from 'lucide-react';
import { useProjects } from '../../contexts/ProjectContext';

/**
 * SPEC-D ProjectSwitcher: top-left header dropdown listing the org's projects
 * + "Nieuw project" CTA. Switching updates last-active in localStorage and
 * navigates to /p/:slug/:defaultDashboardSlug.
 */
export function ProjectSwitcher() {
  const { projects, currentProject, setCurrentProjectSlug, isLoading } = useProjects();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleSwitch = (slug: string, defaultDashboardSlug: string | null) => {
    setCurrentProjectSlug(slug);
    setOpen(false);
    if (defaultDashboardSlug) navigate(`/p/${slug}/${defaultDashboardSlug}`);
    else navigate(`/p/${slug}`);
  };

  if (isLoading && !currentProject) {
    return <span className="text-sm text-gray-400">Projecten laden…</span>;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-50"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <FolderKanban className="h-4 w-4 text-gray-500" />
        <span className="max-w-[200px] truncate">
          {currentProject?.name ?? 'Geen project'}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </button>
      {open && (
        <ul role="listbox" className="absolute left-0 top-full z-30 mt-1 min-w-[260px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {projects.map(p => (
            <li
              key={p.id}
              role="option"
              aria-selected={currentProject?.id === p.id}
              onClick={() => handleSwitch(p.slug, p.themeSlug /* fallback to themeSlug as default-dashboard slug */)}
              className={`cursor-pointer px-3 py-2 hover:bg-gray-50 ${currentProject?.id === p.id ? 'bg-blue-50 font-semibold text-blue-700' : 'text-gray-700'}`}
            >
              <div className="text-sm">{p.name}</div>
              <div className="text-[10px] text-gray-400">/p/{p.slug}</div>
            </li>
          ))}
          {projects.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-500">Nog geen projecten</li>
          )}
          <li className="border-t border-gray-100 mt-1">
            <Link
              to="/projects/new"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
            >
              <Plus className="h-4 w-4" />
              Nieuw project
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}
