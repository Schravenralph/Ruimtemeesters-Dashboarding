import { SkeletonCard, SkeletonTileGrid } from '../ui/Skeleton';

interface LoadingStateProps {
  type?: 'dashboard' | 'tile' | 'page' | 'table';
}

/**
 * Contextual loading states for different dashboard elements.
 */
export function LoadingState({ type = 'dashboard' }: LoadingStateProps) {
  switch (type) {
    case 'dashboard':
      return (
        <div className="space-y-6">
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-96 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-32 bg-gray-200 rounded-lg animate-pulse" />
              <div className="h-9 w-28 bg-gray-200 rounded-lg animate-pulse" />
            </div>
          </div>
          {/* Filter bar skeleton */}
          <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          {/* Tiles skeleton */}
          <SkeletonTileGrid />
        </div>
      );

    case 'tile':
      return <SkeletonCard />;

    case 'page':
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-blue-600 mb-4" />
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
      );

    case 'table':
      return (
        <div className="space-y-2">
          <div className="h-10 bg-gray-100 rounded animate-pulse" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-50 rounded animate-pulse" />
          ))}
        </div>
      );
  }
}
