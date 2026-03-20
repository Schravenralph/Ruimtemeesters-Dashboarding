import { Info, AlertTriangle, CheckCircle, XCircle, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface InfoBoxProps {
  children: ReactNode;
  variant?: 'info' | 'warning' | 'success' | 'error';
  title?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const variants: Record<string, { bg: string; border: string; icon: LucideIcon; iconColor: string }> = {
  info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: Info, iconColor: 'text-blue-500' },
  warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: AlertTriangle, iconColor: 'text-yellow-500' },
  success: { bg: 'bg-green-50', border: 'border-green-200', icon: CheckCircle, iconColor: 'text-green-500' },
  error: { bg: 'bg-red-50', border: 'border-red-200', icon: XCircle, iconColor: 'text-red-500' },
};

export function InfoBox({ children, variant = 'info', title, dismissible, onDismiss }: InfoBoxProps) {
  const style = variants[variant];
  const Icon = style.icon;

  return (
    <div className={`rounded-lg border ${style.bg} ${style.border} p-4 mb-4`}>
      <div className="flex gap-3">
        <Icon className={`h-5 w-5 ${style.iconColor} shrink-0 mt-0.5`} />
        <div className="flex-1">
          {title && <h4 className="text-sm font-semibold text-gray-900 mb-1">{title}</h4>}
          <div className="text-sm text-gray-700">{children}</div>
        </div>
        {dismissible && onDismiss && (
          <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 shrink-0">
            <XCircle className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
