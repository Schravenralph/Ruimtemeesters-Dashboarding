import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Edit3, Save, X, FolderOpen, Table2 } from 'lucide-react';
import { useThemes } from '../contexts/ThemeContext';
import { FilterBar } from '../components/filters/FilterBar';
import { TileGrid } from '../components/dashboard/TileGrid';
import { DrilldownPanel } from '../components/dashboard/DrilldownPanel';
import { ComparisonView } from '../components/dashboard/ComparisonView';
import { StatsSummary } from '../components/dashboard/StatsSummary';
import { ThemeInfoPanel } from '../components/dashboard/ThemeInfoPanel';
import { OverviewGrid } from '../components/dashboard/OverviewGrid';
import { TrendSummary } from '../components/dashboard/TrendSummary';
import { PeriodBar } from '../components/dashboard/PeriodBar';
import { MultiAreaTable } from '../components/dashboard/MultiAreaTable';
import { WorkspaceManager } from '../components/dashboard/WorkspaceManager';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { Button } from '../components/ui/Button';
import { LoadingOverlay } from '../components/ui/Spinner';
import { useAuth } from '../contexts/AuthContext';
import { usePresentations } from '../contexts/PresentationContext';
import { getLayout, saveLayout } from '../services/api/dashboards';
import { getTheme } from '../services/api/themes';
import type { ThemeConfig, LayoutItem } from '@shared/api/contracts';

export function DashboardPage() {
  const { slug } = useParams<{ slug: string }>();
  const { themes, setActiveTheme, isLoading: themesLoading } = useThemes();
  const { user } = useAuth();
  const { presentations, setActive, addPresentation, updatePresentation } = usePresentations();

  const [theme, setTheme] = useState<ThemeConfig | null>(null);
  const [layout, setLayout] = useState<LayoutItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showComparisonTable, setShowComparisonTable] = useState(false);
  const [showWorkspace, setShowWorkspace] = useState(false);

  // Create or activate a presentation tab for this slug
  useEffect(() => {
    if (!slug) return;

    const existing = presentations.find(p => p.themeSlug === slug);
    if (existing) {
      setActive(existing.id);
    } else {
      const themeName = themes.find(t => t.slug === slug)?.name || slug;
      addPresentation({
        themeSlug: slug,
        title: themeName,
      });
    }
  }, [slug]);

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
    if (!theme) return;
    const { exportBulkPdf } = await import('../utils/export');
    await exportBulkPdf(theme.tiles, theme.name);
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

  const mainDataSource = theme.tiles[0]?.dataSource || '';

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
          <Button variant="ghost" size="sm" onClick={() => setShowComparisonTable(!showComparisonTable)}>
            <Table2 className="h-4 w-4" />
            {showComparisonTable ? 'Verberg' : 'Vergelijk gebieden'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowWorkspace(true)}>
            <FolderOpen className="h-4 w-4" />
            Werkruimte
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExportAll}>
            <Download className="h-4 w-4" />
            PDF
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

      {/* Theme info */}
      <ThemeInfoPanel theme={theme} />

      {/* Overview Stats (only for overview themes) */}
      {theme.isOverview && (
        <>
          <StatsSummary />
          <OverviewGrid />
        </>
      )}

      {/* Filters */}
      <FilterBar dataSource={mainDataSource} themeSlug={theme.slug} />

      {/* Multi-Area Comparison Table (toggle) */}
      {showComparisonTable && mainDataSource && (
        <div className="mb-4">
          <MultiAreaTable dataSource={mainDataSource} />
        </div>
      )}

      {/* Comparison View */}
      <ComparisonView
        dataSource={mainDataSource}
        title={theme.name}
      />

      {/* Trend Summary (non-overview themes) */}
      {!theme.isOverview && mainDataSource && (
        <TrendSummary dataSource={mainDataSource} />
      )}

      {/* Drilldown */}
      <DrilldownPanel
        dataSource={mainDataSource}
        onDimensionSelect={() => {}}
      />

      {/* Tile Grid */}
      <TileGrid
        tiles={theme.tiles}
        layout={layout.length > 0 ? layout : undefined}
        editable={isEditing}
        onLayoutChange={setLayout}
      />

      {/* Period Animation Bar */}
      {mainDataSource && <PeriodBar dataSource={mainDataSource} />}

      {/* Workspace Manager Modal */}
      <WorkspaceManager isOpen={showWorkspace} onClose={() => setShowWorkspace(false)} />
    </div>
  );
}
