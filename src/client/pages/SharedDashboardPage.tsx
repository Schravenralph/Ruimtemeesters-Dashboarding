import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getSharedDashboard } from '../services/api/dashboards';
import { TileGrid } from '../components/dashboard/TileGrid';
import { LoadingOverlay } from '../components/ui/Spinner';
import type { CustomDashboard, TileConfig, LayoutItem } from '@shared/api/contracts';

export function SharedDashboardPage() {
  const { token } = useParams<{ token: string }>();
  const [dashboard, setDashboard] = useState<CustomDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    getSharedDashboard(token)
      .then(setDashboard)
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [token]);

  if (isLoading) return <LoadingOverlay message="Gedeeld dashboard laden..." />;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!dashboard) return <div className="p-8 text-center text-gray-500">Dashboard niet gevonden of verlopen</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{dashboard.name}</h1>
          {dashboard.description && (
            <p className="text-sm text-gray-500 mt-1">{dashboard.description}</p>
          )}
          <p className="text-xs text-gray-400 mt-2">
            Gedeeld dashboard · Alleen-lezen
          </p>
        </div>

        <TileGrid
          tiles={(dashboard.tiles as TileConfig[]) || []}
          layout={(dashboard.layout as LayoutItem[]) || undefined}
        />
      </div>
    </div>
  );
}
