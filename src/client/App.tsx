import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { FilterProvider } from './contexts/FilterContext';
import { Layout } from './components/ui/Layout';
import { ToastProvider } from './components/ui/Toast';
import { LoadingOverlay } from './components/ui/Spinner';

// Lazy-loaded pages for code splitting
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const CustomDashboardsPage = lazy(() => import('./pages/CustomDashboardsPage').then(m => ({ default: m.CustomDashboardsPage })));
const CustomDashboardEditorPage = lazy(() => import('./pages/CustomDashboardEditorPage').then(m => ({ default: m.CustomDashboardEditorPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })));
const SharedDashboardPage = lazy(() => import('./pages/SharedDashboardPage').then(m => ({ default: m.SharedDashboardPage })));
const PrintPage = lazy(() => import('./pages/PrintPage').then(m => ({ default: m.PrintPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const HelpPage = lazy(() => import('./pages/HelpPage').then(m => ({ default: m.HelpPage })));
const DataDownloadPage = lazy(() => import('./pages/DataDownloadPage').then(m => ({ default: m.DataDownloadPage })));

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingOverlay message="Pagina laden..." />}>{children}</Suspense>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <FilterProvider>
            <ToastProvider>
              <SuspenseWrapper>
                <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/shared/:token" element={<SharedDashboardPage />} />
                  <Route path="/print/:slug" element={<PrintPage />} />

                  {/* App routes with layout */}
                  <Route path="/" element={<Layout><Navigate to="/dashboard/overzicht" replace /></Layout>} />
                  <Route path="/dashboard/:slug" element={<Layout><DashboardPage /></Layout>} />
                  <Route path="/mijn-dashboards" element={<Layout><CustomDashboardsPage /></Layout>} />
                  <Route path="/mijn-dashboards/:id" element={<Layout><CustomDashboardEditorPage /></Layout>} />
                  <Route path="/admin" element={<Layout><AdminPage /></Layout>} />
                  <Route path="/instellingen" element={<Layout><SettingsPage /></Layout>} />
                  <Route path="/help" element={<Layout><HelpPage /></Layout>} />
                  <Route path="/download" element={<Layout><DataDownloadPage /></Layout>} />

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/dashboard/overzicht" replace />} />
                </Routes>
              </SuspenseWrapper>
            </ToastProvider>
          </FilterProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
