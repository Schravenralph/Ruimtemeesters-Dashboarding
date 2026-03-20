import { useState, useEffect } from 'react';
import { Shield, Users, Database, Settings } from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingOverlay } from '../components/ui/Spinner';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api/client';
import type { AccessPolicy } from '@shared/api/contracts';
import { UserManagement } from '../components/admin/UserManagement';

export function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'policies' | 'users' | 'data'>('policies');
  const [policies, setPolicies] = useState<AccessPolicy[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'policies') {
      api.get<{ policies: AccessPolicy[] }>('/policies')
        .then(({ policies }) => setPolicies(policies))
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [activeTab]);

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Alleen beheerders hebben toegang tot deze pagina.</p>
      </div>
    );
  }

  const tabs = [
    { key: 'policies' as const, label: 'Toegangsbeleid', icon: Shield },
    { key: 'users' as const, label: 'Gebruikers', icon: Users },
    { key: 'data' as const, label: 'Databronnen', icon: Database },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Beheer</h1>
        <p className="text-sm text-gray-500 mt-1">
          RBAC/ABAC beleid, gebruikers en databronnen beheren
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setIsLoading(true); }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Policies Tab */}
      {activeTab === 'policies' && (
        isLoading ? <LoadingOverlay /> : (
          <div className="space-y-4">
            <div className="flex justify-between">
              <h2 className="text-lg font-semibold">ABAC Beleid ({policies.length})</h2>
              <Button size="sm">
                <Shield className="h-4 w-4" /> Nieuw beleid
              </Button>
            </div>

            {policies.map(policy => (
              <Card key={policy.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{policy.name}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        policy.effect === 'allow'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {policy.effect}
                      </span>
                    </div>
                    {policy.description && (
                      <p className="text-sm text-gray-500 mt-1">{policy.description}</p>
                    )}
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                      <span>Resource: <code className="bg-gray-100 px-1 rounded">{policy.resource}</code></span>
                      <span>Prioriteit: {policy.priority}</span>
                      <span>Condities: {policy.conditions.length}</span>
                    </div>
                    {policy.conditions.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {policy.conditions.map((c, i) => (
                          <div key={i} className="text-xs bg-gray-50 rounded px-2 py-1 inline-block mr-1">
                            {c.field} {c.operator} {JSON.stringify(c.value)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm">
                      <Settings className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Users Tab */}
      {activeTab === 'users' && <UserManagement />}

      {/* Data Tab */}
      {activeTab === 'data' && (
        <Card>
          <CardHeader title="Databronnen" subtitle="Beheer en configureer de beschikbare databronnen" />
          <div className="space-y-3">
            {['bevolking', 'huishoudens', 'woningen', 'woningtekort'].map(source => (
              <div key={source} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                <div>
                  <p className="font-medium text-gray-900 capitalize">{source}</p>
                  <p className="text-xs text-gray-500">data_{source}</p>
                </div>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  Actief
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
