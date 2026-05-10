import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { CohortType } from '@shared/api/contracts';
import { usePresentations } from '../../contexts/PresentationContext';
import { useCohortMemberships } from '../../hooks/useCohortMemberships';
import { useFilters } from '../../contexts/FilterContext';

/**
 * SPEC-C T3: cohort visibility toggles + cohort-type selector.
 *
 * Lives next to GemeenteHeader. Updates the active presentation's referenceVisibility.
 * Hidden when the focal isn't a gemeente (cohorts are gemeente-scoped in v1).
 */
export function CohortToggles() {
  const { filters } = useFilters();
  const { activePresentation, updatePresentation } = usePresentations();
  const { memberships } = useCohortMemberships(filters.geoCode);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);

  if (filters.geoLevel !== 'gemeente') return null;
  if (!activePresentation) return null;

  const refVis = activePresentation.referenceVisibility;
  const themeDefault = (memberships?.defaultByTheme[activePresentation.themeSlug] ?? 'populatiegrootte') as CohortType;
  const activeCohortType = refVis.cohortType ?? themeDefault;
  const activeMembership = memberships?.memberships.find(m => m.cohortType === activeCohortType);

  const setCohortType = (t: CohortType | undefined) => {
    updatePresentation(activePresentation.id, {
      referenceVisibility: { ...refVis, cohortType: t },
    });
    setTypeMenuOpen(false);
  };

  const toggleVisibility = (kind: 'cohort' | 'provincie' | 'land') => {
    updatePresentation(activePresentation.id, {
      referenceVisibility: { ...refVis, [kind]: !refVis[kind] },
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-white px-4 py-2 text-xs">
      <span className="font-medium text-gray-500">Vergelijken met:</span>

      {/* Cohort-type selector */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setTypeMenuOpen(o => !o)}
          className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-2.5 py-1 font-medium text-gray-700 hover:bg-gray-50"
          aria-haspopup="listbox"
          aria-expanded={typeMenuOpen}
        >
          <span>{activeMembership?.name ?? `Cohort: ${activeCohortType}`}</span>
          {activeMembership && (
            <span className="text-gray-400">({activeMembership.memberCount})</span>
          )}
          <ChevronDown className="h-3 w-3 text-gray-500" />
        </button>
        {typeMenuOpen && (
          <ul role="listbox" className="absolute left-0 top-full z-20 mt-1 min-w-[220px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            {(memberships?.memberships ?? []).map(m => (
              <li
                key={m.cohortType}
                role="option"
                aria-selected={m.cohortType === activeCohortType}
                onClick={() => setCohortType(m.cohortType)}
                className={`cursor-pointer px-3 py-1.5 hover:bg-gray-50 ${m.cohortType === activeCohortType ? 'font-semibold text-blue-700' : 'text-gray-700'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span>{m.name}</span>
                  <span className="text-[10px] text-gray-400">{m.memberCount} gem.</span>
                </div>
                <div className="text-[10px] text-gray-500">{m.cohortType}</div>
              </li>
            ))}
            {memberships && memberships.memberships.length === 0 && (
              <li className="px-3 py-1.5 text-gray-500">Geen cohorten beschikbaar</li>
            )}
          </ul>
        )}
      </div>

      {/* Visibility chips */}
      <div className="flex items-center gap-1.5">
        {(['cohort', 'provincie', 'land'] as const).map(kind => {
          const on = refVis[kind];
          const label = kind === 'cohort' ? 'Cohort' : kind === 'provincie' ? 'Provincie' : 'Nederland';
          return (
            <button
              key={kind}
              type="button"
              onClick={() => toggleVisibility(kind)}
              aria-pressed={on}
              className={`rounded-full border px-2.5 py-1 font-medium transition ${
                on
                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {activeMembership && (
        <span className="ml-auto text-[10px] text-gray-400" title={activeMembership.source}>
          Bron: {activeMembership.source}
        </span>
      )}
    </div>
  );
}
