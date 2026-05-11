import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Edit3, Save, X, FolderOpen, Table2, Printer } from 'lucide-react';
import { useThemes } from '../contexts/ThemeContext';
import { useFilters } from '../contexts/FilterContext';
import { FilterBar } from '../components/filters/FilterBar';
import { TileGrid } from '../components/dashboard/TileGrid';
import { DrilldownPanel } from '../components/dashboard/DrilldownPanel';
import { ComparisonView } from '../components/dashboard/ComparisonView';
import { StatsSummary } from '../components/dashboard/StatsSummary';
import { ThemeInfoPanel } from '../components/dashboard/ThemeInfoPanel';
import { OverviewGrid } from '../components/dashboard/OverviewGrid';
import { TrendSummary } from '../components/dashboard/TrendSummary';
import { GemeenteComparison } from '../components/dashboard/GemeenteComparison';
import { TopGroeiers } from '../components/dashboard/TopGroeiers';
import { PrognoseInfoBanner } from '../components/dashboard/PrognoseInfoBanner';
import { QuickInsights } from '../components/dashboard/QuickInsights';
import { DuurzaamheidStats } from '../components/dashboard/DuurzaamheidStats';
import { PeriodBar } from '../components/dashboard/PeriodBar';
import { MultiAreaTable } from '../components/dashboard/MultiAreaTable';
import { WorkspaceManager } from '../components/dashboard/WorkspaceManager';
import { GemeenteHeader } from '../components/dashboard/GemeenteHeader';
import { CohortToggles } from '../components/dashboard/CohortToggles';
import { KpiStrip } from '../components/dashboard/KpiStrip';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { Button } from '../components/ui/Button';
import { LoadingOverlay } from '../components/ui/Spinner';
import { useAuth } from '../contexts/AuthContext';
import { usePresentations } from '../contexts/PresentationContext';
import { getLayout, saveLayout } from '../services/api/dashboards';
import { getTheme } from '../services/api/themes';
import { getProjectDashboard, saveProjectDashboardLayout } from '../services/api/project-dashboards';
import type { ThemeConfig, LayoutItem, TileConfig, ProjectDashboard } from '@shared/api/contracts';

