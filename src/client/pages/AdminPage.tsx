import { useState } from 'react';
import { Shield, Users, Database, ClipboardList } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserManagement } from '../components/admin/UserManagement';
import { PolicyEditor } from '../components/admin/PolicyEditor';
import { AuditLog } from '../components/admin/AuditLog';
import { DataSourceManager } from '../components/admin/DataSourceManager';

export function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'policies' | 'users' | 'data' | 'audit'>('policies');

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
    { key: 'audit' as const, label: 'Audit Log', icon: ClipboardList },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Beheer</h1>
        <p className="text-sm text-gray-500 mt-1">
          RBAC/ABAC beleid, gebruikers, databronnen en audit log beheren
        </p>
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
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

      {activeTab === 'policies' && <PolicyEditor />}
      {activeTab === 'users' && <UserManagement />}
      {activeTab === 'data' && <DataSourceManager />}
      {activeTab === 'audit' && <AuditLog />}
    </div>
  );
}
