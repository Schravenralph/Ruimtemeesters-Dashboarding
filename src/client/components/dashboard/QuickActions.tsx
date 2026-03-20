import { useNavigate } from 'react-router-dom';
import {
  Download, Upload, BarChart3, FileText, Printer, Settings,
  Share2, Plus, type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface QuickAction {
  label: string;
  icon: LucideIcon;
  href: string;
  roles?: string[];
}

const actions: QuickAction[] = [
  { label: 'Data downloaden', icon: Download, href: '/download' },
  { label: 'Rapport genereren', icon: FileText, href: '/rapport' },
  { label: 'Nieuw dashboard', icon: Plus, href: '/mijn-dashboards', roles: ['admin', 'editor', 'viewer'] },
  { label: 'Afdrukken', icon: Printer, href: '#print' },
  { label: 'Data importeren', icon: Upload, href: '/admin', roles: ['admin', 'editor'] },
  { label: 'Instellingen', icon: Settings, href: '/instellingen', roles: ['admin', 'editor', 'viewer'] },
];

export function QuickActions() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const filteredActions = actions.filter(action => {
    if (!action.roles) return true;
    if (!user) return false;
    return action.roles.includes(user.role);
  });

  function handleClick(href: string) {
    if (href === '#print') {
      window.print();
    } else {
      navigate(href);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {filteredActions.map(action => (
        <button
          key={action.href}
          onClick={() => handleClick(action.href)}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors"
        >
          <action.icon className="h-3.5 w-3.5" />
          {action.label}
        </button>
      ))}
    </div>
  );
}
