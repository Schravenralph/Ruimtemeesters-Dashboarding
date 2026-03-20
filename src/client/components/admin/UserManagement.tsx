import { useState, useEffect } from 'react';
import { Users, Shield, Trash2, Key, Save, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { LoadingOverlay } from '../ui/Spinner';
import { api } from '../../services/api/client';

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string | null;
  organizationName: string | null;
  attributes: Record<string, string>;
  createdAt: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
}

export function UserManagement() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [resetPasswordId, setResetPasswordId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<{ users: UserRow[] }>('/users'),
      api.get<{ organizations: Organization[] }>('/users/organizations'),
    ]).then(([{ users }, { organizations }]) => {
      setUsers(users);
      setOrganizations(organizations);
    }).finally(() => setIsLoading(false));
  }, []);

  async function handleUpdateRole(userId: string) {
    await api.put(`/users/${userId}`, { role: editRole });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: editRole } : u));
    setEditingUser(null);
  }

  async function handleDelete(userId: string) {
    if (!confirm('Weet je zeker dat je deze gebruiker wilt verwijderen?')) return;
    await api.delete(`/users/${userId}`);
    setUsers(prev => prev.filter(u => u.id !== userId));
  }

  async function handleResetPassword(userId: string) {
    if (newPassword.length < 8) {
      alert('Wachtwoord moet minimaal 8 tekens zijn');
      return;
    }
    await api.post(`/users/${userId}/reset-password`, { password: newPassword });
    setResetPasswordId(null);
    setNewPassword('');
    alert('Wachtwoord gereset');
  }

  if (isLoading) return <LoadingOverlay />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Gebruikers ({users.length})</h2>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Naam</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">E-mail</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organisatie</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attributen</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aangemaakt</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acties</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                <td className="px-4 py-3">
                  {editingUser === user.id ? (
                    <div className="flex items-center gap-2">
                      <Select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        options={[
                          { value: 'admin', label: 'Admin' },
                          { value: 'editor', label: 'Editor' },
                          { value: 'viewer', label: 'Viewer' },
                          { value: 'guest', label: 'Gast' },
                        ]}
                        className="text-xs"
                      />
                      <button onClick={() => handleUpdateRole(user.id)} className="text-green-600 hover:text-green-700">
                        <Save className="h-4 w-4" />
                      </button>
                      <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingUser(user.id); setEditRole(user.role); }}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'editor' ? 'bg-blue-100 text-blue-700' :
                        user.role === 'viewer' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {user.role}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {user.organizationName || '-'}
                </td>
                <td className="px-4 py-3">
                  {Object.entries(user.attributes).length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(user.attributes).map(([k, v]) => (
                        <span key={k} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                          {k}: {v}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString('nl-NL')}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setResetPasswordId(user.id)}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title="Wachtwoord resetten"
                    >
                      <Key className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600"
                      title="Verwijderen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Password Reset Modal */}
      {resetPasswordId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-96 rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold mb-4">Wachtwoord resetten</h3>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nieuw wachtwoord (min. 8 tekens)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-4"
              minLength={8}
              autoFocus
            />
            <div className="flex gap-2">
              <Button onClick={() => handleResetPassword(resetPasswordId)}>Resetten</Button>
              <Button variant="ghost" onClick={() => { setResetPasswordId(null); setNewPassword(''); }}>
                Annuleren
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
