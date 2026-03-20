interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'warning' | 'error';
  label?: string;
  size?: 'sm' | 'md';
}

const statusColors = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
};

const statusLabels = {
  online: 'Online',
  offline: 'Offline',
  warning: 'Waarschuwing',
  error: 'Fout',
};

const dotSizes = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
};

export function StatusIndicator({ status, label, size = 'sm' }: StatusIndicatorProps) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className={`${dotSizes[size]} rounded-full ${statusColors[status]} ${
        status === 'online' ? 'animate-pulse' : ''
      }`} />
      {label !== undefined ? (
        <span className="text-xs text-gray-600">{label}</span>
      ) : (
        <span className="text-xs text-gray-600">{statusLabels[status]}</span>
      )}
    </div>
  );
}
