import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Wallet, Plus, Minus, Clock, AlertTriangle, RefreshCw, XCircle } from 'lucide-react';
import { useTreasury } from '../../hooks/useTreasury';
import { DAO } from '../../types/dao';
import { aptosClient } from '../../movement_service/movement-client';
import { MODULE_ADDRESS } from '../../movement_service/constants';
import { BalanceService } from '../../useServices/useBalance';
import { truncateAddress } from '../../utils/addressUtils';
import { useWallet } from '@razorlabs/razorkit';
import { useAlert } from '../alert/AlertContext';
import VaultManager from '../VaultManager';
import { useSectionLoader } from '../../hooks/useSectionLoader';
import SectionLoader from '../common/SectionLoader';

interface DAOTreasuryProps {
  dao: DAO;
}

const DAOTreasury: React.FC<DAOTreasuryProps> = ({ dao }) => {
  const { account } = useWallet();
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [amount, setAmount] = useState('');
  // Render both sections sequentially (no tabs)
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const { showAlert } = useAlert();
  const [isTogglingPublicDeposits, setIsTogglingPublicDeposits] = useState(false);
  const [movePrice, setMovePrice] = useState<number | null>(null);
  const [totalStaked, setTotalStaked] = useState<number>(0);
  const isWalletConnected = !!account?.address;

  // Section loader for Treasury tab
  const sectionLoader = useSectionLoader();

  // Use the treasury hook
  const {
    treasuryData,
    transactions,
    userBalance,
    isAdmin,
    deposit,
    withdraw,
    togglePublicDeposits,
    refreshData
  } = useTreasury(dao.id);


  // Initialize section loading
  useEffect(() => {
    const loadTreasuryData = async () => {
      await refreshData();

      // Also fetch MOVE price
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=movement&vs_currencies=usd');
        const data = await response.json();
        if (data.movement && data.movement.usd) {
          setMovePrice(data.movement.usd);
        }
      } catch (error) {
        console.warn('Failed to fetch MOVE price from CoinGecko:', error);
        setMovePrice(1); // $1 fallback
      }
    };

    sectionLoader.executeWithLoader(loadTreasuryData);
  }, [dao.id, account?.address]);

  const retryTreasuryData = () => {
    const loadTreasuryData = async () => {
      await refreshData();
    };
    sectionLoader.executeWithLoader(loadTreasuryData);
  };

  // Original MOVE price fetch logic (now part of loading)
  const fetchMovePrice = async () => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=movement&vs_currencies=usd');
      const data = await response.json();
      if (data.movement && data.movement.usd) {
        setMovePrice(data.movement.usd);
      }
    } catch (error) {
      console.warn('Failed to fetch MOVE price from CoinGecko:', error);
      setMovePrice(1); // $1 fallback
    }
  };

  // Old useEffect cleanup
  useEffect(() => {
    // Refresh price every 5 minutes
    const interval = setInterval(fetchMovePrice, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch total staked amount
  React.useEffect(() => {
    const fetchTotalStaked = async () => {
      try {
        const totalStakedRes = await aptosClient.view({ 
          payload: { 
            function: `${MODULE_ADDRESS}::staking::get_total_staked`, 
            functionArguments: [dao.id] 
          } 
        });
        const totalStakedAmount = BalanceService.octasToMove(Number(totalStakedRes?.[0] || 0));
        setTotalStaked(totalStakedAmount);
      } catch (error) {
        console.warn('Failed to fetch total staked:', error);
        setTotalStaked(0);
      }
    };

    fetchTotalStaked();
    // Refresh every 30 seconds
    const interval = setInterval(fetchTotalStaked, 30 * 1000);
    return () => clearInterval(interval);
  }, [dao.id]);

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      showAlert('Please enter a valid amount', 'error');
      return;
    }

    try {
      setIsDepositing(true);
      
      const depositAmount = parseFloat(amount);
      await deposit(depositAmount);
      
      showAlert(`Successfully deposited ${depositAmount.toFixed(3)} MOVE to treasury`, 'success');
      setShowDepositForm(false);
      setAmount('');
    } catch (error: any) {
      console.error('Deposit failed:', error);
      showAlert(error.message || 'Failed to deposit tokens', 'error');
    } finally {
      setIsDepositing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      showAlert('Please enter a valid amount', 'error');
      return;
    }

    try {
      setIsWithdrawing(true);
      
      const withdrawAmount = parseFloat(amount);
      await withdraw(withdrawAmount);
      
      showAlert(`Successfully withdrew ${withdrawAmount.toFixed(3)} MOVE from treasury`, 'success');
      setShowWithdrawForm(false);
      setAmount('');
    } catch (error: any) {
      console.error('Withdrawal failed:', error);
      showAlert(error.message || 'Failed to withdraw tokens', 'error');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleTogglePublicDeposits = async (allow: boolean) => {
    try {
      setIsTogglingPublicDeposits(true);
      
      await togglePublicDeposits(allow);
      
      showAlert(
        allow 
          ? 'Public deposits enabled - anyone can now deposit to this treasury' 
          : 'Public deposits disabled - only members and admins can deposit',
        'success'
      );
    } catch (error: any) {
      console.error('Toggle public deposits failed:', error);
      showAlert(error.message || 'Failed to update public deposit settings', 'error');
    } finally {
      setIsTogglingPublicDeposits(false);
    }
  };

  // Tabs removed – show Overview and Transactions together

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Top value header - Made responsive */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
        {/* Assets left - compact list - Increased width */}
        <div className="w-full xl:w-[400px] space-y-2">
          {/* Treasury value calculated from tokens */}
          <div className="text-left mb-2">
            <div className="text-5xl font-extrabold text-white">
              {movePrice !== null 
                ? `$${((treasuryData?.balance || 0) * movePrice).toLocaleString(undefined,{maximumFractionDigits:2})}` 
                : `$${((treasuryData?.balance || 0) * 1).toLocaleString(undefined,{maximumFractionDigits:2})}`
              }
            </div>
            <div className="text-lg font-bold text-gray-400">Treasury Value</div>
          </div>
          
          {[
            { id: 'tokens', label: 'Tokens', value: treasuryData?.balance ?? 0 },
            { id: 'staking', label: 'Staking', value: totalStaked }
          ].map((a, i) => (
            <div key={a.id} className={`rounded-xl p-4 ${i === 0 ? 'bg-white/10' : 'bg-transparent hover:bg-white/5'} border border-white/10`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`inline-block w-2 h-2 rounded-full ${i===0?'bg-blue-400':i===1?'bg-emerald-400':'bg-yellow-400'}`}></span>
                  <span className="text-white font-medium">{a.label}</span>
                </div>
                <div className="text-right">
                  <div className="text-white font-semibold">
                    {movePrice !== null 
                      ? `$${(a.value * movePrice).toLocaleString(undefined,{maximumFractionDigits:2})}` 
                      : `$${(a.value * 1).toLocaleString(undefined,{maximumFractionDigits:2})}`
                    }
                  </div>
                  <div className="text-sm text-gray-300 flex items-center justify-end space-x-1 mb-1">
                    <span>{(a.value*1).toLocaleString(undefined,{maximumFractionDigits:2})}</span>
                    <img 
                      src="https://ipfs.io/ipfs/QmUv8RVdgo6cVQzh7kxerWLatDUt4rCEFoCTkCVLuMAa27" 
                      alt="MOVE"
                      className="w-3 h-3 flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                        if (fallback) fallback.classList.remove('hidden');
                      }}
                    />
                    <span className="hidden">MOVE</span>
                  </div>
                  <div className="text-xs text-gray-400">{i===0?'100.0%':'0.0%'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Donut chart right - Made responsive */}
        <div className="w-full xl:w-auto flex-1 max-w-md xl:max-w-none p-4">
          <div 
            className="h-56 w-full [&_svg]:outline-none [&_svg]:border-none [&_*]:outline-none [&_*]:border-none" 
            style={{ outline: 'none' }}
          >
          <ResponsiveContainer width="100%" height="100%" style={{ outline: 'none' }}>
            <PieChart style={{ outline: 'none', border: 'none' }}>
              <Pie 
                dataKey="value" 
                data={[
                  { name: 'Tokens', value: Math.max(0, treasuryData?.balance ?? 0) },
                  { name: 'Staking', value: Math.max(0, totalStaked) }
                ]} 
                innerRadius={70} 
                outerRadius={110} 
                paddingAngle={1}
                stroke="none"
                onClick={undefined}
                onMouseEnter={undefined}
                onMouseLeave={undefined}
                style={{ outline: 'none' }}
              >
                {["#22d3ee", "#f59e0b"].map((c, idx) => (
                  <Cell 
                    key={idx} 
                    fill={c} 
                    stroke="none" 
                    style={{ outline: 'none' }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          </div>
          <div className="text-center text-gray-300 mt-2 text-sm">Tokens breakdown</div>
        </div>
      </div>

      {/* Public Deposits Toggle - Admin Only - No background */}
      {isAdmin && (
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="text-white font-medium mb-1">
              {treasuryData.allowsPublicDeposits ? 'Public Deposits Enabled' : 'Member-Only Deposits'}
            </div>
            <div className="text-sm text-gray-400">
              {treasuryData.allowsPublicDeposits 
                ? 'Anyone can deposit tokens' 
                : 'Only members can deposit'}
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => handleTogglePublicDeposits(true)}
              disabled={treasuryData.allowsPublicDeposits || isTogglingPublicDeposits}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                treasuryData.allowsPublicDeposits
                  ? 'bg-green-600 text-white'
                  : 'bg-white/10 text-gray-400 hover:bg-white/20'
              }`}
            >
              Public
            </button>
            
            <button
              onClick={() => handleTogglePublicDeposits(false)}
              disabled={!treasuryData.allowsPublicDeposits || isTogglingPublicDeposits}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                !treasuryData.allowsPublicDeposits
                  ? 'bg-yellow-600 text-white'
                  : 'bg-white/10 text-gray-400 hover:bg-white/20'
              }`}
            >
              Members
            </button>
          </div>
        </div>
      )}

      {/* Actions - Only show when wallet is connected */}
      {isWalletConnected ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
          <button
            onClick={() => setShowDepositForm(true)}
            className="flex items-center justify-center space-x-2 px-6 py-3 text-green-400 border border-green-500/30 rounded-xl font-medium hover:bg-green-500/10 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Deposit</span>
          </button>
          
          {isAdmin && (
            <button
              onClick={() => setShowWithdrawForm(true)}
              className="flex items-center justify-center space-x-2 px-6 py-3 text-red-400 border border-red-500/30 rounded-xl font-medium hover:bg-red-500/10 transition-all"
            >
              <Minus className="w-4 h-4" />
              <span>Withdraw</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 max-w-md">
          <div className="flex items-center space-x-3">
            <Wallet className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <div>
              <p className="text-blue-300 font-medium mb-1">Connect Wallet</p>
              <p className="text-blue-200 text-sm">Connect your wallet to deposit or withdraw funds</p>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Modal */}
      {showDepositForm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" onClick={() => setShowDepositForm(false)}>
          <div className="rounded-xl p-5 w-full max-w-md bg-[#121212] border border-white/10" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">Deposit Tokens</h3>
              <button onClick={() => setShowDepositForm(false)} className="text-gray-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
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
                <p className="text-xs text-gray-500 mt-1">Available: {userBalance.toFixed(3)} MOVE</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDeposit}
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium disabled:opacity-50"
                  disabled={!amount || parseFloat(amount) <= 0 || isDepositing}
                >
                  {isDepositing ? 'Depositing...' : 'Confirm Deposit'}
                </button>
                <button onClick={() => setShowDepositForm(false)} className="px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawForm && isAdmin && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" onClick={() => setShowWithdrawForm(false)}>
          <div className="rounded-xl p-5 w-full max-w-md bg-[#121212] border border-white/10" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">Withdraw Tokens</h3>
              <button onClick={() => setShowWithdrawForm(false)} className="text-gray-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
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
              <div className="flex items-center gap-3">
                <button
                  onClick={handleWithdraw}
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium disabled:opacity-50"
                  disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > Math.min(treasuryData.remainingDaily, treasuryData.balance) || isWithdrawing}
                >
                  {isWithdrawing ? 'Withdrawing...' : 'Confirm Withdraw'}
                </button>
                <button onClick={() => setShowWithdrawForm(false)} className="px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Treasury Info - Clean version */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center py-2 border-b border-white/5">
          <span className="text-gray-400">Security</span>
          <span className="text-white">Native tokens only, Daily limits, Reentrancy protection</span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-gray-400">Deposits</span>
          <span className="text-white">
            {treasuryData.allowsPublicDeposits ? 'Public enabled' : 'Members only'}
          </span>
        </div>
      </div>
    </div>
  );

  const renderTransactions = () => {
    // Use the utility function for consistent address truncation

    return (
      <div className="bg-white/3 border border-white/5 rounded-xl p-4 w-full max-w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base md:text-lg font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="truncate">Recent Transactions</span>
              {transactions.length > 0 && (
                <span className="text-xs sm:text-sm text-gray-400 hidden sm:inline">({transactions.length})</span>
              )}
            </h3>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-4 px-4 font-medium text-gray-300">Transaction</th>
                <th className="text-left py-4 px-4 font-medium text-gray-300">Type</th>
                <th className="text-left py-4 px-4 font-medium text-gray-300">Amount</th>
                <th className="text-left py-4 px-4 font-medium text-gray-300">Address</th>
                <th className="text-left py-4 px-4 font-medium text-gray-300">Time</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 px-4 text-center">
                    <Clock className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No transactions yet</p>
                    <p className="text-gray-500 text-xs mt-1">
                      Treasury transactions will appear here
                    </p>
                  </td>
                </tr>
              ) : (
                transactions.map((tx, index) => (
                  <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-all">
                    {/* Transaction */}
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          tx.type === 'deposit' ? 'bg-green-500/20' : 'bg-red-500/20'
                        }`}>
                          {tx.type === 'deposit' ? (
                            <ArrowDownRight className="w-4 h-4 text-green-400" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-white font-medium text-sm leading-tight capitalize">{tx.type}</h4>
                          <p className="text-gray-400 text-xs leading-tight">Treasury {tx.type}</p>
                        </div>
                      </div>
                    </td>
                    
                    {/* Type */}
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs border whitespace-nowrap ${
                        tx.type === 'deposit' 
                          ? 'text-green-400 border-green-500/30 bg-green-500/10' 
                          : 'text-red-400 border-red-500/30 bg-red-500/10'
                      }`}>
                        {tx.type === 'deposit' ? 'Deposit' : 'Withdraw'}
                      </span>
                    </td>
                    
                    {/* Amount */}
                    <td className="py-4 px-4">
                      <div className={`text-sm font-medium ${tx.type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.type === 'deposit' ? '+' : '-'}{tx.amount.toFixed(3)} MOVE
                      </div>
                    </td>
                    
                    {/* Address */}
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-300 font-mono">
                        {tx.type === 'deposit' 
                          ? truncateAddress(tx.from || '')
                          : truncateAddress(tx.to || '')
                        }
                      </span>
                    </td>
                    
                    {/* Time */}
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-1 text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs">{new Date(tx.timestamp).toLocaleDateString()}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="sm:hidden">
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No transactions yet</p>
              <p className="text-gray-500 text-xs mt-1">
                Treasury transactions will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {transactions.map((tx, index) => (
                <div
                  key={index}
                  className="rounded-lg p-2.5 hover:bg-white/5 transition-all border-b border-white/5 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        tx.type === 'deposit' ? 'bg-green-500/20' : 'bg-red-500/20'
                      }`}>
                        {tx.type === 'deposit' ? (
                          <ArrowDownRight className="w-4 h-4 text-green-400" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="text-white font-medium text-sm leading-tight capitalize">{tx.type}</h4>
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] border flex-shrink-0 ${
                            tx.type === 'deposit' 
                              ? 'text-green-400 border-green-500/30 bg-green-500/10' 
                              : 'text-red-400 border-red-500/30 bg-red-500/10'
                          }`}>
                            {tx.type === 'deposit' ? 'Deposit' : 'Withdraw'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-gray-400">
                          <span className="font-mono">
                            {tx.type === 'deposit' 
                              ? truncateAddress(tx.from || '')
                              : truncateAddress(tx.to || '')
                            }
                          </span>
                          <span>{new Date(tx.timestamp).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`text-sm font-medium ${tx.type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.type === 'deposit' ? '+' : '-'}{tx.amount.toFixed(3)} MOVE
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };



  return (
    <div className="w-full px-4 sm:px-6 space-y-6 sm:space-y-8 max-w-full overflow-hidden relative">

      {/* Top-right status */}
      <div className="flex justify-end mb-4">
        <div className="text-right">
          {(sectionLoader.isLoading || treasuryData.isLoading) && (
            <div className="text-xs text-blue-300">Loading...</div>
          )}
          {sectionLoader.error && (
            <div className="text-xs text-red-300 cursor-pointer" onClick={retryTreasuryData}>
              Error - Click to retry
            </div>
          )}
        </div>
      </div>

      {treasuryData.error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="text-red-300 font-medium mb-1">Treasury Error</h3>
            <p className="text-red-200 text-sm">{treasuryData.error}</p>
          </div>
          <button
            onClick={() => refreshData()}
            className="text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* Header - Made responsive */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Treasury</h1>
          <p className="text-gray-400">Manage {dao.name} funds securely</p>
        </div>
        
        {/* Mobile KPIs - Show as clean responsive dropdown */}
        <div className="lg:hidden absolute top-2 right-2 z-20">
          <div className="relative">
            <select className="appearance-none bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl px-4 py-2.5 pr-8 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xl min-w-[140px] transition-all duration-200 hover:bg-gray-800/95">
              <option value="balance" className="bg-gray-900 text-white py-1">Balance: {userBalance.toFixed(3)} MOVE</option>
              <option value="limit" className="bg-gray-900 text-white py-1">Limit: {treasuryData.dailyWithdrawalLimit.toFixed(0)} MOVE</option>
              <option value="used" className="bg-gray-900 text-white py-1">Used: {treasuryData.dailyWithdrawn.toFixed(3)} MOVE</option>
              <option value="remaining" className="bg-gray-900 text-white py-1">Remaining: {treasuryData.remainingDaily.toFixed(3)} MOVE</option>
            </select>
            {/* Custom dropdown arrow */}
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 w-full lg:w-auto">
          {/* Desktop KPIs - Show as cards */}
          <div className={`hidden lg:grid gap-2 text-xs ${isWalletConnected ? 'grid-cols-4' : 'grid-cols-3'}`}>
            {isWalletConnected && (
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <div className="text-gray-400 mb-1">Balance</div>
                <div className="font-semibold text-white">{userBalance.toFixed(3)}</div>
              </div>
            )}
            <div className="bg-white/5 rounded-lg p-2 text-center">
              <div className="text-gray-400 mb-1">Limit</div>
              <div className="font-semibold text-white">{treasuryData.dailyWithdrawalLimit.toFixed(0)}</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2 text-center">
              <div className="text-gray-400 mb-1">Used</div>
              <div className="font-semibold text-white">{treasuryData.dailyWithdrawn.toFixed(3)}</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2 text-center">
              <div className="text-gray-400 mb-1">Remaining</div>
              <div className="font-semibold text-white">{treasuryData.remainingDaily.toFixed(3)}</div>
            </div>
          </div>
          
          {/* Status indicators + refresh */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {!isWalletConnected && (
              <div className="px-3 py-1 bg-gray-500/20 text-gray-300 rounded-lg border border-gray-500/30 text-sm">
                Guest
              </div>
            )}
            {isWalletConnected && isAdmin && (
              <div className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg border border-purple-500/30 text-sm">
                Admin
              </div>
            )}
            <button
              onClick={() => refreshData()}
              className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-all"
              title={isWalletConnected ? "Refresh treasury and wallet data" : "Refresh treasury data"}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content (tabs removed) */}
      {renderOverview()}

      {/* Vault Manager Component */}
      {/* <VaultManager
        daoId={dao.id}
        treasuryObject={treasuryData.treasuryObject}
      /> */}

      {renderTransactions()}
    </div>
  );
};

export default DAOTreasury;