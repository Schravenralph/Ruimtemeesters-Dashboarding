import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { FilterProvider } from './contexts/FilterContext';
import { Layout } from './components/ui/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { CustomDashboardsPage } from './pages/CustomDashboardsPage';
import { AdminPage } from './pages/AdminPage';
import { SharedDashboardPage } from './pages/SharedDashboardPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <FilterProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/shared/:token" element={<SharedDashboardPage />} />

              {/* App routes with layout */}
              <Route path="/" element={<Layout><Navigate to="/dashboard/overzicht" replace /></Layout>} />
              <Route path="/dashboard/:slug" element={<Layout><DashboardPage /></Layout>} />
              <Route path="/mijn-dashboards" element={<Layout><CustomDashboardsPage /></Layout>} />
              <Route path="/admin" element={<Layout><AdminPage /></Layout>} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/dashboard/overzicht" replace />} />
            </Routes>
          </FilterProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
