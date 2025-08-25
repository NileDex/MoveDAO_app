import React, { useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Wallet, Plus, Minus, Info, Shield, Clock, AlertTriangle, RefreshCw, XCircle } from 'lucide-react';
import { FaCheckCircle } from 'react-icons/fa';
import { useTreasury } from '../../hooks/useTreasury';
import { DAO } from '../../types/dao';

interface DAOTreasuryProps {
  dao: DAO;
}

const DAOTreasury: React.FC<DAOTreasuryProps> = ({ dao }) => {
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions'>('overview');
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Use the treasury hook
  const {
    treasuryData,
    transactions,
    userBalance,
    isAdmin,
    deposit,
    withdraw,
    refreshData
  } = useTreasury(dao.id);

  // Clear messages after 5 seconds
  React.useEffect(() => {
    if (successMessage || errorMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
        setErrorMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, errorMessage]);


  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setErrorMessage('Please enter a valid amount');
      return;
    }

    try {
      setIsDepositing(true);
      setErrorMessage('');
      
      const depositAmount = parseFloat(amount);
      await deposit(depositAmount);
      
      setSuccessMessage(`Successfully deposited ${depositAmount.toFixed(3)} MOVE to treasury`);
      setShowDepositForm(false);
      setAmount('');
    } catch (error: any) {
      console.error('Deposit failed:', error);
      setErrorMessage(error.message || 'Failed to deposit tokens');
    } finally {
      setIsDepositing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setErrorMessage('Please enter a valid amount');
      return;
    }

    try {
      setIsWithdrawing(true);
      setErrorMessage('');
      
      const withdrawAmount = parseFloat(amount);
      await withdraw(withdrawAmount);
      
      setSuccessMessage(`Successfully withdrew ${withdrawAmount.toFixed(3)} MOVE from treasury`);
      setShowWithdrawForm(false);
      setAmount('');
    } catch (error: any) {
      console.error('Withdrawal failed:', error);
      setErrorMessage(error.message || 'Failed to withdraw tokens');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Wallet },
    { id: 'transactions', label: 'Transactions', icon: Clock }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Treasury Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="professional-card rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Balance</p>
              <p className="text-2xl font-bold text-white">{treasuryData.balance.toFixed(3)} MOVE</p>
            </div>
            <Wallet className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        
        <div className="professional-card rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Daily Limit</p>
              <p className="text-2xl font-bold text-white">{treasuryData.dailyWithdrawalLimit.toFixed(0)} MOVE</p>
            </div>
            <Shield className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
        
        <div className="professional-card rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Daily Used</p>
              <p className="text-2xl font-bold text-white">{treasuryData.dailyWithdrawn.toFixed(3)} MOVE</p>
            </div>
            <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <Minus className="w-5 h-5 text-orange-400" />
            </div>
          </div>
        </div>
        
        <div className="professional-card rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Remaining Today</p>
              <p className="text-2xl font-bold text-white">{treasuryData.remainingDaily.toFixed(3)} MOVE</p>
            </div>
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Plus className="w-5 h-5 text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div style={{
          background: 'linear-gradient(45deg, #ffc30d, #b80af7)',
          borderRadius: '13px',
          padding: '2px',
          display: 'inline-block',
        }}>
        <button
          onClick={() => setShowDepositForm(true)}
            className="flex items-center justify-center space-x-2 px-6 py-3 font-medium transition-all"
            style={{
              background: '#121212',
              borderRadius: '11px',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              minWidth: 'fit-content',
            }}
            title={treasuryData.allowsPublicDeposits ? 'Anyone can deposit' : 'Only members/admins can deposit'}
        >
          <Plus className="w-4 h-4" />
          <span>Deposit Tokens</span>
        </button>
        </div>
        {isAdmin && (
          <div style={{
            background: 'linear-gradient(45deg, #ef4444, #dc2626)',
            borderRadius: '13px',
            padding: '2px',
            display: 'inline-block',
          }}>
        <button
          onClick={() => setShowWithdrawForm(true)}
              className="flex items-center justify-center space-x-2 px-6 py-3 font-medium transition-all"
              style={{
                background: '#121212',
                borderRadius: '11px',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                minWidth: 'fit-content',
              }}
              title="Withdraw funds (Admin only)"
        >
          <Minus className="w-4 h-4" />
              <span>Withdraw Tokens</span>
        </button>
          </div>
        )}
      </div>

      {/* Deposit Form */}
      {showDepositForm && (
        <div className="professional-card rounded-xl p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Deposit Tokens</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Amount</label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.000"
              />
              <p className="text-xs text-gray-500 mt-1">
                Available: {userBalance.toFixed(3)} MOVE
              </p>
            </div>
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
              <div style={{
                background: (!amount || parseFloat(amount) <= 0 || isDepositing) 
                  ? 'linear-gradient(45deg, #4b5563, #6b7280)' 
                  : 'linear-gradient(45deg, #ffc30d, #b80af7)',
                borderRadius: '13px',
                padding: '2px',
                display: 'inline-block',
              }}>
              <button
                onClick={handleDeposit}
                    className="flex items-center justify-center space-x-2 px-6 py-3 font-medium transition-all"
                    style={{
                      background: '#121212',
                      borderRadius: '11px',
                      border: 'none',
                      color: (!amount || parseFloat(amount) <= 0 || isDepositing) ? '#9ca3af' : '#fff',
                      cursor: (!amount || parseFloat(amount) <= 0 || isDepositing) ? 'not-allowed' : 'pointer',
                      opacity: (!amount || parseFloat(amount) <= 0 || isDepositing) ? 0.5 : 1,
                      minWidth: 'fit-content',
                    }}
                disabled={!amount || parseFloat(amount) <= 0 || isDepositing}
              >
                {isDepositing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Depositing...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Deposit</span>
                  </>
                )}
              </button>
              </div>
              <button
                onClick={() => setShowDepositForm(false)}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Form */}
      {showWithdrawForm && isAdmin && (
        <div className="professional-card rounded-xl p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Withdraw Tokens</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Amount</label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="0.000"
              />
              <div className="text-xs text-gray-500 mt-1 space-y-1">
                <p>Treasury balance: {treasuryData.balance.toFixed(3)} MOVE</p>
                <p>Daily limit remaining: {treasuryData.remainingDaily.toFixed(3)} MOVE</p>
                <p>Max withdrawal: {Math.min(treasuryData.remainingDaily, treasuryData.balance).toFixed(3)} MOVE</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
              <button
                onClick={handleWithdraw}
                className="flex items-center justify-center space-x-2 px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-xl transition-all flex-1"
                disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > Math.min(treasuryData.remainingDaily, treasuryData.balance) || isWithdrawing}
              >
                {isWithdrawing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-300"></div>
                    <span>Withdrawing...</span>
                  </>
                ) : (
                  <>
                    <Minus className="w-4 h-4" />
                    <span>Withdraw</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setShowWithdrawForm(false)}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Treasury Info */}
      <div className="professional-card rounded-xl p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <Info className="w-5 h-5 text-blue-400" />
          <span>Treasury Information</span>
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-start space-x-3 p-3 bg-white/5 rounded-lg">
            <Wallet className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <p className="text-white font-medium">Native Tokens Only</p>
              <p className="text-sm text-gray-400">Treasury contract only handles native tokens for security and simplicity</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3 p-3 bg-white/5 rounded-lg">
            <Shield className="w-5 h-5 text-yellow-400 mt-0.5" />
            <div>
              <p className="text-white font-medium">Daily Withdrawal Limits</p>
              <p className="text-sm text-gray-400">Built-in security with {treasuryData.dailyWithdrawalLimit.toFixed(0)} MOVE daily withdrawal limit per admin</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3 p-3 bg-white/5 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
            <div>
              <p className="text-white font-medium">Admin Required</p>
              <p className="text-sm text-gray-400">Only DAO admins can withdraw funds. Anyone can deposit to support the DAO.</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3 p-3 bg-white/5 rounded-lg">
            <Shield className="w-5 h-5 text-purple-400 mt-0.5" />
            <div>
              <p className="text-white font-medium">Reentrancy Protection</p>
              <p className="text-sm text-gray-400">Advanced security measures prevent reentrancy attacks during withdrawals</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTransactions = () => (
    <div className="space-y-6">
      <div className="professional-card rounded-xl p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Transactions</h3>
        <div className="space-y-3">
          {transactions.length > 0 ? (
            transactions.map((tx, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    tx.type === 'deposit' ? 'bg-green-500/20' : 'bg-red-500/20'
                  }`}>
                    {tx.type === 'deposit' ? (
                      <ArrowDownRight className="w-5 h-5 text-green-400" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-white capitalize">{tx.type}</p>
                    <p className="text-sm text-gray-400">
                      {tx.type === 'deposit' ? `From: ${tx.from}` : `To: ${tx.to}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-medium ${tx.type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.type === 'deposit' ? '+' : '-'}{tx.amount.toFixed(3)} MOVE
                  </p>
                  <p className="text-sm text-gray-400">{new Date(tx.timestamp).toLocaleDateString()}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">No transactions yet</p>
              <p className="text-sm text-gray-500">Treasury transactions will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );



  return (
    <div className="container mx-auto px-2 sm:px-6 space-y-6 sm:space-y-8 max-w-screen-lg">
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-start space-x-3">
                          <FaCheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-green-300 font-medium mb-1">Success</h3>
            <p className="text-green-200 text-sm">{successMessage}</p>
          </div>
          <button
            onClick={() => setSuccessMessage('')}
            className="text-green-400 hover:text-green-300 transition-colors"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start space-x-3">
          <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-red-300 font-medium mb-1">Error</h3>
            <p className="text-red-200 text-sm">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage('')}
            className="text-red-400 hover:text-red-300 transition-colors"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {treasuryData.error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-red-300 font-medium mb-1">Treasury Error</h3>
            <p className="text-red-200 text-sm">{treasuryData.error}</p>
          </div>
          <button
            onClick={() => refreshData()}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Treasury</h1>
          <p className="text-gray-400">Manage {dao.name} funds securely</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="text-sm text-gray-400">Your Balance</p>
            <p className="text-lg font-semibold text-white">{userBalance.toFixed(3)} MOVE</p>
          </div>
          {isAdmin && (
            <div className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg border border-purple-500/30 text-sm">
              Admin
            </div>
          )}
          <button
            onClick={() => refreshData()}
            className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-all"
            title="Refresh treasury and wallet data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-1 bg-white/5 rounded-xl p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all w-full sm:w-auto justify-center sm:justify-start ${
                isActive
                  ? 'bg-white/10 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : ''}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === 'overview' ? renderOverview() : renderTransactions()}
    </div>
  );
};

export default DAOTreasury;