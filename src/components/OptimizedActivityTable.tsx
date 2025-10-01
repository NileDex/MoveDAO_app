import React, { useState } from 'react';
import { Activity, OptimizedActivityTracker } from '../useServices/useOptimizedActivityTracker';
import { Clock, ExternalLink, RefreshCw, AlertCircle, Activity as ActivityIcon, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { getActivityColor } from '../constants/activityConstants';
import { useGetProfile, getDisplayNameOrAddress, getAvatarUrlOrDefault } from '../useServices/useProfile';
import { truncateAddress } from '../utils/addressUtils';

interface OptimizedActivityTableProps {
  activities: Activity[];
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onNextPage?: () => void;
  onPrevPage?: () => void;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  showingCountText?: string; // optional custom text like "Showing 10 of 12 activities"
  showUserColumn?: boolean;
  showDAOColumn?: boolean;
  showAmountColumn?: boolean;
  showActionColumn?: boolean;
  maxRows?: number;
  className?: string;
  title?: string;
}

// User Display Component with Profile
const UserDisplay: React.FC<{ address: string; isCompact?: boolean }> = ({ address, isCompact = false }) => {
  const { data: profileData, isLoading } = useGetProfile(address || null);
  
  // Use the utility function instead of local implementation

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-6 h-6 bg-gray-600/50 rounded-full animate-pulse"></div>
        <span className="text-sm text-gray-400">...</span>
      </div>
    );
  }

  if (profileData) {
    return (
      <div className={`flex items-center space-x-2 ${isCompact ? 'max-w-[120px]' : ''}`}>
        {profileData.avatarUrl ? (
          <img 
            src={profileData.avatarUrl} 
            alt={profileData.displayName}
            className="w-6 h-6 rounded-full object-cover flex-shrink-0"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
              if (fallback) fallback.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={`w-6 h-6 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${profileData.avatarUrl ? 'hidden' : ''}`}>
          {profileData.displayName.charAt(0).toUpperCase()}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold text-white truncate">
            {profileData.displayName}
          </span>
          {!isCompact && (
            <span className="text-[10px] text-gray-400 font-mono truncate">
              {truncateAddress(address)}
            </span>
          )}
        </div>
      </div>
    );
  }

  // No profile - show address only
  return (
    <span className="text-sm text-gray-300 font-mono">{truncateAddress(address)}</span>
  );
};

const OptimizedActivityTable: React.FC<OptimizedActivityTableProps> = ({
  activities,
  isLoading = false,
  error = null,
  onRefresh,
  onNextPage,
  onPrevPage,
  hasNextPage,
  hasPrevPage,
  showingCountText,
  showUserColumn = false,
  showDAOColumn = false,
  showAmountColumn = true,
  showActionColumn = true,
  maxRows,
  className = '',
  title = 'Recent Activity'
}) => {
  const displayActivities = maxRows ? activities.slice(0, maxRows) : activities;

  // Use the utility function instead of local implementation

  const formatAmount = (amount?: number) => {
    if (!amount) return null;
    
    // Remove trailing zeros and unnecessary decimal points
    const formattedNumber = amount % 1 === 0 ? amount.toString() : parseFloat(amount.toFixed(4)).toString();
    
    return (
      <div className="flex items-center space-x-1">
        <span>{formattedNumber}</span>
        <img 
          src="https://ipfs.io/ipfs/QmUv8RVdgo6cVQzh7kxerWLatDUt4rCEFoCTkCVLuMAa27" 
          alt="MOVE"
          className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
            if (fallback) fallback.classList.remove('hidden');
          }}
        />
        <span className="hidden">MOVE</span>
      </div>
    );
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
      <div className={`p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <ActivityIcon className="w-5 h-5" />
            {title}
          </h3>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center space-x-3 p-3 rounded-lg">
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
    <div className={`bg-white/3 border border-white/5 rounded-xl p-4 w-full max-w-full overflow-hidden ${className}`} style={{ maxWidth: '100vw' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm sm:text-base md:text-lg font-semibold text-white flex items-center gap-2">
            <ActivityIcon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <span className="truncate">{title}</span>
            {displayActivities.length > 0 && (
              <span className="text-xs sm:text-sm text-gray-400 hidden sm:inline">({displayActivities.length})</span>
            )}
          </h3>
        </div>
        <div className="flex items-center space-x-1 sm:space-x-2">
          {isLoading && (
            <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-blue-400"></div>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1 sm:p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50 rounded-lg hover:bg-white/5"
              title="Refresh Activities"
            >
              <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-4 px-4 font-medium text-gray-300">Activity</th>
              <th className="text-left py-4 px-4 font-medium text-gray-300">Type</th>
              {showUserColumn && (
                <th className="text-left py-4 px-4 font-medium text-gray-300">User</th>
              )}
              {showAmountColumn && (
                <th className="text-left py-4 px-4 font-medium text-gray-300">Amount</th>
              )}
              <th className="text-left py-4 px-4 font-medium text-gray-300">Time</th>
              {showDAOColumn && (
                <th className="text-left py-4 px-4 font-medium text-gray-300 hidden md:table-cell">DAO</th>
              )}
              {showActionColumn && (
                <th className="text-left py-4 px-4 font-medium text-gray-300">Action</th>
              )}
            </tr>
          </thead>
          <tbody>
            {displayActivities.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 px-4 text-center">
                  <ActivityIcon className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No recent activities found</p>
                  <p className="text-gray-500 text-xs mt-1">
                    Activities will appear here as users interact with the DAO
                  </p>
                </td>
              </tr>
            ) : (
              displayActivities.map((activity, index) => {
                const display = OptimizedActivityTracker.getActivityDisplay(activity);
                
                return (
                  <tr key={activity.id || index} className="border-b border-white/5 hover:bg-white/5 transition-all">
                    {/* Activity */}
                    <td className="py-4 px-4">
                      <div className="min-w-0">
                        <h4 className="text-white font-medium text-sm leading-tight truncate">{activity.title}</h4>
                        <p className="text-gray-400 text-xs leading-tight truncate">{activity.description}</p>
                      </div>
                    </td>
                    
                    {/* Type */}
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs border ${display.color} whitespace-nowrap`}>
                        {display.displayType}
                      </span>
                    </td>
                    
                    {/* User */}
                    {showUserColumn && (
                      <td className="py-4 px-4">
                        <UserDisplay address={activity.user} />
                      </td>
                    )}
                    
                    {/* Amount */}
                    {showAmountColumn && (
                      <td className="py-4 px-4">
                        {activity.amount ? (
                          <div className="text-sm text-green-400 font-medium">{formatAmount(activity.amount)}</div>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                    )}
                    
                    {/* Time */}
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-1 text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs">{OptimizedActivityTracker.formatTimeAgo(activity.timestamp)}</span>
                      </div>
                    </td>
                    
                    {/* DAO */}
                    {showDAOColumn && (
                      <td className="py-4 px-4 hidden md:table-cell">
                        <span className="text-sm text-gray-300 font-mono">{truncateAddress(activity.dao)}</span>
                      </td>
                    )}
                    
                    {/* Action */}
                    {showActionColumn && (
                      <td className="py-4 px-4">
                        {activity.transactionHash && activity.transactionHash !== '0x' ? (
                          <a
                            href={getExplorerUrl(activity)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            title="View on Explorer"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        ) : (
                          <span className="text-gray-500 text-xs">-</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden">
        {displayActivities.length === 0 ? (
          <div className="text-center py-8">
            <ActivityIcon className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No recent activities found</p>
            <p className="text-gray-500 text-xs mt-1">
              Activities will appear here as users interact with the DAO
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {displayActivities.map((activity, index) => {
              const display = OptimizedActivityTracker.getActivityDisplay(activity);
              
              return (
                <div
                  key={activity.id || index}
                  className="rounded-lg p-2.5 hover:bg-white/5 transition-all border-b border-white/5 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    {/* Left Side */}
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="text-white font-medium text-sm leading-tight truncate">{activity.title}</h4>
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] border ${display.color} flex-shrink-0`}>
                            {display.displayType}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-gray-400">
                          {showUserColumn && (
                            <UserDisplay address={activity.user} isCompact={true} />
                          )}
                          {showAmountColumn && activity.amount && (
                            <div className="text-green-400 font-medium">{formatAmount(activity.amount)}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Right Side */}
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <div className="flex items-center space-x-1 text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs">{OptimizedActivityTracker.formatTimeAgo(activity.timestamp)}</span>
                      </div>
                      {showActionColumn && activity.transactionHash && activity.transactionHash !== '0x' && (
                        <a
                          href={getExplorerUrl(activity)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                          title="View on Explorer"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer: count and pagination */}
      {(showingCountText || hasNextPage || hasPrevPage || (maxRows && activities.length > maxRows)) && (
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
            {showingCountText
              ? showingCountText
              : maxRows && activities.length > maxRows
                ? `Showing ${maxRows} of ${activities.length} activities`
                : null}
          </div>

          {(onPrevPage || onNextPage) && (
            <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
              {onPrevPage && (
                <button
                  onClick={onPrevPage}
                  disabled={isLoading || !hasPrevPage}
                  className="px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-50 whitespace-nowrap inline-flex items-center gap-1"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Previous page</span>
                  <span className="sm:hidden">Prev</span>
                </button>
              )}
              {onNextPage && (
                <button
                  onClick={onNextPage}
                  disabled={isLoading || !hasNextPage}
                  className="px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-50 whitespace-nowrap inline-flex items-center gap-1"
                  aria-label="Next page"
                >
                  <span className="hidden sm:inline">Next page</span>
                  <span className="sm:hidden">Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OptimizedActivityTable;