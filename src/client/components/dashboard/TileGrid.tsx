import { useState, useCallback } from 'react';
import type { TileConfig, LayoutItem, DataPoint } from '@shared/api/contracts';
import { DashboardTile } from './DashboardTile';
import { exportTile } from '../../utils/export';

interface TileGridProps {
  tiles: TileConfig[];
  layout?: LayoutItem[];
  onLayoutChange?: (layout: LayoutItem[]) => void;
  editable?: boolean;
  onRemoveTile?: (tileId: string) => void;
}

export function TileGrid({ tiles, layout, editable = false, onLayoutChange, onRemoveTile }: TileGridProps) {
  const [draggedTile, setDraggedTile] = useState<string | null>(null);

  // Generate default layout if none provided
  const effectiveLayout: LayoutItem[] = layout && layout.length > 0
    ? layout
    : tiles.map((tile, index) => ({
        i: tile.id,
        x: (index % 2) * 6,
        y: Math.floor(index / 2) * 4,
        w: 6,
        h: 4,
        minW: 3,
        minH: 3,
      }));

  const handleDragStart = useCallback((tileId: string) => {
    if (!editable) return;
    setDraggedTile(tileId);
  }, [editable]);

  const handleDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    if (!editable || !draggedTile || draggedTile === targetId) return;
    e.preventDefault();
  }, [editable, draggedTile]);

  const handleDrop = useCallback((targetId: string) => {
    if (!editable || !draggedTile || draggedTile === targetId) return;

    const newLayout = [...effectiveLayout];
    const dragIdx = newLayout.findIndex(l => l.i === draggedTile);
    const dropIdx = newLayout.findIndex(l => l.i === targetId);

    if (dragIdx >= 0 && dropIdx >= 0) {
      // Swap positions
      const temp = { x: newLayout[dragIdx].x, y: newLayout[dragIdx].y };
      newLayout[dragIdx] = { ...newLayout[dragIdx], x: newLayout[dropIdx].x, y: newLayout[dropIdx].y };
      newLayout[dropIdx] = { ...newLayout[dropIdx], x: temp.x, y: temp.y };
      onLayoutChange?.(newLayout);
    }

    setDraggedTile(null);
  }, [editable, draggedTile, effectiveLayout, onLayoutChange]);

  const handleExport = useCallback((tileId: string, format: string, data: DataPoint[]) => {
    const tile = tiles.find(t => t.id === tileId);
    if (tile) {
      exportTile(tile, format, data);
    }
  }, [tiles]);

  // CSS Grid-based layout with responsive behavior
  return (
    <div className="grid gap-4 auto-rows-[100px]" style={{
      gridTemplateColumns: 'repeat(var(--grid-cols, 12), minmax(0, 1fr))',
    }}>
      <style>{`
        :root { --grid-cols: 12; }
        @media (max-width: 1024px) { :root { --grid-cols: 6; } }
        @media (max-width: 768px) { :root { --grid-cols: 1; } }
      `}</style>
      {tiles.map(tile => {
        const item = effectiveLayout.find(l => l.i === tile.id);
        if (!item) return null;

        return (
          <div
            key={tile.id}
            className={`${editable ? 'cursor-move' : ''}`}
            style={{
              gridColumn: `span ${Math.min(item.w, 12)}`,
              gridRow: `span ${item.h}`,
            }}
            draggable={editable}
            onDragStart={() => handleDragStart(tile.id)}
            onDragOver={(e) => handleDragOver(e, tile.id)}
            onDrop={() => handleDrop(tile.id)}
          >
            <DashboardTile
              tile={tile}
              onRemove={editable ? () => onRemoveTile?.(tile.id) : undefined}
              onExport={(format, data) => handleExport(tile.id, format, data)}
            />
          </div>
        );
      })}
    </div>
  );
}
