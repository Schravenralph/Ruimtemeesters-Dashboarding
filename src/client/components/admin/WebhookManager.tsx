import { useState, useEffect } from 'react';
import { Webhook, Plus, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { LoadingOverlay } from '../ui/Spinner';
import { useToast } from '../ui/Toast';
import { api } from '../../services/api/client';
import { formatDateTime } from '../../utils/format';

interface WebhookItem {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  lastTriggeredAt: string | null;
  failureCount: number;
  createdAt: string;
}

export function WebhookManager() {
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newEvents, setNewEvents] = useState<string[]>([]);
  const { showToast } = useToast();

  const availableEvents = [
    'data.import', 'data.export', 'dashboard.create', 'dashboard.share',
    'user.login', 'user.register', 'policy.create', 'policy.delete',
  ];

  useEffect(() => {
    api.get<{ webhooks: WebhookItem[] }>('/webhooks')
      .then(({ webhooks }) => setWebhooks(webhooks))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  async function handleCreate() {
    if (!newName || !newUrl || newEvents.length === 0) return;
    try {
      await api.post('/webhooks', { name: newName, url: newUrl, events: newEvents });
      showToast('success', 'Webhook aangemaakt');
      setNewName(''); setNewUrl(''); setNewEvents([]); setShowCreate(false);
      // Reload
      const { webhooks } = await api.get<{ webhooks: WebhookItem[] }>('/webhooks');
      setWebhooks(webhooks);
    } catch {
      showToast('error', 'Aanmaken mislukt');
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/webhooks/${id}`);
      setWebhooks(prev => prev.filter(w => w.id !== id));
      showToast('success', 'Webhook verwijderd');
    } catch {
      showToast('error', 'Verwijderen mislukt');
    }
  }

  if (isLoading) return <LoadingOverlay />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Webhooks ({webhooks.length})</h3>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-4 w-4" /> Nieuwe webhook
        </Button>
      </div>

      {showCreate && (
        <Card>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Naam</label>
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Mijn webhook" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
              <input type="url" value={newUrl} onChange={(e) => setNewUrl(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="https://example.com/webhook" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Events</label>
              <div className="flex flex-wrap gap-2">
                {availableEvents.map(event => (
                  <label key={event} className="flex items-center gap-1.5 text-sm">
                    <input type="checkbox" checked={newEvents.includes(event)}
                      onChange={(e) => setNewEvents(prev => e.target.checked ? [...prev, event] : prev.filter(e => e !== event))}
                      className="rounded" />
                    {event}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={!newName || !newUrl || newEvents.length === 0}>Aanmaken</Button>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>Annuleren</Button>
            </div>
          </div>
        </Card>
      )}

      {webhooks.length === 0 ? (
        <Card><div className="py-8 text-center text-gray-500">Geen webhooks geconfigureerd.</div></Card>
      ) : (
        <div className="space-y-2">
          {webhooks.map(wh => (
            <Card key={wh.id} padding={false}>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  {wh.isActive ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{wh.name}</p>
                    <p className="text-xs text-gray-500 font-mono">{wh.url}</p>
                    <div className="flex gap-1 mt-1">
                      {wh.events.map(e => (
                        <span key={e} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{e}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {wh.lastTriggeredAt && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDateTime(wh.lastTriggeredAt)}
                    </span>
                  )}
                  {wh.failureCount > 0 && (
                    <span className="text-xs text-red-500">{wh.failureCount} fouten</span>
                  )}
                  <button onClick={() => handleDelete(wh.id)} className="text-gray-400 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
