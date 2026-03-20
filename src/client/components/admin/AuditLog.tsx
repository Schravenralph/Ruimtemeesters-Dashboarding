import { useState, useEffect } from 'react';
import { Clock, User, Activity } from 'lucide-react';
import { LoadingOverlay } from '../ui/Spinner';
import { Button } from '../ui/Button';
import { api } from '../../services/api/client';

interface AuditEntry {
  id: number;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

const actionColors: Record<string, string> = {
  login: 'bg-green-100 text-green-700',
  logout: 'bg-gray-100 text-gray-700',
  create: 'bg-blue-100 text-blue-700',
  update: 'bg-yellow-100 text-yellow-700',
  delete: 'bg-red-100 text-red-700',
  export: 'bg-purple-100 text-purple-700',
  share: 'bg-indigo-100 text-indigo-700',
};

function getActionColor(action: string): string {
  for (const [key, color] of Object.entries(actionColors)) {
    if (action.toLowerCase().includes(key)) return color;
  }
  return 'bg-gray-100 text-gray-700';
}

export function AuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 25;

  useEffect(() => {
    loadEntries();
  }, [offset]);

  async function loadEntries() {
    setIsLoading(true);
    try {
      const { entries } = await api.get<{ entries: AuditEntry[] }>('/audit', {
        limit,
        offset,
      });
      setEntries(entries);
    } catch {
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) return <LoadingOverlay />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Audit Log</h2>
        <Button variant="ghost" size="sm" onClick={loadEntries}>
          Vernieuwen
        </Button>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
          Geen audit log entries gevonden.
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map(entry => (
            <div key={entry.id} className="rounded-lg border border-gray-200 bg-white px-4 py-3 flex items-start gap-3">
              <Activity className="h-4 w-4 text-gray-400 mt-1 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getActionColor(entry.action)}`}>
                    {entry.action}
                  </span>
                  <span className="text-sm text-gray-700">{entry.resource_type}</span>
                  {entry.resource_id && (
                    <code className="text-xs bg-gray-100 rounded px-1.5 py-0.5 text-gray-600">
                      {entry.resource_id}
                    </code>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  {entry.user_name && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {entry.user_name} ({entry.user_email})
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(entry.created_at).toLocaleString('nl-NL')}
                  </span>
                  {entry.ip_address && <span>IP: {entry.ip_address}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <Button
          variant="ghost"
          size="sm"
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - limit))}
        >
          Vorige
        </Button>
        <span className="text-sm text-gray-500">
          {offset + 1} - {offset + entries.length}
        </span>
        <Button
          variant="ghost"
          size="sm"
          disabled={entries.length < limit}
          onClick={() => setOffset(offset + limit)}
        >
          Volgende
        </Button>
      </div>
    </div>
  );
}
