import React, { useState, useEffect } from 'react';
import { Building2, FileText, Vote, Users, DollarSign, TrendingUp, Globe } from 'lucide-react';
import { usePlatformStats } from '../useServices/usePlatformStats';
import { NETWORK_CONFIG } from '../movement_service/constants';

const StatsOverview: React.FC = () => {
  const { stats: platformStats, isLoading, error, lastUpdated } = usePlatformStats();
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  // Check network status periodically
  useEffect(() => {
    const checkNetworkStatus = async () => {
      try {
        // Use a simple health check endpoint (NETWORK_CONFIG.fullnode already includes /v1)
        const response = await fetch(NETWORK_CONFIG.fullnode, { 
          method: 'GET',
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        setNetworkStatus(response.ok ? 'online' : 'offline');
      } catch (error) {
        console.warn('Network status check failed:', error);
        setNetworkStatus('offline');
      }
    };

    checkNetworkStatus();
    const interval = setInterval(checkNetworkStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const stats = [
    { 
      label: 'Total DAOs', 
      value: isLoading ? '...' : formatNumber(platformStats.totalDAOs), 
      change: '+New',
      icon: Building2, 
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/10'
    },
    { 
      label: 'Active Proposals', 
      value: isLoading ? '...' : formatNumber(platformStats.activeProposals), 
      change: '+Live',
      icon: FileText, 
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-500/10'
    },
    { 
      label: 'Total Votes', 
      value: isLoading ? '...' : formatNumber(platformStats.totalVotes), 
      change: '+Active',
      icon: Vote, 
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-500/10'
    },
    { 
      label: 'Community Members', 
      value: isLoading ? '...' : formatNumber(platformStats.totalMembers), 
      change: '+Growing',
      icon: Users, 
      color: 'from-yellow-500 to-orange-500',
      bgColor: 'bg-yellow-500/10'
    },
    { 
      label: 'Movement Network', 
      value: networkStatus === 'checking' ? '...' : 'Testnet', 
      change: networkStatus === 'online' ? '+Live' : networkStatus === 'offline' ? 'Offline' : '...',
      icon: Globe, 
      color: networkStatus === 'online' ? 'from-emerald-500 to-teal-500' : 'from-red-500 to-orange-500',
      bgColor: networkStatus === 'online' ? 'bg-emerald-500/10' : 'bg-red-500/10'
    }
  ];

  return (
    <div className="mb-8 w-full">
      {/* Compact, modern header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-white">Platform Overview</h2>
          {error ? (
            <span className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              Error
            </span>
          ) : networkStatus === 'online' ? (
            <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Live
            </span>
          ) : networkStatus === 'offline' ? (
            <span className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              Offline
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full">
              <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
              Checking
            </span>
          )}
        </div>

      </div>
      {/* Responsive cards: horizontal scroll on mobile, grid on md+ */}
      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 gap-3 sm:gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="min-w-0 from-white/10 to-white/5 backdrop-blur-xl border border-white/10 shadow-lg rounded-lg p-2 sm:p-3 flex flex-col items-center justify-center text-center transition-transform duration-300"
              style={{ animationDelay: `${index * 0.07}s` }}
            >
              <div className={`mb-1 p-1.5 sm:mb-2 sm:p-2 rounded-full flex items-center justify-center`}>
                <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow" />
              </div>
              <div className="mb-0.5 text-base sm:text-lg font-extrabold text-white">{stat.value}</div>
              <div className="mb-0.5 text-[10px] sm:text-xs text-gray-300 font-medium">{stat.label}</div>
              <div className="flex items-center justify-center gap-1 text-[10px] sm:text-xs text-green-400">
                <TrendingUp className="w-3 h-3" />
                <span>{stat.change}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StatsOverview;