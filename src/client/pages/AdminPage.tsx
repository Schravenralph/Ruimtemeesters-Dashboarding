import { useState } from 'react';
import { Shield, Users, Database, ClipboardList, Upload, Palette, Key, Webhook, BarChart3, RefreshCw, Activity, Gauge } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserManagement } from '../components/admin/UserManagement';
import { PolicyEditor } from '../components/admin/PolicyEditor';
import { AuditLog } from '../components/admin/AuditLog';
import { DataSourceManager } from '../components/admin/DataSourceManager';
import { DataImportPanel } from '../components/admin/DataImportPanel';
import { DataQualityPanel } from '../components/admin/DataQualityPanel';
import { ThemeManager } from '../components/admin/ThemeManager';
import { ThemeReadiness } from '../components/admin/ThemeReadiness';
import { ApiKeyManager } from '../components/admin/ApiKeyManager';
import { WebhookManager } from '../components/admin/WebhookManager';
import { AnalyticsDashboard } from '../components/admin/AnalyticsDashboard';
import { DataSyncPanel } from '../components/admin/DataSyncPanel';

type Tab = 'policies' | 'users' | 'themes' | 'readiness' | 'data' | 'quality' | 'import' | 'sync' | 'audit' | 'apikeys' | 'webhooks' | 'analytics';

export function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('policies');

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Alleen beheerders hebben toegang tot deze pagina.</p>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: typeof Shield }[] = [
    { key: 'policies', label: 'Toegangsbeleid', icon: Shield },
    { key: 'users', label: 'Gebruikers', icon: Users },
    { key: 'themes', label: 'Thema\'s', icon: Palette },
    { key: 'readiness', label: 'Themaprestatie', icon: Gauge },
    { key: 'data', label: 'Databronnen', icon: Database },
    { key: 'quality', label: 'Datakwaliteit', icon: Activity },
    { key: 'import', label: 'Data import', icon: Upload },
    { key: 'sync', label: 'CBS Sync', icon: RefreshCw },
    { key: 'audit', label: 'Audit Log', icon: ClipboardList },
    { key: 'apikeys', label: 'API Sleutels', icon: Key },
    { key: 'webhooks', label: 'Webhooks', icon: Webhook },
    { key: 'analytics', label: 'Analytiek', icon: BarChart3 },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Beheer</h1>
        <p className="text-sm text-gray-500 mt-1">
          Beleid, gebruikers, thema's, databronnen en audit beheren
        </p>
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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

      {activeTab === 'policies' && <PolicyEditor />}
      {activeTab === 'users' && <UserManagement />}
      {activeTab === 'themes' && <ThemeManager />}
      {activeTab === 'readiness' && <ThemeReadiness />}
      {activeTab === 'data' && <DataSourceManager />}
      {activeTab === 'quality' && <DataQualityPanel />}
      {activeTab === 'import' && <DataImportPanel />}
      {activeTab === 'sync' && <DataSyncPanel />}
      {activeTab === 'audit' && <AuditLog />}
      {activeTab === 'apikeys' && <ApiKeyManager />}
      {activeTab === 'webhooks' && <WebhookManager />}
      {activeTab === 'analytics' && <AnalyticsDashboard />}
    </div>
  );
}
