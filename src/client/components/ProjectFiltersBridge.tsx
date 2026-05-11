import { useEffect } from 'react';
import { useProjects } from '../contexts/ProjectContext';
import { usePresentations } from '../contexts/PresentationContext';
import { useFilters } from '../contexts/FilterContext';

/**
 * Push the active project's defaultGeoCode into FilterContext the first time
 * a project-scoped tab is mounted (issue #73).
 *
 * Fires once per tab — the Presentation carries a hydratedFromProject flag
 * so that subsequent user edits to geoCode/geoLevel are not overwritten if
 * the same project is revisited.
 *
 * Rendered as a non-visual side-effect component inside the provider stack;
 * see App.tsx.
 */
export function ProjectFiltersBridge() {
  const { currentProject } = useProjects();
  const { activeId, activePresentation, updatePresentation } = usePresentations();
  const { setGeoCode, setGeoLevel } = useFilters();

  useEffect(() => {
    if (!activeId || !activePresentation) return;
    if (!activePresentation.projectSlug) return;        // theme route — nothing to apply
    if (activePresentation.hydratedFromProject) return; // already done
    if (!currentProject) return;                        // project still loading
    if (currentProject.slug !== activePresentation.projectSlug) return; // tab/project mismatch (during switch)
    if (!currentProject.defaultGeoCode) {
      // Project has no defaultGeoCode — still mark hydrated so we don't keep
      // re-checking. User can pick a gemeente manually.
      updatePresentation(activeId, { hydratedFromProject: true });
      return;
    }

    setGeoCode(currentProject.defaultGeoCode);
    setGeoLevel('gemeente');
    updatePresentation(activeId, { hydratedFromProject: true });
  }, [
    activeId,
    activePresentation,
    currentProject,
    setGeoCode,
    setGeoLevel,
    updatePresentation,
  ]);

  return null;
}
