import React from 'react';
import { Loader2, ChevronDown } from 'lucide-react';

interface LoadMoreProps {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  totalItems?: number;
  currentItems?: number;
  className?: string;
  variant?: 'button' | 'auto';
}

const LoadMore: React.FC<LoadMoreProps> = ({
  hasMore,
  isLoading,
  onLoadMore,
  totalItems,
  currentItems,
  className = '',
  variant = 'button'
}) => {
  // Auto-loading with intersection observer
  const loadMoreRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (variant !== 'auto' || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [variant, hasMore, isLoading, onLoadMore]);

  if (!hasMore && !isLoading) {
    return (
      <div className={`text-center py-4 ${className}`}>
        <div className="text-gray-400 text-sm">
          {totalItems && currentItems ? (
            `All ${totalItems} activities loaded`
          ) : (
            'No more activities to load'
          )}
        </div>
      </div>
    );
  }

  if (variant === 'auto') {
    return (
      <div ref={loadMoreRef} className={`text-center py-4 ${className}`}>
        {isLoading && (
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            <span className="text-gray-400 text-sm">Loading more activities...</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`text-center py-4 ${className}`}>
      {isLoading ? (
        <div className="flex items-center justify-center space-x-2 px-4 py-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          <span className="text-gray-400 text-sm">Loading...</span>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            onClick={onLoadMore}
            disabled={!hasMore}
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors mx-auto"
          >
            <ChevronDown className="w-4 h-4" />
            <span>Load More Activities</span>
          </button>
          {totalItems && currentItems && (
            <div className="text-gray-400 text-xs">
              Showing {currentItems} of {totalItems} activities
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LoadMore;