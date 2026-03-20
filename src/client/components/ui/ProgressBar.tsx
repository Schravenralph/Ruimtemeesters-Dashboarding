interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
  color?: string;
  showPercent?: boolean;
  size?: 'sm' | 'md';
}

export function ProgressBar({
  value,
  label,
  color = '#3b82f6',
  showPercent = true,
  size = 'md',
}: ProgressBarProps) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const height = size === 'sm' ? 'h-1.5' : 'h-2.5';

  return (
    <div>
      {(label || showPercent) && (
        <div className="flex justify-between mb-1">
          {label && <span className="text-xs text-gray-600">{label}</span>}
          {showPercent && <span className="text-xs text-gray-500">{clampedValue}%</span>}
        </div>
      )}
      <div className={`w-full ${height} rounded-full bg-gray-200`}>
        <div
          className={`${height} rounded-full transition-all duration-500`}
          style={{ width: `${clampedValue}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
