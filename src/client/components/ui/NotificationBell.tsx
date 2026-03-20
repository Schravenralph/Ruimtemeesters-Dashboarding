import { useState, useEffect, useCallback } from 'react';
import { Bell, Check, ExternalLink } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api/client';
import { formatDateTime } from '../../utils/format';

interface Notification {
  id: string;
  title: string;
  message: string | null;
  type: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

export function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const { notifications, unreadCount } = await api.get<{
        notifications: Notification[];
        unreadCount: number;
      }>('/notifications');
      setNotifications(notifications);
      setUnreadCount(unreadCount);
    } catch {}
  }, [isAuthenticated]);

  useEffect(() => {
    loadNotifications();
    // Poll every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  async function markAllRead() {
    await api.put('/notifications/all/read');
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  async function markRead(id: string) {
    await api.put(`/notifications/${id}/read`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }

  if (!isAuthenticated) return null;

  const typeColors: Record<string, string> = {
    success: 'text-green-500',
    error: 'text-red-500',
    warning: 'text-yellow-500',
    info: 'text-blue-500',
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 hover:bg-gray-100"
      >
        <Bell className="h-5 w-5 text-gray-500" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-lg z-50">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-900">Meldingen</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                >
                  <Check className="h-3 w-3" />
                  Alles gelezen
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="p-4 text-sm text-gray-500 text-center">Geen meldingen</p>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className={`border-b border-gray-50 px-4 py-3 hover:bg-gray-50 ${
                      !n.isRead ? 'bg-blue-50/50' : ''
                    }`}
                    onClick={() => !n.isRead && markRead(n.id)}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${
                        !n.isRead ? 'bg-blue-500' : 'bg-transparent'
                      }`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">{n.title}</p>
                        {n.message && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">{formatDateTime(n.createdAt)}</p>
                      </div>
                      {n.link && (
                        <a
                          href={n.link}
                          className="shrink-0 text-gray-400 hover:text-blue-600"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
