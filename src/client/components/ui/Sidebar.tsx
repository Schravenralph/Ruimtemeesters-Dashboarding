import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Home, Building2, TrendingDown,
  ChevronLeft, ChevronRight, Plus, Settings,
  Brain, TrendingUp, Zap, Leaf, Trash2, BarChart3, Target, Map,
  Cloud, Sun, Recycle, Database,
} from 'lucide-react';
import { useThemes } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import type { ThemeConfig } from '@shared/api/contracts';

const iconMap: Record<string, typeof LayoutDashboard> = {
  LayoutDashboard, Users, Home, Building2, TrendingDown,
  Brain, TrendingUp, Zap, Leaf, Trash2, BarChart3, Target, Map,
  Cloud, Sun, Recycle,
};

function getIcon(iconName?: string) {
  if (!iconName) return LayoutDashboard;
  return iconMap[iconName] || LayoutDashboard;
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true');
  const { themes, activeTheme, setActiveTheme } = useThemes();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleThemeClick = (theme: ThemeConfig) => {
    setActiveTheme(theme);
    navigate(`/dashboard/${theme.slug}`);
  };

  return (
    <aside
      className={`flex flex-col bg-gray-900 text-white transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-sm shrink-0">
          RM
        </div>
        {!collapsed && (
          <span className="font-semibold text-sm truncate">Ruimtemeesters</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-3 mb-2">
          {!collapsed && (
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Thema's
            </span>
          )}
        </div>

        {themes.map(theme => {
          const Icon = getIcon(theme.icon);
          const isActive = activeTheme?.slug === theme.slug ||
            location.pathname === `/dashboard/${theme.slug}`;

          return (
            <button
              key={theme.id}
              onClick={() => handleThemeClick(theme)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border-r-2 border-blue-400'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
              title={collapsed ? theme.name : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{theme.name}</span>}
            </button>
          );
        })}

        {/* Custom dashboards section */}
        {user && (
          <>
            <div className="mx-3 my-3 border-t border-gray-800" />
            <div className="px-3 mb-2">
              {!collapsed && (
                <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Mijn Dashboards
                </span>
              )}
            </div>
            <button
              onClick={() => navigate('/mijn-dashboards')}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                location.pathname === '/mijn-dashboards'
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Plus className="h-5 w-5 shrink-0" />
              {!collapsed && <span>Nieuw dashboard</span>}
            </button>
          </>
        )}
      </nav>

      {/* Settings & Collapse */}
      <div className="border-t border-gray-800 p-3">
        <button
          onClick={() => navigate('/catalogus')}
          className={`flex w-full items-center gap-3 px-2 py-2 text-sm rounded-lg ${
            location.pathname === '/catalogus'
              ? 'bg-blue-600/20 text-blue-400'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <Database className="h-5 w-5 shrink-0" />
          {!collapsed && <span>CBS Catalogus</span>}
        </button>
        {user?.role === 'admin' && (
          <button
            onClick={() => navigate('/admin')}
            className={`flex w-full items-center gap-3 px-2 py-2 text-sm rounded-lg ${
              location.pathname === '/admin'
                ? 'bg-blue-600/20 text-blue-400'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <Settings className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Beheer</span>}
          </button>
        )}
        <button
          onClick={() => { const next = !collapsed; setCollapsed(next); try { localStorage.setItem('sidebar-collapsed', String(next)); } catch { /* quota exceeded */ } }}
          className="flex w-full items-center gap-3 px-2 py-2 text-sm text-gray-500 hover:text-white rounded-lg"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span>Inklappen</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
