import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Share2, Trash2, Edit3, ExternalLink, Copy } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { LoadingOverlay } from '../components/ui/Spinner';
import {
  listCustomDashboards,
  createCustomDashboard,
  deleteCustomDashboard,
  shareDashboard,
} from '../services/api/dashboards';
import type { CustomDashboard } from '@shared/api/contracts';

export function CustomDashboardsPage() {
  const [dashboards, setDashboards] = useState<CustomDashboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const navigate = useNavigate();

  const loadDashboards = useCallback(async () => {
    try {
      const { dashboards } = await listCustomDashboards();
      setDashboards(dashboards);
    } catch {
      // Not authenticated or error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboards();
  }, [loadDashboards]);

  async function handleCreate() {
    if (!newName.trim()) return;

    await createCustomDashboard({
      name: newName,
      description: newDescription || undefined,
    });

    setNewName('');
    setNewDescription('');
    setShowCreate(false);
    loadDashboards();
  }

  async function handleDelete(id: string) {
    if (!confirm('Weet je zeker dat je dit dashboard wilt verwijderen?')) return;
    await deleteCustomDashboard(id);
    loadDashboards();
  }

  async function handleShare(id: string) {
    const { shareToken } = await shareDashboard(id);
    const url = `${window.location.origin}/shared/${shareToken}`;
    await navigator.clipboard.writeText(url);
    alert(`Link gekopieerd: ${url}\n\nGeldig voor 30 dagen.`);
    loadDashboards();
  }

  if (isLoading) return <LoadingOverlay message="Dashboards laden..." />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mijn Dashboards</h1>
          <p className="text-sm text-gray-500 mt-1">
            Maak en beheer je eigen dashboards (max. 5)
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} disabled={dashboards.length >= 5}>
          <Plus className="h-4 w-4" />
          Nieuw dashboard
        </Button>
      </div>

      {/* Create Dialog */}
      {showCreate && (
        <Card className="mb-6">
          <CardHeader title="Nieuw dashboard aanmaken" />
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Naam</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Mijn analyse dashboard"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Beschrijving</label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Optionele beschrijving..."
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={!newName.trim()}>Aanmaken</Button>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>Annuleren</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Dashboard List */}
      {dashboards.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <p className="text-gray-500">Je hebt nog geen dashboards. Maak er een aan!</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboards.map(dashboard => (
            <Card key={dashboard.id} className="flex flex-col">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{dashboard.name}</h3>
                {dashboard.description && (
                  <p className="text-sm text-gray-500 mt-1">{dashboard.description}</p>
                )}
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                  <span>{(dashboard.tiles as unknown[])?.length || 0} tegels</span>
                  <span>·</span>
                  <span>Bijgewerkt {new Date(dashboard.updatedAt).toLocaleDateString('nl-NL')}</span>
                </div>
                {dashboard.shareToken && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
                    <ExternalLink className="h-3 w-3" />
                    Gedeeld (verloopt {new Date(dashboard.shareExpiresAt!).toLocaleDateString('nl-NL')})
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-4">
                <Button variant="ghost" size="sm" onClick={() => navigate(`/mijn-dashboards/${dashboard.id}`)}>
                  <Edit3 className="h-3.5 w-3.5" /> Bewerken
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleShare(dashboard.id)}>
                  <Share2 className="h-3.5 w-3.5" /> Delen
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(dashboard.id)} className="text-red-600 hover:text-red-700">
                  <Trash2 className="h-3.5 w-3.5" /> Verwijderen
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
