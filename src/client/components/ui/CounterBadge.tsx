interface CounterBadgeProps {
  count: number;
  max?: number;
  variant?: 'default' | 'primary' | 'danger';
}

const variants = {
  default: 'bg-gray-500',
  primary: 'bg-blue-600',
  danger: 'bg-red-600',
};

/**
 * Numeric counter badge for notification counts, item counts, etc.
 */
export function CounterBadge({ count, max = 99, variant = 'default' }: CounterBadgeProps) {
  if (count <= 0) return null;

  const displayCount = count > max ? `${max}+` : String(count);

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full ${variants[variant]} text-white text-xs font-bold min-w-[18px] h-[18px] px-1`}
      aria-label={`${count} items`}
    >
      {displayCount}
    </span>
  );
}
