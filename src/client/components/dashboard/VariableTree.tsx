import { useState, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronDown, Search, Check } from 'lucide-react';
import { useThemes } from '../../contexts/ThemeContext';
import { getDimensions } from '../../services/api/data';
import type { Dimension } from '@shared/api/contracts';

interface VariableNode {
  key: string;
  label: string;
  dataSource?: string;
  dimension?: string;
  dimensionValue?: string;
  children?: VariableNode[];
}

interface VariableTreeProps {
  onSelect: (dataSource: string, dimension?: string, dimensionValue?: string) => void;
  selectedKey?: string;
}

export function VariableTree({ onSelect, selectedKey }: VariableTreeProps) {
  const { themes, supercategories, activeSupercategory } = useThemes();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['root']));
  const [dimensionCache, setDimensionCache] = useState<Record<string, Dimension[]>>({});

  // Load dimensions for each data source
  useEffect(() => {
    const sources = new Set(themes.flatMap(t => t.tiles.map(tile => tile.dataSource)));
    for (const src of sources) {
      if (!dimensionCache[src]) {
        getDimensions(src).then(r => {
          setDimensionCache(prev => ({ ...prev, [src]: r.dimensions }));
        }).catch(() => {});
      }
    }
  }, [themes]);

  // Build tree from themes + dimensions
  const tree = useMemo<VariableNode[]>(() => {
    const filteredThemes = activeSupercategory
      ? themes.filter(t => t.supercategory === activeSupercategory)
      : themes;

    return filteredThemes
      .filter(t => !t.isOverview && t.tiles.length > 0)
      .map(theme => {
        // Group tiles by dataSource
        const sourceGroups = new Map<string, typeof theme.tiles>();
        for (const tile of theme.tiles) {
          const existing = sourceGroups.get(tile.dataSource) || [];
          existing.push(tile);
          sourceGroups.set(tile.dataSource, existing);
        }

        const children: VariableNode[] = [];
        for (const [dataSource, tiles] of sourceGroups) {
          const dims = dimensionCache[dataSource] || [];

          if (dims.length === 0) {
            // No dimensions loaded yet — show as flat
            children.push({
              key: `${theme.slug}/${dataSource}`,
              label: tiles[0]?.title || dataSource,
              dataSource,
            });
          } else {
            // Build dimension tree
            for (const dim of dims) {
              const dimNode: VariableNode = {
                key: `${dataSource}/${dim.id}`,
                label: dim.name,
                children: [
                  {
                    key: `${dataSource}/${dim.id}/all`,
                    label: `Alle ${dim.name.toLowerCase()}`,
                    dataSource,
                    dimension: dim.id,
                  },
                  ...dim.values.map(v => ({
                    key: `${dataSource}/${dim.id}/${v.key}`,
                    label: v.label,
                    dataSource,
                    dimension: dim.id,
                    dimensionValue: v.key,
                  })),
                ],
              };
              children.push(dimNode);
            }
          }
        }

        return {
          key: theme.slug,
          label: theme.name,
          children,
        };
      });
  }, [themes, activeSupercategory, dimensionCache]);

  // Filter by search
  const filteredTree = useMemo(() => {
    if (!search) return tree;
    const q = search.toLowerCase();

    function filterNode(node: VariableNode): VariableNode | null {
      if (node.label.toLowerCase().includes(q)) return node;
      if (node.children) {
        const filteredChildren = node.children.map(filterNode).filter(Boolean) as VariableNode[];
        if (filteredChildren.length > 0) return { ...node, children: filteredChildren };
      }
      return null;
    }

    return tree.map(filterNode).filter(Boolean) as VariableNode[];
  }, [tree, search]);

  function toggleExpand(key: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function renderNode(node: VariableNode, depth: number = 0) {
    const isExpanded = expanded.has(node.key);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedKey === node.key;
    const isSelectable = !!node.dataSource;

    return (
      <div key={node.key}>
        <button
          className={`w-full flex items-center gap-1 px-2 py-1.5 text-sm rounded transition-colors ${
            isSelected ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            if (hasChildren) toggleExpand(node.key);
            if (isSelectable) onSelect(node.dataSource!, node.dimension, node.dimensionValue);
          }}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          ) : (
            <span className="w-3.5" />
          )}
          <span className="truncate">{node.label}</span>
          {isSelected && <Check className="h-3.5 w-3.5 ml-auto text-blue-500 shrink-0" />}
        </button>

        {hasChildren && isExpanded && node.children!.map(child => renderNode(child, depth + 1))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-2 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-gray-400" />
          <input
            type="search"
            placeholder="Zoeken in onderwerpen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-1">
        {filteredTree.length === 0 ? (
          <p className="text-sm text-gray-400 p-3">Geen onderwerpen gevonden</p>
        ) : (
          filteredTree.map(node => renderNode(node))
        )}
      </div>
    </div>
  );
}
