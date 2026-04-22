import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Plus, GripVertical } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { LoadingOverlay } from '../components/ui/Spinner';
import { TileGrid } from '../components/dashboard/TileGrid';
import { FilterBar } from '../components/filters/FilterBar';
import { TilePicker } from '../components/dashboard/TilePicker';
import {
  listCustomDashboards,
  updateCustomDashboard,
} from '../services/api/dashboards';
import { listThemes } from '../services/api/themes';
import type { CustomDashboard, TileConfig, LayoutItem, ThemeConfig } from '@shared/api/contracts';

export function CustomDashboardEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState<CustomDashboard | null>(null);
  const [tiles, setTiles] = useState<TileConfig[]>([]);
  const [layout, setLayout] = useState<LayoutItem[]>([]);
  const [availableThemes, setAvailableThemes] = useState<ThemeConfig[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    Promise.all([
      listCustomDashboards(),
      listThemes(),
    ]).then(([{ dashboards }, { themes }]) => {
      const found = dashboards.find(d => d.id === id);
      if (found) {
        setDashboard(found);
        setTiles((found.tiles as TileConfig[]) || []);
        setLayout((found.layout as LayoutItem[]) || []);
        setName(found.name);
        setDescription(found.description || '');
      }
      setAvailableThemes(themes);
      setIsLoading(false);
    });
  }, [id]);

  const handleAddTile = useCallback((tile: TileConfig) => {
    const newTile = { ...tile, id: `custom-${Date.now()}-${Math.random().toString(36).slice(2)}` };
    setTiles(prev => [...prev, newTile]);

    // Add layout item
    const maxY = layout.reduce((max, item) => Math.max(max, item.y + item.h), 0);
    setLayout(prev => [...prev, {
      i: newTile.id,
      x: 0,
      y: maxY,
      w: 6,
      h: 4,
    }]);

    setShowPicker(false);
  }, [layout]);

  const handleRemoveTile = useCallback((tileId: string) => {
    setTiles(prev => prev.filter(t => t.id !== tileId));
    setLayout(prev => prev.filter(l => l.i !== tileId));
  }, []);

  const handleSave = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      await updateCustomDashboard(id, {
        name,
        description,
        tiles: tiles as unknown[],
        layout: layout as unknown[],
      });
      navigate('/mijn-dashboards');
    } catch (err) {
      alert('Opslaan mislukt');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <LoadingOverlay message="Dashboard laden..." />;
  if (!dashboard) return <div className="p-8 text-center text-gray-500">Dashboard niet gevonden</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/mijn-dashboards')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-2xl font-bold text-gray-900 border-none bg-transparent focus:outline-none focus:ring-0 p-0"
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beschrijving toevoegen..."
              className="block text-sm text-gray-500 border-none bg-transparent focus:outline-none focus:ring-0 p-0 mt-1"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setShowPicker(true)}>
            <Plus className="h-4 w-4" />
            Tegel toevoegen
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4" />
            {isSaving ? 'Opslaan...' : 'Opslaan'}
          </Button>
        </div>
      </div>

      {/* Info Bar */}
      <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
        <GripVertical className="h-4 w-4" />
        <span>Sleep tegels om de layout aan te passen. Klik op het menu voor opties per tegel.</span>
      </div>

      {/* Filters */}
      {tiles.length > 0 && (
        <FilterBar dataSource={tiles[0]?.dataSource || 'bevolking'} />
      )}

      {/* Tile Grid */}
      {tiles.length === 0 ? (
        <Card>
          <div className="py-16 text-center">
            <p className="text-gray-500 mb-4">Dit dashboard heeft nog geen tegels.</p>
            <Button onClick={() => setShowPicker(true)}>
              <Plus className="h-4 w-4" />
              Eerste tegel toevoegen
            </Button>
          </div>
        </Card>
      ) : (
        <TileGrid
          tiles={tiles}
          layout={layout}
          editable
          onLayoutChange={setLayout}
          onRemoveTile={handleRemoveTile}
        />
      )}

      {/* Tile Picker Modal */}
      {showPicker && (
        <TilePicker
          themes={availableThemes}
          onSelect={handleAddTile}
          onClose={() => setShowPicker(false)}
          onThemesChanged={async () => {
            // The catalogue tab inside TilePicker just activated a new CBS
            // table; re-fetch themes so the new system theme + its auto-
            // generated tiles become selectable without a page reload.
            // Return the fresh array so callers don't have to rely on the
            // re-rendered prop (closure-capture pitfall).
            const { themes } = await listThemes();
            setAvailableThemes(themes);
            return themes;
          }}
        />
      )}
    </div>
  );
}
