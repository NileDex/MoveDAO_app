import React from 'react';
import { TrendingUp, Users, Wallet, FileText, Activity, Clock, Coins, Award } from 'lucide-react';
import GlobalActivityFeed from './GlobalActivityFeed';

const Dashboard: React.FC = () => {
  const stats = [
    { label: 'Total Members', value: '1,247', change: '+12%', icon: Users, color: 'text-blue-600' },
    { label: 'Total Staked', value: '85.2K tokens', change: '+15.3%', icon: Coins, color: 'text-orange-600' },
    { label: 'Active Proposals', value: '12', change: '+3', icon: FileText, color: 'text-green-600' },
    { label: 'Treasury Value', value: '$2.4M', change: '+8.5%', icon: Wallet, color: 'text-yellow-600' },
    { label: 'Rewards Distributed', value: '12.5K tokens', change: '+22.1%', icon: Award, color: 'text-purple-600' },
  ];

  const recentProposals = [
    { id: 1, title: 'Increase Marketing Budget', status: 'Active', votes: 145, timeLeft: '3 days' },
    { id: 2, title: 'Add New Token to Treasury', status: 'Passed', votes: 234, timeLeft: 'Ended' },
    { id: 3, title: 'Update Governance Parameters', status: 'Active', votes: 89, timeLeft: '5 days' },
    { id: 4, title: 'Community Fund Allocation', status: 'Draft', votes: 0, timeLeft: '7 days' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="professional-card rounded-xl p-6 hover:bg-white/5 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">{stat.label}</p>
                  <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                  <p className="text-sm text-green-400 mt-1">{stat.change}</p>
                </div>
                <div className={`p-3 rounded-lg bg-white/10 ${stat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="professional-card rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Proposals</h3>
          <div className="space-y-4">
            {recentProposals.map((proposal) => (
              <div key={proposal.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                <div className="flex-1">
                  <h4 className="font-medium text-white">{proposal.title}</h4>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                      proposal.status === 'Active' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                      proposal.status === 'Passed' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                      'bg-gray-500/20 text-gray-300 border-gray-500/30'
                    }`}>
                      {proposal.status}
                    </span>
                    <span className="text-sm text-gray-400">{proposal.votes} votes</span>
                  </div>
                </div>
                <div className="flex items-center text-sm text-gray-400">
                  <Clock className="w-4 h-4 mr-1" />
                  {proposal.timeLeft}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="professional-card rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Treasury Overview</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  MOVE
                </div>
                <div>
                  <p className="font-medium text-white">Movement</p>
                  <p className="text-sm text-gray-400">15.2K MOVE</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-white">$45.6K</p>
                <p className="text-sm text-green-400">+12.3%</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold">
                  USDC
                </div>
                <div>
                  <p className="font-medium text-white">USD Coin</p>
                  <p className="text-sm text-gray-400">25.0K USDC</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-white">$25.0K</p>
                <p className="text-sm text-gray-400">0.0%</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  DAO
                </div>
                <div>
                  <p className="font-medium text-white">DAO Token</p>
                  <p className="text-sm text-gray-400">500K DAO</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-white">$15.0K</p>
                <p className="text-sm text-red-400">-2.1%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global Activity Feed */}
      <GlobalActivityFeed 
        maxRows={20} 
        paginationType="loadMore"
        enablePagination={true}
      />
    </div>
  );
};

export default Dashboard;