import { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Copy, Eye, EyeOff, Clock } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { LoadingOverlay } from '../ui/Spinner';
import { useToast } from '../ui/Toast';
import { CopyButton } from '../ui/CopyButton';
import { api } from '../../services/api/client';
import { formatDateTime } from '../../utils/format';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    api.get<{ keys: ApiKey[] }>('/api-keys')
      .then(({ keys }) => setKeys(keys))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  async function handleCreate() {
    if (!newName) return;
    try {
      const result = await api.post<{ key: string; id: string }>('/api-keys', {
        name: newName,
        scopes: ['read'],
      });
      setNewKey(result.key);
      showToast('success', 'API sleutel aangemaakt. Kopieer hem nu!');
      setNewName('');

      // Reload list
      const { keys } = await api.get<{ keys: ApiKey[] }>('/api-keys');
      setKeys(keys);
    } catch {
      showToast('error', 'Aanmaken mislukt');
    }
  }

  async function handleRevoke(id: string) {
    try {
      await api.delete(`/api-keys/${id}`);
      setKeys(prev => prev.map(k => k.id === id ? { ...k, isActive: false } : k));
      showToast('success', 'API sleutel ingetrokken');
    } catch {
      showToast('error', 'Intrekken mislukt');
    }
  }

  if (isLoading) return <LoadingOverlay />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">API Sleutels ({keys.length})</h3>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> Nieuwe sleutel
        </Button>
      </div>

      {/* New key display (shown once) */}
      {newKey && (
        <div className="rounded-lg border-2 border-yellow-300 bg-yellow-50 p-4">
          <p className="text-sm font-semibold text-yellow-800 mb-2">
            Bewaar deze sleutel veilig — hij wordt niet opnieuw getoond!
          </p>
          <div className="flex gap-2">
            <code className="flex-1 rounded bg-white border px-3 py-2 text-sm font-mono text-gray-900 break-all">
              {newKey}
            </code>
            <CopyButton text={newKey} label="Kopieer" />
          </div>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setNewKey(null)}>
            Sluiten (ik heb hem opgeslagen)
          </Button>
        </div>
      )}

      {/* Create form */}
      {showCreate && !newKey && (
        <Card>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Naam voor deze sleutel..."
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              autoFocus
            />
            <Button onClick={handleCreate} disabled={!newName}>Aanmaken</Button>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Annuleren</Button>
          </div>
        </Card>
      )}

      {/* Key list */}
      {keys.length === 0 ? (
        <Card><div className="py-8 text-center text-gray-500">Geen API sleutels.</div></Card>
      ) : (
        <div className="space-y-2">
          {keys.map(key => (
            <Card key={key.id} padding={false}>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <Key className={`h-4 w-4 ${key.isActive ? 'text-green-500' : 'text-gray-400'}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{key.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                      <code>{key.prefix}...</code>
                      <span>{key.scopes.join(', ')}</span>
                      {!key.isActive && <span className="text-red-500">Ingetrokken</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {key.lastUsedAt && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Laatst gebruikt: {formatDateTime(key.lastUsedAt)}
                    </span>
                  )}
                  {key.isActive && (
                    <button onClick={() => handleRevoke(key.id)} className="text-gray-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
