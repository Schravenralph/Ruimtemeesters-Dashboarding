import { useState, useEffect } from 'react';
import { Users, BarChart3, Database, Activity, TrendingUp } from 'lucide-react';
import { Card } from '../ui/Card';
import { LoadingOverlay } from '../ui/Spinner';
import { api } from '../../services/api/client';
import { formatNumber } from '../../utils/format';

interface Analytics {
  users: {
    byRole: { role: string; count: number }[];
    total: number;
  };
  dashboards: {
    customCount: number;
  };
  activity: {
    loginsLast7Days: number;
  };
  themes: { name: string; slug: string; userCount: number }[];
  dataVolume: {
    bevolking: number;
    huishoudens: number;
    woningen: number;
    woningtekort: number;
    total: number;
  };
}

const roleLabels: Record<string, string> = {
  admin: 'Beheerder',
  editor: 'Redacteur',
  viewer: 'Kijker',
  guest: 'Gast',
};

const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  editor: 'bg-blue-100 text-blue-700',
  viewer: 'bg-green-100 text-green-700',
  guest: 'bg-gray-100 text-gray-700',
};

export function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get<Analytics>('/analytics')
      .then(setAnalytics)
      .catch(() => setAnalytics(null))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <LoadingOverlay />;
  if (!analytics) return <p className="text-gray-500">Analytische gegevens niet beschikbaar.</p>;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Totaal gebruikers</p>
              <p className="text-xl font-bold text-gray-900">{analytics.users.total}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <BarChart3 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Aangepaste dashboards</p>
              <p className="text-xl font-bold text-gray-900">{analytics.dashboards.customCount}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
              <Activity className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Logins (7 dagen)</p>
              <p className="text-xl font-bold text-gray-900">{analytics.activity.loginsLast7Days}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
              <Database className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Totaal datapunten</p>
              <p className="text-xl font-bold text-gray-900">{formatNumber(analytics.dataVolume.total)}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Users by Role */}
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Gebruikers per rol</h3>
          <div className="space-y-2">
            {analytics.users.byRole.map(({ role, count }) => (
              <div key={role} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleColors[role] || 'bg-gray-100 text-gray-700'}`}>
                    {roleLabels[role] || role}
                  </span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Data Volume */}
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Data volume per bron</h3>
          <div className="space-y-2">
            {Object.entries(analytics.dataVolume)
              .filter(([key]) => key !== 'total')
              .map(([source, count]) => (
                <div key={source} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">{source}</span>
                  <span className="text-sm font-mono text-gray-900">{formatNumber(count as number)}</span>
                </div>
              ))}
          </div>
        </Card>

        {/* Theme Popularity */}
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Thema-populariteit</h3>
          <div className="space-y-2">
            {analytics.themes.map(theme => (
              <div key={theme.slug} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{theme.name}</span>
                <span className="text-sm text-gray-900">{theme.userCount} gebruikers</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
