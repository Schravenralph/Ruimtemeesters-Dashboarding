import { useState, useEffect, useCallback } from 'react';
import { Bookmark, Plus, Trash2, Star, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { useFilters } from '../../contexts/FilterContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ui/Toast';
import { api } from '../../services/api/client';
import type { FilterState, GeoLevel } from '@shared/api/contracts';

interface SavedFilter {
  id: string;
  name: string;
  themeSlug: string | null;
  filters: FilterState;
  isDefault: boolean;
  createdAt: string;
}

interface SavedFiltersProps {
  themeSlug?: string;
}

export function SavedFilters({ themeSlug }: SavedFiltersProps) {
  const { user } = useAuth();
  const { filters, setGeoLevel, setGeoCode, setYear, setCompareYear, setComparisonEnabled } = useFilters();
  const { showToast } = useToast();
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [showSave, setShowSave] = useState(false);
  const [newName, setNewName] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const loadFilters = useCallback(async () => {
    if (!user) return;
    try {
      const { filters } = await api.get<{ filters: SavedFilter[] }>('/saved-filters');
      setSavedFilters(filters);
    } catch {}
  }, [user]);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  if (!user) return null;

  async function handleSave() {
    if (!newName.trim()) return;

    try {
      await api.post('/saved-filters', {
        name: newName,
        themeSlug,
        filters,
      });
      setNewName('');
      setShowSave(false);
      loadFilters();
      showToast('success', 'Filter opgeslagen');
    } catch {
      showToast('error', 'Opslaan mislukt');
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/saved-filters/${id}`);
      loadFilters();
      showToast('success', 'Filter verwijderd');
    } catch {
      showToast('error', 'Verwijderen mislukt');
    }
  }

  function applyFilter(saved: SavedFilter) {
    setGeoLevel(saved.filters.geoLevel as GeoLevel);
    setGeoCode(saved.filters.geoCode);
    setYear(saved.filters.period.year);
    setComparisonEnabled(saved.filters.comparisonEnabled);
    if (saved.filters.period.compareYear) {
      setCompareYear(saved.filters.period.compareYear);
    }
    showToast('info', `Filter "${saved.name}" toegepast`);
  }

  const relevantFilters = savedFilters.filter(f =>
    !f.themeSlug || f.themeSlug === themeSlug
  );

  return (
    <div className="flex items-center gap-2">
      {/* Saved filter chips */}
      {relevantFilters.slice(0, isExpanded ? undefined : 3).map(sf => (
        <button
          key={sf.id}
          onClick={() => applyFilter(sf)}
          className="group flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs hover:border-blue-300 hover:bg-blue-50"
        >
          {sf.isDefault && <Star className="h-3 w-3 text-yellow-500" />}
          <Bookmark className="h-3 w-3 text-gray-400 group-hover:text-blue-500" />
          <span className="text-gray-700">{sf.name}</span>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(sf.id); }}
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </button>
      ))}

      {relevantFilters.length > 3 && !isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="text-xs text-blue-600 hover:text-blue-700"
        >
          +{relevantFilters.length - 3} meer
        </button>
      )}

      {/* Save current */}
      {showSave ? (
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Naam..."
            className="rounded-full border border-gray-300 px-3 py-1 text-xs w-32"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
          />
          <button onClick={handleSave} className="text-green-600 hover:text-green-700">
            <Check className="h-4 w-4" />
          </button>
          <button onClick={() => setShowSave(false)} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowSave(true)}
          className="flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-3 py-1 text-xs text-gray-500 hover:border-blue-300 hover:text-blue-600"
        >
          <Plus className="h-3 w-3" />
          Filter opslaan
        </button>
      )}
    </div>
  );
}
