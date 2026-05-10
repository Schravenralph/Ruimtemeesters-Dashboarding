import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { listProjects, getProject, type Project, type ProjectDetail } from '../services/api/projects';
import { useAuth } from './AuthContext';

const LAST_ACTIVE_KEY = 'rm_last_active_project_slug';

interface ProjectContextValue {
  projects: Project[];
  currentProject: ProjectDetail | null;
  isLoading: boolean;
  error: string | null;
  setCurrentProjectSlug: (slug: string | null) => void;
  refetchProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

/**
 * SPEC-D ProjectContext.
 *
 * Reads /api/projects on mount, selects current project by URL :projectSlug
 * (when on /p/:slug routes) or by last-active slug from localStorage. Falls
 * back to the most recently created project for the org.
 */
export function ProjectProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const params = useParams<{ projectSlug?: string }>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<ProjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overrideSlug, setOverrideSlug] = useState<string | null>(null);

  const refetchProjects = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const { projects: list } = await listProjects();
      setProjects(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refetchProjects();
  }, [refetchProjects]);

  // Resolve current project by URL slug, override (manual switch), or last-active.
  const targetSlug = params.projectSlug ?? overrideSlug ?? localStorage.getItem(LAST_ACTIVE_KEY);

  useEffect(() => {
    if (!user) return;
    if (projects.length === 0) { setCurrentProject(null); return; }

    const slug = targetSlug ?? projects[0]?.slug;
    if (!slug) { setCurrentProject(null); return; }

    let cancelled = false;
    getProject(slug)
      .then(detail => {
        if (cancelled) return;
        setCurrentProject(detail);
        try { localStorage.setItem(LAST_ACTIVE_KEY, detail.slug); } catch { /* noop */ }
      })
      .catch(() => { if (!cancelled) setCurrentProject(null); });
    return () => { cancelled = true; };
  }, [user, projects, targetSlug]);

  const setCurrentProjectSlug = useCallback((slug: string | null) => {
    setOverrideSlug(slug);
  }, []);

  return (
    <ProjectContext.Provider value={{
      projects,
      currentProject,
      isLoading,
      error,
      setCurrentProjectSlug,
      refetchProjects,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProjects must be used within ProjectProvider');
  return ctx;
}
