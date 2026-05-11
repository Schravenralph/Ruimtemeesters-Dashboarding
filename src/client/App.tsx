import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ClerkProvider, Show } from '@clerk/react';
import { AuthProvider } from './contexts/AuthContext';
import { AppConfigProvider, useAppConfig } from './contexts/AppConfigContext';
import { ThemeProvider, useThemes } from './contexts/ThemeContext';
import { PresentationProvider } from './contexts/PresentationContext';
import { FilterProvider } from './contexts/FilterContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { ProjectFiltersBridge } from './components/ProjectFiltersBridge';
import { Layout } from './components/ui/Layout';
import { ToastProvider } from './components/ui/Toast';
import { LoadingOverlay } from './components/ui/Spinner';

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

// Lazy-loaded pages for code splitting
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const CustomDashboardsPage = lazy(() => import('./pages/CustomDashboardsPage').then(m => ({ default: m.CustomDashboardsPage })));
const CustomDashboardEditorPage = lazy(() => import('./pages/CustomDashboardEditorPage').then(m => ({ default: m.CustomDashboardEditorPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })));
const SharedDashboardPage = lazy(() => import('./pages/SharedDashboardPage').then(m => ({ default: m.SharedDashboardPage })));
const PrintPage = lazy(() => import('./pages/PrintPage').then(m => ({ default: m.PrintPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const HelpPage = lazy(() => import('./pages/HelpPage').then(m => ({ default: m.HelpPage })));
const DataDownloadPage = lazy(() => import('./pages/DataDownloadPage').then(m => ({ default: m.DataDownloadPage })));
const EmbedPage = lazy(() => import('./pages/EmbedPage').then(m => ({ default: m.EmbedPage })));
const ReportPage = lazy(() => import('./pages/ReportPage').then(m => ({ default: m.ReportPage })));
const CatalogPage = lazy(() => import('./pages/CatalogPage').then(m => ({ default: m.CatalogPage })));
const NewProjectWizardPage = lazy(() => import('./pages/NewProjectWizardPage').then(m => ({ default: m.NewProjectWizardPage })));

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingOverlay message="Pagina laden..." />}>{children}</Suspense>;
}

function NotSignedIn() {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <p className="text-gray-600 text-lg">Je bent niet ingelogd.</p>
      <a
        href="https://datameesters.nl"
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        Ga naar Workspace om in te loggen
      </a>
    </div>
  );
}

function DashboardRedirect() {
  const { themes, isLoading: themesLoading } = useThemes();
  const { config, isLoading: configLoading } = useAppConfig();

  if (themesLoading || configLoading) return <LoadingOverlay message="Laden..." />;

  // User's saved default theme takes precedence when it still exists.
  if (config.defaultTheme && themes.some(t => t.slug === config.defaultTheme)) {
    return <Navigate to={`/dashboard/${config.defaultTheme}`} replace />;
  }

  const overview = themes.find(t => t.isOverview);
  const fallback = overview?.slug || themes[0]?.slug || 'overzicht';
  return <Navigate to={`/dashboard/${fallback}`} replace />;
}

function AuthenticatedApp() {
  return (
    <AuthProvider>
      <AppConfigProvider>
      <ThemeProvider>
        <PresentationProvider>
        <FilterProvider>
          <ProjectProvider>
          <ToastProvider>
            <ProjectFiltersBridge />
            <SuspenseWrapper>
              <Routes>
                {/* Public routes */}
                <Route path="/shared/:token" element={<SharedDashboardPage />} />
                <Route path="/print/:slug" element={<PrintPage />} />
                <Route path="/embed/:slug" element={<EmbedPage />} />

                {/* App routes with layout */}
                <Route path="/" element={<Layout><Navigate to="/dashboard" replace /></Layout>} />
                <Route path="/dashboard" element={<Layout><DashboardRedirect /></Layout>} />
                <Route path="/dashboard/:slug" element={<Layout><DashboardPage /></Layout>} />
                {/* SPEC-D project routes */}
                <Route path="/projects/new" element={<Layout><NewProjectWizardPage /></Layout>} />
                <Route path="/p/:projectSlug" element={<Layout><DashboardRedirect /></Layout>} />
                <Route path="/p/:projectSlug/:slug" element={<Layout><DashboardPage /></Layout>} />
                <Route path="/mijn-dashboards" element={<Layout><CustomDashboardsPage /></Layout>} />
                <Route path="/mijn-dashboards/:id" element={<Layout><CustomDashboardEditorPage /></Layout>} />
                <Route path="/admin" element={<Layout><AdminPage /></Layout>} />
                <Route path="/instellingen" element={<Layout><SettingsPage /></Layout>} />
                <Route path="/help" element={<Layout><HelpPage /></Layout>} />
                <Route path="/download" element={<Layout><DataDownloadPage /></Layout>} />
                <Route path="/rapport" element={<Layout><ReportPage /></Layout>} />
                <Route path="/catalogus" element={<Layout><CatalogPage /></Layout>} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </SuspenseWrapper>
          </ToastProvider>
          </ProjectProvider>
        </FilterProvider>
        </PresentationProvider>
      </ThemeProvider>
      </AppConfigProvider>
    </AuthProvider>
  );
}

// Local dev bypass: pk_live_ keys reject localhost, so Clerk's <Show> never
// resolves and the React root stays blank. When running against localhost
// during dev, skip Clerk and render the authenticated tree directly so the
// developer can iterate on UI without an SSO round-trip. Prod and any
// non-localhost host go through the normal Clerk flow.
const DEV_BYPASS_CLERK =
  import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export default function App() {
  if (DEV_BYPASS_CLERK) {
    return (
      <BrowserRouter>
        <AuthenticatedApp />
      </BrowserRouter>
    );
  }
  return (
    <ClerkProvider publishableKey={CLERK_KEY}>
      <BrowserRouter>
        <Show when="signed-in">
          <AuthenticatedApp />
        </Show>
        <Show when="signed-out">
          <NotSignedIn />
        </Show>
      </BrowserRouter>
    </ClerkProvider>
  );
}
