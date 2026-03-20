import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Edit3, Save, X } from 'lucide-react';
import { useThemes } from '../contexts/ThemeContext';
import { FilterBar } from '../components/filters/FilterBar';
import { TileGrid } from '../components/dashboard/TileGrid';
import { DrilldownPanel } from '../components/dashboard/DrilldownPanel';
import { ComparisonView } from '../components/dashboard/ComparisonView';
import { StatsSummary } from '../components/dashboard/StatsSummary';
import { Button } from '../components/ui/Button';
import { LoadingOverlay } from '../components/ui/Spinner';
import { useAuth } from '../contexts/AuthContext';
import { getLayout, saveLayout } from '../services/api/dashboards';
import { getTheme } from '../services/api/themes';
import type { ThemeConfig, LayoutItem } from '@shared/api/contracts';

export function DashboardPage() {
  const { slug } = useParams<{ slug: string }>();
  const { themes, setActiveTheme, isLoading: themesLoading } = useThemes();
  const { user } = useAuth();

  const [theme, setTheme] = useState<ThemeConfig | null>(null);
  const [layout, setLayout] = useState<LayoutItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    // Try to find theme from cached list first
    const cached = themes.find(t => t.slug === slug);
    if (cached) {
      setTheme(cached);
      setActiveTheme(cached);
      loadLayout(cached.id);
      return;
    }

    // Otherwise fetch from API
    getTheme(slug)
      .then(themeData => {
        setTheme(themeData);
        setActiveTheme(themeData);
        loadLayout(themeData.id);
      })
      .catch(() => setIsLoading(false));
  }, [slug, themes, setActiveTheme]);

  async function loadLayout(themeId: string) {
    try {
      const { items } = await getLayout(themeId);
      setLayout(items);
    } catch {
      // No saved layout — will use default
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveLayout() {
    if (!theme) return;
    await saveLayout(theme.id, layout);
    setIsEditing(false);
  }

  async function handleExportAll() {
    // Trigger download of all tiles as PDF
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text(theme?.name || 'Dashboard', 20, 20);
    doc.setFontSize(10);
    doc.text(`Geexporteerd: ${new Date().toLocaleString('nl-NL')}`, 20, 30);

    let yOffset = 40;
    for (const tile of theme?.tiles || []) {
      if (yOffset > 250) {
        doc.addPage();
        yOffset = 20;
      }
      doc.setFontSize(14);
      doc.text(tile.title, 20, yOffset);
      yOffset += 8;
      doc.setFontSize(9);
      doc.text(`Bron: ${tile.dataSource} | Type: ${tile.chartType}`, 20, yOffset);
      yOffset += 15;
    }

    doc.save(`${theme?.name || 'dashboard'}.pdf`);
  }

  if (themesLoading || isLoading) {
    return <LoadingOverlay message="Dashboard laden..." />;
  }

  if (!theme) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Thema niet gevonden</p>
      </div>
    );
  }

  return (
    <div>
      {/* Theme Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{theme.name}</h1>
          {theme.description && (
            <p className="text-sm text-gray-500 mt-1">{theme.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleExportAll}>
            <Download className="h-4 w-4" />
            Alles downloaden (PDF)
          </Button>
          {user && (
            isEditing ? (
              <>
                <Button variant="primary" size="sm" onClick={handleSaveLayout}>
                  <Save className="h-4 w-4" />
                  Opslaan
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                  <X className="h-4 w-4" />
                  Annuleren
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                <Edit3 className="h-4 w-4" />
                Layout bewerken
              </Button>
            )
          )}
        </div>
      </div>

      {/* Overview Stats (only for overzicht theme) */}
      {theme.slug === 'overzicht' && <StatsSummary />}

      {/* Filters */}
      <FilterBar dataSource={theme.tiles[0]?.dataSource || 'bevolking'} />

      {/* Comparison View */}
      <ComparisonView
        dataSource={theme.tiles[0]?.dataSource || 'bevolking'}
        title={theme.name}
      />

      {/* Drilldown */}
      <DrilldownPanel
        dataSource={theme.tiles[0]?.dataSource || 'bevolking'}
        onDimensionSelect={() => {}}
      />

      {/* Tile Grid */}
      <TileGrid
        tiles={theme.tiles}
        layout={layout.length > 0 ? layout : undefined}
        editable={isEditing}
        onLayoutChange={setLayout}
      />
    </div>
  );
}
