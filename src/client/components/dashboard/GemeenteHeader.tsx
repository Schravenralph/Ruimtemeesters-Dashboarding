import { useState, useEffect } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import { useFilters } from '../../contexts/FilterContext';
import { useCohortMemberships } from '../../hooks/useCohortMemberships';
import { GeoHierarchyBrowser } from '../filters/GeoHierarchyBrowser';
import type { GeoArea } from '@shared/api/contracts';

/**
 * SPEC-C T2: header for the per-gemeente drilldown frame.
 *
 * Renders gemeente picker + inline summary chips (stedelijkheid, parent provincie).
 * For non-gemeente focal levels, summary chips are hidden but picker stays.
 */
export function GemeenteHeader() {
  const { filters, setGeoCode, setGeoLevel } = useFilters();
  const { memberships } = useCohortMemberships(filters.geoCode);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [focalArea, setFocalArea] = useState<{ name: string; level: string } | null>(null);

  // Fetch focal area name with AbortController + non-OK clear, so a rapid
  // sequence of geoCode changes (or a 404 after a municipal merger) doesn't
  // leave stale data on screen. Bugbot R1 #63.
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/geo/${filters.geoCode}`, { signal: ctrl.signal })
      .then(r => {
        if (!r.ok) {
          // Clear stale name so the picker label falls back to the raw code.
          setFocalArea(null);
          return null;
        }
        return r.json();
      })
      .then((area: GeoArea | null) => {
        if (area) setFocalArea({ name: area.name, level: area.level });
      })
      .catch((err: unknown) => {
        // Ignore abort errors (expected on rapid changes); clear on real errors.
        if (err instanceof Error && err.name !== 'AbortError') setFocalArea(null);
      });
    return () => ctrl.abort();
  }, [filters.geoCode]);

  const isGemeente = filters.geoLevel === 'gemeente';
  const stedelijkheid = memberships?.memberships.find(m => m.cohortType === 'stedelijkheid');

  const handleSelect = (area: { code: string; level?: string }) => {
    setGeoCode(area.code);
    if (area.level) setGeoLevel(area.level as 'land' | 'provincie' | 'corop' | 'gemeente');
    setPickerOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
      <div className="relative">
        <button
          type="button"
          onClick={() => setPickerOpen(o => !o)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-50"
          aria-haspopup="dialog"
          aria-expanded={pickerOpen}
        >
          <MapPin className="h-4 w-4 text-gray-500" />
          <span>{focalArea?.name ?? filters.geoCode}</span>
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </button>
        {pickerOpen && (
          <div className="absolute left-0 top-full z-30 mt-1 w-[480px]">
            <GeoHierarchyBrowser onSelect={handleSelect} onClose={() => setPickerOpen(false)} />
          </div>
        )}
      </div>
      <div aria-live="polite" className="sr-only">
        {focalArea ? `Focus gemeente: ${focalArea.name}` : ''}
      </div>
      {isGemeente && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
          {stedelijkheid && (
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 font-medium text-blue-700">
              {stedelijkheid.name}
            </span>
          )}
          {focalArea && (
            <span className="rounded-full bg-gray-50 px-2.5 py-0.5 font-medium text-gray-700">
              Niveau: {focalArea.level}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
