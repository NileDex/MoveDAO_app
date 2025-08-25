import React from 'react';
import { Activity, OptimizedActivityTracker } from '../useServices/useOptimizedActivityTracker';
import { Clock, ExternalLink, RefreshCw, AlertCircle, Activity as ActivityIcon } from 'lucide-react';
import { getActivityColor } from '../constants/activityConstants';

interface OptimizedActivityTableProps {
  activities: Activity[];
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  showUserColumn?: boolean;
  showDAOColumn?: boolean;
  showAmountColumn?: boolean;
  maxRows?: number;
  className?: string;
  title?: string;
}

const OptimizedActivityTable: React.FC<OptimizedActivityTableProps> = ({
  activities,
  isLoading = false,
  error = null,
  onRefresh,
  showUserColumn = false,
  showDAOColumn = false,
  showAmountColumn = true,
  maxRows,
  className = '',
  title = 'Recent Activity'
}) => {
  const displayActivities = maxRows ? activities.slice(0, maxRows) : activities;

  const truncateAddress = (address: string) => {
    if (!address) return 'Unknown';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatAmount = (amount?: number) => {
    if (!amount) return '-';
    return `${amount.toFixed(4)} MOVE`;
  };

  const getExplorerUrl = (activity: Activity) => {
    return `https://explorer.movementnetwork.xyz/?network=bardock+testnet/txn/${activity.transactionHash}`;
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

  if (isLoading && displayActivities.length === 0) {
    return (
      <div className={`bg-white/5 border border-white/10 rounded-xl p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <ActivityIcon className="w-5 h-5" />
            {title}
          </h3>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
                <div className="w-8 h-8 bg-gray-600/50 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-600/50 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-600/30 rounded w-1/2"></div>
                </div>
                <div className="w-16 h-4 bg-gray-600/50 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white/5 border border-white/10 rounded-xl p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <ActivityIcon className="w-5 h-5" />
          {title}
          {displayActivities.length > 0 && (
            <span className="text-sm text-gray-400">({displayActivities.length})</span>
          )}
        </h3>
        <div className="flex items-center space-x-2">
          {isLoading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50 rounded-lg hover:bg-white/5"
              title="Refresh Activities"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Activities List */}
      {displayActivities.length === 0 ? (
        <div className="text-center py-8">
          <ActivityIcon className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No recent activities found</p>
          <p className="text-gray-500 text-xs mt-1">
            Activities will appear here as users interact with the DAO
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayActivities.map((activity, index) => {
            const display = OptimizedActivityTracker.getActivityDisplay(activity);
            
            return (
              <div
                key={activity.id || index}
                className="group flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
              >
                {/* Activity Icon */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg border ${display.color}`}>
                  {display.icon}
                </div>

                {/* Activity Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-white font-medium text-sm">{activity.title}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${display.color}`}>
                      {display.displayType}
                    </span>
                  </div>
                  
                  <p className="text-gray-400 text-xs mt-0.5 truncate">
                    {activity.description}
                  </p>
                  
                  <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                    {/* User */}
                    {showUserColumn && (
                      <span className="flex items-center space-x-1">
                        <span>👤</span>
                        <span>{truncateAddress(activity.user)}</span>
                      </span>
                    )}
                    
                    {/* DAO */}
                    {showDAOColumn && (
                      <span className="flex items-center space-x-1">
                        <span>🏛️</span>
                        <span>{truncateAddress(activity.dao)}</span>
                      </span>
                    )}
                    
                    {/* Amount */}
                    {showAmountColumn && activity.amount && (
                      <span className="flex items-center space-x-1 text-green-400">
                        <span>💰</span>
                        <span>{formatAmount(activity.amount)}</span>
                      </span>
                    )}
                    
                    {/* Time */}
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{OptimizedActivityTracker.formatTimeAgo(activity.timestamp)}</span>
                    </span>
                  </div>
                </div>

                {/* Transaction Link */}
                <div className="flex-shrink-0">
                  {activity.transactionHash && activity.transactionHash !== '0x' && (
                    <a
                      href={getExplorerUrl(activity)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5 opacity-0 group-hover:opacity-100"
                      title="View on Explorer"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Show More Link */}
      {maxRows && activities.length > maxRows && (
        <div className="text-center mt-4 pt-4 border-t border-white/10">
          <p className="text-gray-400 text-sm">
            Showing {maxRows} of {activities.length} activities
          </p>
        </div>
      )}
    </div>
  );
};

export default OptimizedActivityTable;