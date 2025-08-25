import React from 'react';
import { Activity, ActivityTracker, PaginatedActivities } from '../useServices/useActivityTracker';
import { Clock, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import Pagination from './Pagination';
import LoadMore from './LoadMore';

interface ActivityTableProps {
  activities: Activity[];
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  showUserColumn?: boolean;
  showDAOColumn?: boolean;
  showAmountColumn?: boolean;
  maxRows?: number;
  className?: string;
  // Pagination props
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    limit: number;
  };
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  onLoadMore?: () => void;
  paginationType?: 'pagination' | 'loadMore' | 'infinite' | 'none';
  showPaginationInfo?: boolean;
}

const ActivityTable: React.FC<ActivityTableProps> = ({
  activities,
  isLoading = false,
  error = null,
  onRefresh,
  showUserColumn = false,
  showDAOColumn = false,
  showAmountColumn = true,
  maxRows,
  className = '',
  pagination,
  onPageChange,
  onLimitChange,
  onLoadMore,
  paginationType = 'none',
  showPaginationInfo = true
}) => {
  const displayActivities = maxRows ? activities.slice(0, maxRows) : activities;

  const truncateAddress = (address: string) => {
    if (!address) return 'Unknown';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatAmount = (amount?: number) => {
    if (!amount) return '-';
    return `${amount.toFixed(2)} MOVE`;
  };

  if (error) {
    return (
      <div className={`bg-red-500/10 border border-red-500/30 rounded-xl p-6 ${className}`}>
        <div className="flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <div>
            <p className="text-red-300 font-medium">Error Loading Activities</p>
            <p className="text-red-200 text-sm">{error}</p>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="mt-2 px-3 py-1 bg-red-600/20 text-red-300 rounded text-sm hover:bg-red-600/30 transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
        <div className="flex items-center space-x-2">
          {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              title="Refresh Activities"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block">
        <div className="professional-card rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-4 px-4 font-medium text-gray-300">Type</th>
                <th className="text-left py-4 px-4 font-medium text-gray-300">Description</th>
                {showUserColumn && (
                  <th className="text-left py-4 px-4 font-medium text-gray-300">User</th>
                )}
                {showDAOColumn && (
                  <th className="text-left py-4 px-4 font-medium text-gray-300">DAO</th>
                )}
                {showAmountColumn && (
                  <th className="text-right py-4 px-4 font-medium text-gray-300">Amount</th>
                )}
                <th className="text-right py-4 px-4 font-medium text-gray-300">Timestamp</th>
                <th className="text-center py-4 px-4 font-medium text-gray-300">Tx</th>
              </tr>
            </thead>
            <tbody>
              {displayActivities.map((activity, index) => {
                const display = ActivityTracker.getActivityDisplay(activity);
                return (
                  <tr key={activity.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${display.color}`}>
                        {display.icon} {display.displayType}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="text-white font-medium">{activity.title}</p>
                        <p className="text-gray-400 text-xs">{activity.description}</p>
                      </div>
                    </td>
                    {showUserColumn && (
                      <td className="py-4 px-4">
                        <span className="text-white font-mono text-xs">
                          {truncateAddress(activity.user)}
                        </span>
                      </td>
                    )}
                    {showDAOColumn && (
                      <td className="py-4 px-4">
                        <span className="text-white font-mono text-xs">
                          {activity.daoName || truncateAddress(activity.dao)}
                        </span>
                      </td>
                    )}
                    {showAmountColumn && (
                      <td className="py-4 px-4 text-right">
                        <span className={`font-medium ${
                          activity.type === 'unstake' || activity.type === 'treasury_withdrawal' 
                            ? 'text-red-400' 
                            : activity.amount 
                              ? 'text-green-400' 
                              : 'text-gray-400'
                        }`}>
                          {activity.type === 'unstake' || activity.type === 'treasury_withdrawal' ? '-' : ''}
                          {formatAmount(activity.amount)}
                        </span>
                      </td>
                    )}
                    <td className="py-4 px-4 text-right">
                      <div className="text-right">
                        <div className="text-white text-sm font-medium">
                          {(() => {
                            // Handle different timestamp formats (microseconds, milliseconds, seconds)
                            let date;
                            if (activity.timestamp > 1e12) {
                              // Microseconds (Aptos format)
                              date = new Date(activity.timestamp / 1000);
                            } else if (activity.timestamp > 1e10) {
                              // Milliseconds
                              date = new Date(activity.timestamp);
                            } else {
                              // Seconds
                              date = new Date(activity.timestamp * 1000);
                            }
                            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                          })()}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <a
                        href={ActivityTracker.getActivityExplorerUrl(activity)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                        title="View on Explorer"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="sm:hidden space-y-3">
        {displayActivities.map((activity) => {
          const display = ActivityTracker.getActivityDisplay(activity);
          return (
            <div key={activity.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-start justify-between mb-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${display.color}`}>
                  {display.icon} {display.displayType}
                </span>
                <div className="text-right">
                  <div className="text-white text-sm font-medium">
                    {(() => {
                      // Handle different timestamp formats (microseconds, milliseconds, seconds)
                      let date;
                      if (activity.timestamp > 1e12) {
                        // Microseconds (Aptos format)
                        date = new Date(activity.timestamp / 1000);
                      } else if (activity.timestamp > 1e10) {
                        // Milliseconds
                        date = new Date(activity.timestamp);
                      } else {
                        // Seconds
                        date = new Date(activity.timestamp * 1000);
                      }
                      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    })()}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div>
                  <p className="text-white font-medium text-sm">{activity.title}</p>
                  <p className="text-gray-400 text-xs">{activity.description}</p>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    {showUserColumn && (
                      <p className="text-xs text-gray-400">
                        User: <span className="text-white font-mono">{truncateAddress(activity.user)}</span>
                      </p>
                    )}
                    {showDAOColumn && (
                      <p className="text-xs text-gray-400">
                        DAO: <span className="text-white font-mono">{activity.daoName || truncateAddress(activity.dao)}</span>
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {showAmountColumn && activity.amount && (
                      <span className={`text-sm font-medium ${
                        activity.type === 'unstake' || activity.type === 'treasury_withdrawal' 
                          ? 'text-red-400' 
                          : 'text-green-400'
                      }`}>
                        {activity.type === 'unstake' || activity.type === 'treasury_withdrawal' ? '-' : ''}
                        {formatAmount(activity.amount)}
                      </span>
                    )}
                    <a
                      href={ActivityTracker.getActivityExplorerUrl(activity)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                      title="View on Explorer"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {!isLoading && displayActivities.length === 0 && (
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">No recent activities</p>
          <p className="text-sm text-gray-500 mt-1">Activities will appear here as they happen</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && displayActivities.length === 0 && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading activities...</p>
        </div>
      )}

      {/* Show More Indicator */}
      {maxRows && activities.length > maxRows && paginationType === 'none' && (
        <div className="text-center py-2">
          <p className="text-sm text-gray-400">
            Showing {maxRows} of {activities.length} activities
          </p>
        </div>
      )}

      {/* Pagination Controls */}
      {paginationType === 'pagination' && pagination && onPageChange && (
        <div className="mt-6">
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            hasNextPage={pagination.hasNextPage}
            hasPreviousPage={pagination.hasPreviousPage}
            limit={pagination.limit}
            onPageChange={onPageChange}
            onLimitChange={onLimitChange}
            showItemsInfo={showPaginationInfo}
            showLimitSelector={!!onLimitChange}
          />
        </div>
      )}

      {/* Load More Button */}
      {(paginationType === 'loadMore' || paginationType === 'infinite') && onLoadMore && pagination && (
        <div className="mt-4">
          <LoadMore
            hasMore={pagination.hasNextPage}
            isLoading={isLoading}
            onLoadMore={onLoadMore}
            totalItems={pagination.totalItems}
            currentItems={activities.length}
            variant={paginationType === 'infinite' ? 'auto' : 'button'}
          />
        </div>
      )}
    </div>
  );
};

export default ActivityTable;