import { useState, useEffect } from 'react';
import { Activity, User, BarChart3, Upload, Shield, Clock } from 'lucide-react';
import { api } from '../../services/api/client';
import { useAuth } from '../../contexts/AuthContext';

interface ActivityItem {
  id: number;
  user_name: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  created_at: string;
}

const actionIcons: Record<string, typeof Activity> = {
  login: User,
  create: BarChart3,
  import: Upload,
  policy: Shield,
};

function getIcon(action: string) {
  for (const [key, Icon] of Object.entries(actionIcons)) {
    if (action.toLowerCase().includes(key)) return Icon;
  }
  return Activity;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'zojuist';
  if (minutes < 60) return `${minutes}m geleden`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}u geleden`;
  const days = Math.floor(hours / 24);
  return `${days}d geleden`;
}

export function ActivityFeed() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'admin') {
      setIsLoading(false);
      return;
    }

    api.get<{ entries: ActivityItem[] }>('/audit', { limit: 10 })
      .then(({ entries }) => setActivities(entries))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [user]);

  if (!user || user.role !== 'admin' || isLoading) return null;
  if (activities.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4 text-gray-500" />
        <h4 className="text-sm font-semibold text-gray-900">Recente activiteit</h4>
      </div>

      <div className="space-y-2">
        {activities.slice(0, 5).map(item => {
          const Icon = getIcon(item.action);
          return (
            <div key={item.id} className="flex items-start gap-2.5 text-sm">
              <Icon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-gray-700 truncate">
                  <span className="font-medium">{item.user_name || 'Systeem'}</span>
                  {' '}
                  <span className="text-gray-500">{item.action}</span>
                  {' '}
                  <span className="text-gray-600">{item.resource_type}</span>
                </p>
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" />
                  {timeAgo(item.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
