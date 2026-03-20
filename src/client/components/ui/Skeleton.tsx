interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
}

export function Skeleton({ className = '', width, height }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200 ${className}`}
      style={{ width, height }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>
      <Skeleton className="h-[200px] w-full" />
    </div>
  );
}

export function SkeletonTileGrid() {
  return (
    <div className="grid grid-cols-12 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="col-span-6" style={{ gridRow: `span 4` }}>
          <SkeletonCard />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 flex gap-4">
        {[...Array(cols)].map((_, i) => (
          <Skeleton key={i} className="h-4" width={`${80 + Math.random() * 60}px`} />
        ))}
      </div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="px-4 py-3 flex gap-4 border-t border-gray-100">
          {[...Array(cols)].map((_, j) => (
            <Skeleton key={j} className="h-4" width={`${60 + Math.random() * 80}px`} />
          ))}
        </div>
      ))}
    </div>
  );
}
