import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const Treasury: React.FC = () => {
  const assets = [
    {
      symbol: 'ETH',
      name: 'Ethereum',
      balance: '324.5',
      value: '$1,200,000',
      change: '+5.2%',
      changePositive: true,
      color: 'bg-blue-600'
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      balance: '850,000',
      value: '$850,000',
      change: '0.0%',
      changePositive: true,
      color: 'bg-green-600'
    },
    {
      symbol: 'DAO',
      name: 'DAO Token',
      balance: '2,100,000',
      value: '$350,000',
      change: '-2.1%',
      changePositive: false,
      color: 'bg-purple-600'
    },
    {
      symbol: 'WBTC',
      name: 'Wrapped Bitcoin',
      balance: '5.2',
      value: '$180,000',
      change: '+3.8%',
      changePositive: true,
      color: 'bg-orange-600'
    }
  ];

  const transactions = [
    {
      id: 1,
      type: 'Received',
      amount: '50 ETH',
      from: 'Proposal #12',
      timestamp: '2 hours ago',
      status: 'Confirmed'
    },
    {
      id: 2,
      type: 'Sent',
      amount: '10,000 USDC',
      to: 'Marketing Fund',
      timestamp: '1 day ago',
      status: 'Confirmed'
    },
    {
      id: 3,
      type: 'Swap',
      amount: '25 ETH → 90,000 USDC',
      from: 'Rebalancing',
      timestamp: '3 days ago',
      status: 'Confirmed'
    }
  ];

  const totalValue = assets.reduce((sum, asset) => {
    return sum + parseFloat(asset.value.replace(/[$,]/g, ''));
  }, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="professional-card rounded-xl p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Treasury Overview</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Value</p>
                <p className="text-2xl font-bold">${totalValue.toLocaleString()}</p>
                <p className="text-sm text-blue-100 mt-1">+12.5% this month</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Monthly Inflow</p>
                <p className="text-2xl font-bold">$285K</p>
                <p className="text-sm text-green-100 mt-1">+8.2% from last month</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Monthly Outflow</p>
                <p className="text-2xl font-bold">$156K</p>
                <p className="text-sm text-purple-100 mt-1">-5.1% from last month</p>
              </div>
              <TrendingDown className="w-8 h-8 text-purple-200" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="professional-card rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Asset Holdings</h3>
          <div className="space-y-4">
            {assets.map((asset, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 ${asset.color} rounded-full flex items-center justify-center text-white font-bold`}>
                    {asset.symbol}
                  </div>
                  <div>
                    <p className="font-medium text-white">{asset.name}</p>
                    <p className="text-sm text-gray-400">{asset.balance} {asset.symbol}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-white">{asset.value}</p>
                  <div className={`flex items-center space-x-1 text-sm ${
                    asset.changePositive ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {asset.changePositive ? 
                      <ArrowUpRight className="w-3 h-3" /> : 
                      <ArrowDownRight className="w-3 h-3" />
                    }
                    <span>{asset.change}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="professional-card rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Transactions</h3>
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    transaction.type === 'Received' ? 'bg-green-500/20 text-green-400' :
                    transaction.type === 'Sent' ? 'bg-red-500/20 text-red-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {transaction.type === 'Received' ? 
                      <ArrowDownRight className="w-4 h-4" /> :
                      transaction.type === 'Sent' ?
                      <ArrowUpRight className="w-4 h-4" /> :
                      <TrendingUp className="w-4 h-4" />
                    }
                  </div>
                  <div>
                    <p className="font-medium text-white">{transaction.type}</p>
                    <p className="text-sm text-gray-300">{transaction.amount}</p>
                    <p className="text-xs text-gray-400">
                      {transaction.from || transaction.to}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{transaction.status}</p>
                  <p className="text-xs text-gray-400">{transaction.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Treasury;