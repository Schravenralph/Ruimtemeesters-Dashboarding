import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, LogOut, User, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useThemes } from '../../contexts/ThemeContext';
import { Button } from './Button';
import { NotificationBell } from './NotificationBell';
import { GlobalSearch } from './GlobalSearch';
import { ProjectSwitcher } from './ProjectSwitcher';

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { activeTheme } = useThemes();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
      {/* Project switcher + breadcrumb */}
      <div className="flex items-center gap-3 text-sm">
        <ProjectSwitcher />
        {activeTheme && (
          <>
            <span className="text-gray-300">/</span>
            <span className="font-medium text-gray-900">{activeTheme.name}</span>
          </>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <GlobalSearch />
        <NotificationBell />
        {isAuthenticated ? (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-100"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <User className="h-4 w-4" />
              </div>
              <span className="font-medium text-gray-700">{user?.name}</span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg z-50">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                  <span className="inline-block mt-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {user?.role}
                  </span>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                    navigate('/');
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <LogOut className="h-4 w-4" />
                  Uitloggen
                </button>
              </div>
            )}
          </div>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => navigate('/login')}>
            <LogIn className="h-4 w-4" />
            Inloggen
          </Button>
        )}
      </div>
    </header>
  );
}
