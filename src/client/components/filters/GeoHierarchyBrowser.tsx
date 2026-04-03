import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown, MapPin, Globe, Building, Landmark, Navigation } from 'lucide-react';
import { listAreas, getChildren, geocodeAddress, type GeocodeResult } from '../../services/api/geo';
import { useFilters } from '../../contexts/FilterContext';
import { SearchInput } from '../ui/SearchInput';
import type { GeoArea, GeoLevel } from '@shared/api/contracts';

interface GeoHierarchyBrowserProps {
  onSelect?: (area: GeoArea) => void;
  onClose?: () => void;
}

const levelIcons: Record<string, typeof Globe> = {
  land: Globe,
  provincie: Landmark,
  gemeente: Building,
  wijk: MapPin,
  buurt: MapPin,
};

const levelLabels: Record<string, string> = {
  land: 'Land',
  provincie: 'Provincies',
  gemeente: 'Gemeenten',
  wijk: 'Wijken',
  buurt: 'Buurten',
};

interface TreeNode {
  area: GeoArea;
  children: TreeNode[];
  isExpanded: boolean;
  isLoading: boolean;
}

export function GeoHierarchyBrowser({ onSelect, onClose }: GeoHierarchyBrowserProps) {
  const { filters, setGeoCode, setGeoLevel } = useFilters();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeoArea[]>([]);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [tab, setTab] = useState<'tree' | 'address'>('tree');
  const [addressQuery, setAddressQuery] = useState('');
  const [addressResults, setAddressResults] = useState<GeocodeResult[]>([]);
  const [isGeocoging, setIsGeocoding] = useState(false);

  // Address geocoding handler
  useEffect(() => {
    if (tab !== 'address' || !addressQuery || addressQuery.length < 3) {
      setAddressResults([]);
      setIsGeocoding(false);
      return;
    }
    setIsGeocoding(true);
    const timeout = setTimeout(() => {
      geocodeAddress(addressQuery).then(({ results }) => {
        setAddressResults(results);
        setIsGeocoding(false);
      }).catch(() => setIsGeocoding(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [addressQuery, tab]);

  // Initialize tree with top-level areas
  useEffect(() => {
    // Start with NL
    listAreas({ level: 'provincie' }).then(({ areas }) => {
      setTree([{
        area: { code: 'NL', name: 'Nederland', level: 'land' as GeoLevel, parentCode: null },
        children: areas.map(a => ({
          area: a,
          children: [],
          isExpanded: false,
          isLoading: false,
        })),
        isExpanded: true,
        isLoading: false,
      }]);
    });
  }, []);

  // Search handler
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(() => {
      listAreas({ q: searchQuery }).then(({ areas }) => {
        setSearchResults(areas);
        setIsSearching(false);
      });
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const expandNode = useCallback(async (code: string) => {
    const updateNodes = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map(node => {
        if (node.area.code === code) {
          if (node.isExpanded) {
            return { ...node, isExpanded: false };
          }
          // Load children if not loaded
          if (node.children.length === 0) {
            return { ...node, isLoading: true, isExpanded: true };
          }
          return { ...node, isExpanded: true };
        }
        return { ...node, children: updateNodes(node.children) };
      });
    };

    setTree(prev => updateNodes(prev));

    // Load children
    const { areas } = await getChildren(code);
    if (areas.length > 0) {
      const updateWithChildren = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.map(node => {
          if (node.area.code === code) {
            return {
              ...node,
              isLoading: false,
              children: areas.map(a => ({
                area: a,
                children: [],
                isExpanded: false,
                isLoading: false,
              })),
            };
          }
          return { ...node, children: updateWithChildren(node.children) };
        });
      };
      setTree(prev => updateWithChildren(prev));
    }
  }, []);

  const selectArea = useCallback((area: GeoArea) => {
    setGeoCode(area.code);
    setGeoLevel(area.level as GeoLevel);
    onSelect?.(area);
  }, [setGeoCode, setGeoLevel, onSelect]);

  function renderNode(node: TreeNode, depth: number = 0) {
    const Icon = levelIcons[node.area.level] || MapPin;
    const isSelected = filters.geoCode === node.area.code;
    const hasChildren = node.children.length > 0 || node.area.level !== 'gemeente';

    return (
      <div key={node.area.code}>
        <div
          className={`flex items-center gap-1 rounded-lg px-2 py-1.5 cursor-pointer transition-colors ${
            isSelected
              ? 'bg-blue-100 text-blue-700'
              : 'hover:bg-gray-50 text-gray-700'
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => expandNode(node.area.code)}
              className="shrink-0 p-0.5"
            >
              {node.isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
              )}
            </button>
          ) : (
            <span className="w-4" />
          )}
          <button
            onClick={() => selectArea(node.area)}
            className="flex items-center gap-2 flex-1 text-left text-sm"
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span className={isSelected ? 'font-medium' : ''}>{node.area.name}</span>
          </button>
        </div>

        {node.isExpanded && node.isLoading && (
          <div style={{ paddingLeft: `${(depth + 1) * 16 + 16}px` }} className="py-1">
            <span className="text-xs text-gray-400">Laden...</span>
          </div>
        )}

        {node.isExpanded && node.children.map(child => renderNode(child, depth + 1))}
      </div>
    );
  }

  function selectGemeente(result: GeocodeResult) {
    if (!result.gemeenteCode) return;
    setGeoCode(result.gemeenteCode);
    setGeoLevel('gemeente' as GeoLevel);
    onSelect?.({ code: result.gemeenteCode, name: result.gemeenteNaam || result.display, level: 'gemeente' as GeoLevel, parentCode: null });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-lg max-h-[500px] flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setTab('tree')}
          className={`flex-1 px-3 py-2 text-sm font-medium ${tab === 'tree' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Gebieden
        </button>
        <button
          onClick={() => setTab('address')}
          className={`flex-1 px-3 py-2 text-sm font-medium ${tab === 'address' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Navigation className="h-3.5 w-3.5 inline mr-1" />
          Adres zoeken
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-gray-100">
        {tab === 'tree' ? (
          <SearchInput
            placeholder="Zoek een gebied..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
          />
        ) : (
          <SearchInput
            placeholder="Straat, postcode of plaatsnaam..."
            value={addressQuery}
            onChange={(e) => setAddressQuery(e.target.value)}
            onClear={() => setAddressQuery('')}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {tab === 'address' ? (
          // Address geocoding results
          isGeocoging ? (
            <p className="text-sm text-gray-400 p-3">Zoeken...</p>
          ) : addressResults.length === 0 && addressQuery.length >= 3 ? (
            <p className="text-sm text-gray-400 p-3">Geen resultaten</p>
          ) : (
            addressResults.map((result, i) => (
              <button
                key={i}
                onClick={() => selectGemeente(result)}
                disabled={!result.gemeenteCode}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-left hover:bg-gray-50 text-gray-700 disabled:opacity-50"
              >
                <Navigation className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="flex-1 truncate">{result.display}</span>
                {result.gemeenteNaam && (
                  <span className="text-xs text-blue-500 shrink-0">{result.gemeenteNaam}</span>
                )}
              </button>
            ))
          )
        ) : searchQuery.length >= 2 ? (
          // Search results
          isSearching ? (
            <p className="text-sm text-gray-400 p-3">Zoeken...</p>
          ) : searchResults.length === 0 ? (
            <p className="text-sm text-gray-400 p-3">Geen resultaten</p>
          ) : (
            searchResults.map(area => {
              const Icon = levelIcons[area.level] || MapPin;
              return (
                <button
                  key={area.code}
                  onClick={() => selectArea(area)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-left ${
                    filters.geoCode === area.code
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 text-gray-400" />
                  <span>{area.name}</span>
                  <span className="text-xs text-gray-400 ml-auto">{levelLabels[area.level]}</span>
                </button>
              );
            })
          )
        ) : (
          // Tree view
          tree.map(node => renderNode(node))
        )}
      </div>
    </div>
  );
}