export function DashboardPage() {
  const { slug, projectSlug } = useParams<{ slug: string; projectSlug?: string }>();
  const { themes, setActiveTheme, isLoading: themesLoading } = useThemes();
  const { user } = useAuth();
  const { filters } = useFilters();
  const { presentations, setActive, addPresentation, updatePresentation } = usePresentations();

  const [theme, setTheme] = useState<ThemeConfig | null>(null);
  const [projectDashboard, setProjectDashboard] = useState<ProjectDashboard | null>(null);
  const [layout, setLayout] = useState<LayoutItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showComparisonTable, setShowComparisonTable] = useState(false);
  const [showWorkspace, setShowWorkspace] = useState(false);

  // Each route (slug + optional projectSlug) has exactly one tab. Mounting or
  // navigating here either activates the matching tab or creates it. This is
  // the *only* place tabs are created — the + button in the tab bar uses
  // navigate(), which lands back here and falls through to this effect.
  useEffect(() => {
    if (!slug) return;
    const existing = presentations.find(
      p => p.themeSlug === slug && (p.projectSlug ?? null) === (projectSlug ?? null),
    );
    if (existing) {
      setActive(existing.id);
    } else {
      const themeName = themes.find(t => t.slug === slug)?.name || slug;
      addPresentation({
        themeSlug: slug,
        projectSlug: projectSlug ?? null,
        title: themeName,
      });
    }
  }, [slug, projectSlug]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    async function loadProjectScoped(themeData: ThemeConfig) {
      if (cancelled || !slug || !projectSlug) return;
      try {
        const dashboard = await getProjectDashboard(projectSlug, slug);
        if (cancelled) return;
        setProjectDashboard(dashboard);
        setLayout(dashboard.layout ?? []);
      } catch {
        // Fall back to system-theme layout if the project dashboard is missing.
        // Awaited so the loading indicator stays until the fallback resolves —
        // otherwise the finally fires before loadLayout completes.
        if (!cancelled) await loadLayout(themeData.id);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    // Try to find theme from cached list first
    const cached = themes.find(t => t.slug === slug);
    if (cached) {
      setTheme(cached);
      setActiveTheme(cached);
      if (projectSlug) {
        setProjectDashboard(null);
        loadProjectScoped(cached);
      } else {
        setProjectDashboard(null);
        loadLayout(cached.id);
      }
      return () => { cancelled = true; };
    }

    // Otherwise fetch from API
    getTheme(slug)
      .then(themeData => {
        if (cancelled) return;
        setTheme(themeData);
        setActiveTheme(themeData);
        if (projectSlug) {
          setProjectDashboard(null);
          loadProjectScoped(themeData);
        } else {
          setProjectDashboard(null);
          loadLayout(themeData.id);
        }
      })
      .catch(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [slug, projectSlug, themes, setActiveTheme]);

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
    if (projectSlug && projectDashboard) {
      await saveProjectDashboardLayout(projectSlug, projectDashboard.slug, layout);
    } else {
      await saveLayout(theme.id, layout);
    }
    setIsEditing(false);
  }

  // Project-scoped routes get their tiles + layout from project_dashboards; theme
  // routes fall through to the system theme's tiles. tilesSource is the single
  // source of truth for every downstream component.
  const tilesSource: TileConfig[] = projectDashboard?.tiles ?? theme?.tiles ?? [];

  async function handleExportAll() {
    if (!theme) return;
    const { exportBulkPdf } = await import('../utils/export');
    await exportBulkPdf(tilesSource, projectDashboard?.name ?? theme.name);
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

  const mainDataSource = tilesSource[0]?.dataSource || undefined;

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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const params = new URLSearchParams({
                geoCode: filters.geoCode,
                year: String(filters.period.year),
              });
              window.open(`/print/${theme.slug}?${params.toString()}`, '_blank', 'noopener');
            }}
          >
            <Printer className="h-4 w-4" />
            Print
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
          {theme.supercategory !== 'duurzaamheid' && <StatsSummary />}
          {theme.supercategory === 'duurzaamheid' && <DuurzaamheidStats />}
          <QuickInsights category={theme.supercategory === 'duurzaamheid' ? 'duurzaamheid' : 'wonen'} />
          <OverviewGrid supercategory={theme.supercategory} />
        </>
      )}

      {/* SPEC-C: per-gemeente drilldown shell — only mounts when focal is a gemeente.
          Renders above existing FilterBar so cohort affordances are top-level discoverable. */}
      {filters.geoLevel === 'gemeente' && (
        <>
          <div className="mb-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <GemeenteHeader />
            <CohortToggles />
          </div>
          <KpiStrip themeSlug={theme.slug} kpiConfig={theme.kpiConfig ?? []} />
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
      {mainDataSource && (
        <ComparisonView
          dataSource={mainDataSource}
          title={theme.name}
        />
      )}

      {/* Trend Summary (non-overview themes) */}
      {!theme.isOverview && mainDataSource && (
        <TrendSummary dataSource={mainDataSource} />
      )}

      {/* Prognose metadata banner */}
      {theme.slug === 'prognose' && <PrognoseInfoBanner />}

      {/* Gemeente Comparison (groeianalyse and prognose themes) */}
      {(theme.slug === 'groeianalyse' || theme.slug === 'prognose') && (
        <GemeenteComparison source={mainDataSource} />
      )}

      {/* Top Groeiers ranked list (groeianalyse theme) */}
      {theme.slug === 'groeianalyse' && (
        <TopGroeiers source={mainDataSource} />
      )}

      {/* Drilldown */}
      {mainDataSource && (
        <DrilldownPanel
          dataSource={mainDataSource}
          onDimensionSelect={() => {}}
        />
      )}

      {/* Tile Grid */}
      <TileGrid
        tiles={tilesSource}
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
