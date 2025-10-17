import React, { useState, useEffect } from 'react';
import { Building2, FileText, Vote, Users, DollarSign, TrendingUp, Globe } from 'lucide-react';
import { usePlatformStats } from '../useServices/usePlatformStats';
import { NETWORK_CONFIG } from '../movement_service/constants';
import { useTheme } from '../contexts/ThemeContext';

const StatsOverview: React.FC = () => {
  const { stats: platformStats, isLoading, error, lastUpdated } = usePlatformStats();
  const { isDark } = useTheme();

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
      value: 'Testnet',
      change: '+Live',
      icon: Globe,
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-500/10'
    }
  ];

  return (
    <div className="mb-8 w-full">
      {/* Compact, modern header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-white">Platform Overview</h2>
          {error && (
            <span className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              Error
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
              className="min-w-0 from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-3 sm:p-4 transition-all duration-300 hover:border-white/20 relative overflow-hidden group"
              style={{ animationDelay: `${index * 0.07}s` }}
            >
              <Icon
                className="absolute -bottom-2 -right-2 w-10 h-10 sm:-bottom-3 sm:-right-3 sm:w-20 sm:h-20 pointer-events-none transition-all duration-300"
                style={{ color: isDark ? '#ffda34' : '#000000', opacity: 0.2 }}
              />
              <div className="flex flex-col items-start text-left relative z-10">
                <div className="mb-0.5 text-base sm:text-lg font-extrabold text-white">{stat.value}</div>
                <div className="text-[10px] sm:text-xs text-gray-300 font-medium">{stat.label}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StatsOverview;