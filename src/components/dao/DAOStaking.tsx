import React, { useState, useEffect } from 'react';
import { 
  Coins, 
  TrendingUp, 
  Clock, 
  Award, 
  History, 
  Lock, 
  Unlock,
  AlertCircle,
  Info,
  Calculator,
  Users,
  Shield,
  UserCheck,
  UserX
} from 'lucide-react';
import { FaCheckCircle } from 'react-icons/fa';
import { DAO } from '../../types/dao';
import { useWallet } from '@razorlabs/razorkit';
import { aptosClient } from '../../movement_service/movement-client';
import { MODULE_ADDRESS } from '../../movement_service/constants';
import { useDAOMembership, useDAOPortfolio } from '../../hooks/useDAOMembership';
import { BalanceService } from '../../useServices/useBalance';
import { useWalletBalance } from '../../hooks/useWalletBalance';
import { useActivities } from '../../hooks/useActivities';
import ActivityTable from '../ActivityTable';
import { ActivityTracker } from '../../useServices/useActivityTracker';

interface DAOStakingProps {
  dao: DAO;
}

const DAOStaking: React.FC<DAOStakingProps> = ({ dao }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'stake' | 'rewards' | 'history'>('overview');
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [showStakeForm, setShowStakeForm] = useState(false);
  const [showUnstakeForm, setShowUnstakeForm] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [rewardsState, setRewardsState] = useState({ totalClaimable: 0, totalClaimed: 0, lastDistribution: '' });
  const [stakingReady, setStakingReady] = useState(true);
  const [totalStakedInDAO, setTotalStakedInDAO] = useState(0);
  const [totalStakers, setTotalStakers] = useState(0);
  const [lastStakeTime, setLastStakeTime] = useState<number>(0);
  const [independentMinStake, setIndependentMinStake] = useState<number | null>(null);
  const [minStakeFetchAttempted, setMinStakeFetchAttempted] = useState(false);
  
  // Use BalanceService for consistent OCTAS conversion
  const toMOVE = (u64: number): number => BalanceService.octasToMove(u64);

  const { account, signAndSubmitTransaction } = useWallet();
  
  // Use the new persistent state hooks
  const { 
    membershipData, 
    isLoading: membershipLoading, 
    isMember, 
    isStaker,
    canJoinDAO,
    needsMoreStake,
    refresh: refreshMembership,
    updateLocalState 
  } = useDAOMembership(dao);
  
  const { walletBalance, refresh: refreshPortfolio } = useDAOPortfolio();
  const { 
    balance: hookBalance, 
    isLoading: balanceLoading, 
    error: balanceError, 
    refresh: refreshBalance 
  } = useWalletBalance();

  // Get user's all activities for this DAO
  const { 
    activities: userActivities, 
    isLoading: activitiesLoading, 
    error: activitiesError, 
    pagination: activitiesPagination,
    refresh: refreshActivities,
    goToPage: goToActivitiesPage,
    changeItemsPerPage: changeActivitiesPerPage,
    loadMore: loadMoreActivities
  } = useActivities({
    userAddress: account?.address,
    limit: 30,
    enablePagination: true,
    loadMoreMode: false
  });

  // Balance sources prioritized: hookBalance (fresh) > walletBalance (cached)

  // Fetch minimum stake requirement independently of wallet connection
  const fetchMinStakeIndependently = async () => {
    if (minStakeFetchAttempted) return; // Prevent multiple attempts
    
    setMinStakeFetchAttempted(true);
    try {
      const minStakeRes = await aptosClient.view({
        payload: {
          function: `${MODULE_ADDRESS}::membership::get_min_stake`,
          functionArguments: [dao.id]
        }
      });
      // Use correct 6-decimal conversion for contract values (divide by 1,000,000)
      const minStake = Number(minStakeRes[0] || 0) / 1000000;
      setIndependentMinStake(minStake);
    } catch (error) {
      // Silently fail and use fallback value - don't log network errors to prevent spam
      setIndependentMinStake(7); // Default to 7 for MoveDAO_v2 - adjust based on your DAO
    }
  };

  // Derive data from persistent state
  const daoStakingData = {
    daoAddress: dao.id,
    daoName: dao.name,
    minStakeRequired: independentMinStake !== null ? independentMinStake : (membershipData?.minStakeRequired || 0),
    totalStakedInDAO: totalStakedInDAO,
    totalStakers: totalStakers,
    // Use the freshest balance available and ensure gas reserve is subtracted only once
    userBalance: Math.max(0, (hookBalance || walletBalance || 0)),
    userDaoStaked: membershipData?.stakedAmount || 0,
    userVotingPower: membershipData?.votingPower || 0,
    isMember,
    isStaker,
    memberSince: membershipData?.memberSince ? new Date(membershipData.memberSince).toLocaleDateString() : ''
  };

  const refreshOnChain = async () => {
    // Refresh DAO-specific aggregated data (total staked, staker count)
    try {
      // Total staked via view
      try {
        const totalStakedRes = await aptosClient.view({ payload: { function: `${MODULE_ADDRESS}::staking::get_total_staked`, functionArguments: [dao.id] } });
        const totalStaked = toMOVE(Number(totalStakedRes?.[0] || 0));
        setTotalStakedInDAO(totalStaked);
      } catch (e) {
        console.warn('get_total_staked view failed:', e);
        setTotalStakedInDAO(0);
      }

      // Staker count from on-chain resource (function may not be a view)
      try {
        const registryRes = await aptosClient.getAccountResource({
          accountAddress: dao.id,
          resourceType: `${MODULE_ADDRESS}::staking::StakerRegistry`,
        });
        const totalStakersVal = Number((registryRes as any)?.data?.total_stakers ?? 0);
        setTotalStakers(totalStakersVal);
      } catch (e) {
        console.warn('StakerRegistry read failed, defaulting to 0:', e);
        // Fallback attempt via view if available (older/newer ABIs)
        try {
          const stakerCountRes = await aptosClient.view({ payload: { function: `${MODULE_ADDRESS}::staking::get_staker_count`, functionArguments: [dao.id] } });
          setTotalStakers(Number(stakerCountRes?.[0] || 0));
        } catch {
          setTotalStakers(0);
        }
      }

      // Refresh user-specific data through the persistent state system
      await refreshMembership();

      // Rewards: total claimable and claimed (Octas → MOVE)
      try {
        if (account?.address) {
          const [claimableRes, claimedRes] = await Promise.all([
            aptosClient.view({ payload: { function: `${MODULE_ADDRESS}::rewards::get_total_claimable`, functionArguments: [dao.id, account.address] } }),
            aptosClient.view({ payload: { function: `${MODULE_ADDRESS}::rewards::get_total_claimed`, functionArguments: [dao.id, account.address] } }),
          ]);
          const totalClaimable = BalanceService.octasToMove(Number(claimableRes?.[0] || 0));
          const totalClaimed = BalanceService.octasToMove(Number(claimedRes?.[0] || 0));
          setRewardsState(prev => ({ ...prev, totalClaimable, totalClaimed }));
        } else {
          setRewardsState(prev => ({ ...prev, totalClaimable: 0, totalClaimed: 0 }));
        }
      } catch (e) {
        console.warn('Failed to refresh rewards state:', e);
        setRewardsState(prev => ({ ...prev, totalClaimable: 0 }));
      }
    } catch (e) {
      console.warn('Failed to refresh staking state (non-fatal):', e);
    }

    // Detect staking readiness (Vault + Registry exist). Run independently so earlier failures don't block this.
    try {
      const vaultAddrRes = await aptosClient.view({ payload: { function: `${MODULE_ADDRESS}::staking::get_vault_addr`, functionArguments: [dao.id] } });
      const vaultAddr = String(vaultAddrRes?.[0] || '');
      if (!vaultAddr) throw new Error('no vault addr');
      const vaultPromise = aptosClient.getAccountResource({
        accountAddress: vaultAddr,
        resourceType: `${MODULE_ADDRESS}::staking::Vault`,
      });
      const registryPromise = aptosClient.getAccountResource({
        accountAddress: dao.id,
        resourceType: `${MODULE_ADDRESS}::staking::StakerRegistry`,
      });
      await Promise.all([vaultPromise, registryPromise]);
      setStakingReady(true);
    } catch (e) {
      setStakingReady(false);
    }
  };

  // Initial load - this will use cached data if available
  useEffect(() => { 
    // Always fetch minimum stake independently (only once per DAO)
    fetchMinStakeIndependently();
    
    if (account?.address) {
      // Refresh both DAO-specific data and wallet balance
      Promise.all([
        refreshOnChain(),
        refreshPortfolio(),
        refreshBalance(),
        refreshActivities()
      ]).catch(error => {
        console.warn('Failed to refresh initial data:', error);
      });
    }
  }, [dao.id]); // Removed account?.address dependency to prevent refetching

  // Lightweight readiness checker to absorb indexer lag when opening the stake form
  const checkStakingReadiness = async () => {
    try {
      const vaultAddrRes = await aptosClient.view({ payload: { function: `${MODULE_ADDRESS}::staking::get_vault_addr`, functionArguments: [dao.id] } });
      const vaultAddr = String(vaultAddrRes?.[0] || '');
      if (!vaultAddr) throw new Error('no vault addr');
      const [vaultOk, registryOk] = await Promise.all([
        aptosClient.getAccountResource({ accountAddress: vaultAddr, resourceType: `${MODULE_ADDRESS}::staking::Vault` }).then(() => true).catch(async () => {
          // Fallback: scan all resources at vault address for any staking::Vault type
          try {
            const resources: any[] = await (aptosClient as any).getAccountResources?.({ accountAddress: vaultAddr });
            if (Array.isArray(resources)) {
              return resources.some((r: any) => typeof r?.type === 'string' && r.type.endsWith('::staking::Vault'));
            }
          } catch {}
          return false;
        }),
        aptosClient.getAccountResource({ accountAddress: dao.id, resourceType: `${MODULE_ADDRESS}::staking::StakerRegistry` }).then(() => true).catch(() => false),
      ]);
      if (vaultOk && registryOk) {
        setStakingReady(true);
        return;
      }
      // Soft fallback: if total_staked view works, consider pool usable while indexer catches up
      try {
        const totalStakedRes = await aptosClient.view({ payload: { function: `${MODULE_ADDRESS}::staking::get_total_staked`, functionArguments: [dao.id] } });
        const ok = typeof totalStakedRes?.[0] !== 'undefined';
        setStakingReady(Boolean(ok));
      } catch {
        setStakingReady(false);
      }
    } catch {
      setStakingReady(false);
    }
  };

  useEffect(() => {
    if (!showStakeForm) return;
    let canceled = false;
    let attempts = 0;
    const run = async () => {
      while (!canceled && attempts < 5) {
        attempts += 1;
        await checkStakingReadiness();
        await new Promise(r => setTimeout(r, 800));
      }
    };
    run();
    return () => { canceled = true; };
  }, [showStakeForm, dao.id]);

  const daoRewardsData = {
    votingRewards: 0,
    proposalRewards: 0,
    stakingRewards: 0,
    get totalClaimable() { return rewardsState.totalClaimable; },
    get totalClaimed() { return rewardsState.totalClaimed; },
    lastDistribution: rewardsState.lastDistribution || ''
  } as any;

  // Get all activities for this DAO (not just staking-related)
  const allActivities = userActivities.filter(activity => 
    activity.dao === dao.id
  );

  const validateStakeAmount = (amount: string): boolean => {
    const newErrors: {[key: string]: string} = {};
    const numAmount = parseFloat(amount);

    if (!amount || isNaN(numAmount)) {
      newErrors.stake = 'Please enter a valid amount';
    } else if (numAmount <= 0) {
      newErrors.stake = 'Amount must be greater than 0';
    } else {
      const gasReserve = 0.02; // keep ~0.02 MOVE for gas
      const availableBalance = Math.max(0, daoStakingData.userBalance - gasReserve);
      
      if (numAmount > availableBalance) {
        newErrors.stake = `Insufficient balance. Available: ${availableBalance.toFixed(2)} MOVE (after gas reserve)`;
      }
      
      // Enhanced validation: Check against both contract minimum (6 MOVE) and DAO-specific minimum
      const contractMinimum = 6; // Contract enforces 6 MOVE minimum
      const daoMinimum = Math.max(daoStakingData.minStakeRequired, contractMinimum);
      
      if (numAmount < contractMinimum) {
        newErrors.stake = `Contract minimum is ${contractMinimum} MOVE tokens. You're trying to stake ${numAmount.toFixed(2)} MOVE.`;
      } else if (numAmount < daoMinimum && daoStakingData.userDaoStaked === 0) {
        newErrors.stake = `${dao.name} requires ${daoMinimum} MOVE minimum stake. You're trying to stake ${numAmount.toFixed(2)} MOVE.`;
      }
    } 
    
    // Check if after staking, user will meet DAO minimum (for membership status display)
    const newTotalStaked = daoStakingData.userDaoStaked + numAmount;
    if (newTotalStaked < daoStakingData.minStakeRequired) {
      newErrors.stake = `Total stake of ${newTotalStaked.toFixed(2)} tokens would be below ${daoStakingData.minStakeRequired} tokens minimum for ${dao.name} membership`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateUnstakeAmount = (amount: string): boolean => {
    const newErrors: {[key: string]: string} = {};
    const numAmount = parseFloat(amount);

    if (!amount || isNaN(numAmount)) {
      newErrors.unstake = 'Please enter a valid amount';
    } else if (numAmount <= 0) {
      newErrors.unstake = 'Amount must be greater than 0';
    } else if (numAmount > daoStakingData.userDaoStaked) {
      newErrors.unstake = 'Cannot unstake more than your staked amount';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStake = async () => {
    if (!validateStakeAmount(stakeAmount)) return;

    setIsStaking(true);
    try {
      if (!account || !signAndSubmitTransaction) throw new Error('Wallet not connected');
      const raw = parseFloat(stakeAmount);
      if (!Number.isFinite(raw) || raw <= 0) {
        setErrors({ stake: 'Enter a valid amount' });
        return;
      }
      
      // Check balance sufficiency using BalanceService BEFORE attempting register (avoid simulation error when 0 balance)
      const balanceCheck = await BalanceService.hasSufficientBalance(account.address, raw, 0.02);
      if (!balanceCheck.sufficient) {
        setErrors({ stake: `Insufficient balance. Available: ${BalanceService.formatBalance(balanceCheck.available)} MOVE, Required: ${BalanceService.formatBalance(balanceCheck.required)} MOVE` });
        return;
      }
      
      // Ensure MOVE (AptosCoin) is registered in wallet only after we know user can pay gas
      const isRegistered = await BalanceService.ensureAptosCoinRegistered(account.address, signAndSubmitTransaction);
      if (!isRegistered) {
        setErrors({ stake: 'Failed to register AptosCoin for this wallet. Please ensure you have some MOVE for gas, then try again.' });
        return;
      }
      
      const amountOctas = BalanceService.moveToOctas(raw);
      if (amountOctas === '0') {
        setErrors({ stake: 'Amount too small' });
        return;
      }
      const payload = {
        function: `${MODULE_ADDRESS}::staking::stake`,
        typeArguments: [],
        functionArguments: [dao.id, amountOctas],
      };
      const tx = await signAndSubmitTransaction({ payload } as any);
      if (tx && (tx as any).hash) {
        await aptosClient.waitForTransaction({ transactionHash: (tx as any).hash, options: { checkSuccess: true } });
      }
      
      // Optimistically update local state
      const stakeAmountNumber = parseFloat(stakeAmount);
      const newStakedAmount = daoStakingData.userDaoStaked + stakeAmountNumber;
      updateLocalState({
        stakedAmount: newStakedAmount,
        votingPower: newStakedAmount,
        isStaker: true,
        isMember: newStakedAmount >= daoStakingData.minStakeRequired
      });

      // Update last stake time to current time (for unstaking timer)
      setLastStakeTime(Math.floor(Date.now() / 1000));
      
      // Optimistically update wallet balance in the global state
      // Note: We'll refresh from blockchain shortly, this is just for immediate UI feedback
      
      setShowStakeForm(false);
      setStakeAmount('');
      
      // Refresh to get accurate on-chain state
      await Promise.all([
        refreshOnChain(),
        refreshPortfolio(), // Refresh wallet balance
        refreshBalance(), // Refresh wallet balance using hook
        refreshActivities() // Refresh user activities
      ]);
      
    } catch (error: any) {
      const msg = String(error?.message || error || '');
      console.error('Staking failed:', error);
      
      if (msg.includes('User rejected') || msg.includes('0x131')) {
        console.info('Stake canceled by user');
      } else if (msg.includes('insufficient') || msg.includes('balance') || msg.includes('0x6507')) {
        // Error 0x6507 = Insufficient balance for withdrawal
        const gasReserve = 0.02;
        const availableBalance = Math.max(0, daoStakingData.userBalance - gasReserve);
        setErrors({ stake: `Insufficient MOVE balance. Available: ${availableBalance.toFixed(2)} MOVE (need ${parseFloat(stakeAmount || '0').toFixed(2)} + gas)` });
      } else if (msg.includes('0x153') || msg.includes('min_stake_required')) {
        // Minimum stake requirement not met
        setErrors({ stake: `Must stake at least ${daoStakingData.minStakeRequired} MOVE to join ${dao.name}` });
      } else if (msg.includes('0x7') || msg.includes('already_exists')) {
        // User already has staked balance, this shouldn't happen but handle gracefully
        setErrors({ stake: 'Staking resource conflict. Please refresh and try again.' });
      } else {
        setErrors({ stake: `Staking failed: ${msg.substring(0, 100)}...` });
      }
    } finally {
      setIsStaking(false);
    }
  };

  const handleUnstake = async () => {
    if (!validateUnstakeAmount(unstakeAmount)) return;

    setIsUnstaking(true);
    try {
      if (!account || !signAndSubmitTransaction) throw new Error('Wallet not connected');
      const raw = parseFloat(unstakeAmount);
      if (!Number.isFinite(raw) || raw <= 0) {
        setErrors({ unstake: 'Enter a valid amount' });
        return;
      }
      const amountOctas = BalanceService.moveToOctas(raw);
      if (amountOctas === '0') {
        setErrors({ unstake: 'Amount too small' });
        return;
      }
      const stakedOctas = BalanceService.moveToOctas(daoStakingData.userDaoStaked);
      if (Number(amountOctas) > Number(stakedOctas)) {
        setErrors({ unstake: 'Cannot unstake more than your staked amount' });
        return;
      }
      const payload = {
        function: `${MODULE_ADDRESS}::staking::unstake`,
        typeArguments: [],
        functionArguments: [dao.id, amountOctas],
      };
      const tx = await signAndSubmitTransaction({ payload } as any);
      if (tx && (tx as any).hash) {
        await aptosClient.waitForTransaction({ transactionHash: (tx as any).hash, options: { checkSuccess: true } });
      }
      
      // Optimistically update local state
      const unstakeAmountNumber = parseFloat(unstakeAmount);
      const newStakedAmount = daoStakingData.userDaoStaked - unstakeAmountNumber;
      updateLocalState({
        stakedAmount: newStakedAmount,
        votingPower: newStakedAmount,
        isStaker: newStakedAmount > 0,
        isMember: newStakedAmount >= daoStakingData.minStakeRequired
      });
      
      // Optimistically update wallet balance in the global state
      // Note: We'll refresh from blockchain shortly, this is just for immediate UI feedback
      
      setShowUnstakeForm(false);
      setUnstakeAmount('');
      
      // Refresh to get accurate on-chain state
      await Promise.all([
        refreshOnChain(),
        refreshPortfolio(), // Refresh wallet balance
        refreshBalance(), // Refresh wallet balance using hook
        refreshActivities() // Refresh user activities
      ]);
      
    } catch (error: any) {
      const msg = String(error?.message || error || '');
      if (msg.includes('User rejected') || msg.includes('0x131')) {
        console.info('Unstake canceled by user');
      } else if (msg.includes('0x305') || msg.toLowerCase().includes('time_lock_active') || msg.includes('invalid_time')) {
        setErrors({ unstake: 'Unstaking is locked for 1 hour after your last stake transaction. Please try again later.' });
      } else if (msg.includes('0x301') || msg.toLowerCase().includes('invalid_unstake_amount')) {
        setErrors({ unstake: 'Invalid amount to unstake.' });
      } else {
        console.error('Unstaking failed:', error);
        setErrors({ unstake: 'Unstaking transaction failed. Please try again.' });
      }
    } finally {
      setIsUnstaking(false);
    }
  };

  const handleClaimRewards = async () => {
    try {
      if (!account || !signAndSubmitTransaction) throw new Error('Wallet not connected');
      const payload = {
        function: `${MODULE_ADDRESS}::rewards::claim_rewards`,
        typeArguments: [],
        functionArguments: [dao.id],
      };
      const tx = await signAndSubmitTransaction({ payload } as any);
      if (tx && (tx as any).hash) {
        await aptosClient.waitForTransaction({ transactionHash: (tx as any).hash, options: { checkSuccess: true } });
      }
      await refreshOnChain();
      
    } catch (error) {
      console.error('Claiming rewards failed:', error);
    }
  };

  const handleJoinDAO = async () => {
    try {
      if (!account || !signAndSubmitTransaction) throw new Error('Wallet not connected');
      if (daoStakingData.userDaoStaked < daoStakingData.minStakeRequired) {
        setErrors({ stake: `Stake at least ${daoStakingData.minStakeRequired} MOVE to join.` });
        return;
      }
      setIsJoining(true);
      const payload = {
        function: `${MODULE_ADDRESS}::membership::join`,
        typeArguments: [],
        functionArguments: [dao.id],
      };
      const tx = await signAndSubmitTransaction({ payload } as any);
      if (tx && (tx as any).hash) {
        await aptosClient.waitForTransaction({ transactionHash: (tx as any).hash, options: { checkSuccess: true } });
      }
      
      // Optimistically update membership status
      updateLocalState({
        isMember: true,
        memberSince: Date.now()
      });
      
      await Promise.all([
        refreshOnChain(),
        refreshPortfolio(), // Refresh wallet balance
        refreshBalance(), // Refresh wallet balance using hook
        refreshActivities() // Refresh user activities
      ]);
    } catch (e) {
      console.error('Join DAO failed:', e);
      setErrors({ stake: 'Join transaction failed. Please try again.' });
    } finally {
      setIsJoining(false);
    }
  };

  const calculateProjectedRewards = () => {
    // Note: Rewards would be calculated based on participation in THIS DAO
    // but staking amount is global, so this is an estimate for this DAO only
    const stakingYield = 8.5; // This DAO's reward rate
    const dailyRate = stakingYield / 365 / 100;
    const dailyRewards = daoStakingData.userDaoStaked * dailyRate;
    const monthlyRewards = dailyRewards * 30;
    const yearlyRewards = daoStakingData.userDaoStaked * (stakingYield / 100);
    
    return {
      daily: dailyRewards,
      monthly: monthlyRewards,
      yearly: yearlyRewards
    };
  };

  const projectedRewards = calculateProjectedRewards();

  // Check unstaking availability
  const getUnstakingStatus = () => {
    if (lastStakeTime === 0) {
      return { canUnstake: true, waitTime: 0, message: 'Available' };
    }

    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    const timeSinceStake = now - lastStakeTime;
    const requiredWaitTime = 3600; // 1 hour in seconds
    const remainingTime = Math.max(0, requiredWaitTime - timeSinceStake);

    if (remainingTime <= 0) {
      return { canUnstake: true, waitTime: 0, message: 'Available' };
    } else {
      const minutes = Math.ceil(remainingTime / 60);
      return { 
        canUnstake: false, 
        waitTime: remainingTime, 
        message: `Wait ${minutes} minute${minutes !== 1 ? 's' : ''}` 
      };
    }
  };

  const unstakingStatus = getUnstakingStatus();


  return (
    <div className="container mx-auto px-3 sm:px-6 max-w-screen-lg space-y-4">
      
      {balanceError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <div className="flex-1">
              <p className="text-red-300 font-medium text-sm">Balance Error</p>
              <p className="text-red-200 text-xs">{balanceError}</p>
              <button
                onClick={refreshBalance}
                className="mt-1 px-2 py-1 bg-red-600/20 text-red-300 rounded text-xs hover:bg-red-600/30"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {balanceLoading && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
            <p className="text-gray-300 text-sm">Fetching wallet balance...</p>
          </div>
        </div>
      )}

      {/* Important Staking Information Panel */}
      <div className="mb-4">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-white">How Staking Works in {dao.name}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium text-gray-300">Requirements:</h4>
                <ul className="space-y-1 text-gray-400 ml-4">
                  <li>• Contract minimum: <span className="text-green-400 font-medium">6 MOVE tokens</span></li>
                  <li>• {dao.name} minimum: <span className="text-orange-400 font-medium">{daoStakingData.minStakeRequired > 0 ? `${daoStakingData.minStakeRequired} MOVE` : 'Loading...'}</span></li>
                  <li>• Gas reserve: <span className="text-yellow-400">~0.02 MOVE</span> for transactions</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-300">Benefits:</h4>
                <ul className="space-y-1 text-gray-400 ml-4">
                  <li>• DAO membership and governance rights</li>
                  <li>• 1:1 voting power (stake = votes)</li>
                  <li>• Earn rewards from DAO activities</li>
                  <li>• Participate in proposals and decisions</li>
                </ul>
              </div>
            </div>
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-300 text-sm flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span><strong>Important:</strong> Unstaking has a 1-hour lock period to prevent gaming. Falling below minimum stake removes DAO membership.</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* DAO Staking Header */}
      <div className="professional-card rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Coins className="w-5 h-5 text-orange-400" />
            <div>
              <h2 className="text-lg font-bold text-white">Staking Dashboard</h2>
              <p className="text-gray-400 text-sm">Your position in {dao.name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {daoStakingData.isMember ? (
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-500/20 text-green-300 rounded-lg border border-green-500/30">
                <UserCheck className="w-4 h-4" />
                <span className="text-sm font-medium">Member</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-500/20 text-gray-300 rounded-lg border border-gray-500/30">
                <UserX className="w-4 h-4" />
                <span className="text-sm font-medium">Not Member</span>
              </div>
            )}
          </div>
        </div>

        {/* DAO Staking Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Coins className="w-4 h-4 text-blue-400" />
                <span className="text-white font-medium text-sm">Staked</span>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-300">
                  {daoStakingData.userDaoStaked.toFixed(2)}
                </div>
                <div className="text-xs text-gray-400">MOVE</div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <span className="text-white font-medium text-sm">Voting</span>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-purple-300">
                  {daoStakingData.userVotingPower.toFixed(0)}
                </div>
                <div className="text-xs text-gray-400">Power</div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-green-400" />
                <span className="text-white font-medium text-sm">Rewards</span>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-green-300">
                  {daoRewardsData.totalClaimable.toFixed(2)}
                </div>
                <div className="text-xs text-gray-400">Claimable</div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-orange-400" />
                <span className="text-white font-medium text-sm">Required</span>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-orange-300">
                  {Number(daoStakingData.minStakeRequired || 0).toFixed(0)}
                </div>
                <div className="text-xs text-gray-400">Min</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Membership Status Alert */}
      {!daoStakingData.isMember && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-orange-300 font-medium text-sm mb-1">Not a Member of {dao.name}</p>
              <p className="text-orange-200 text-xs">
                Need {Number(daoStakingData.minStakeRequired||0).toFixed(0)} MOVE • Current: {daoStakingData.userDaoStaked.toFixed(2)} MOVE
                {daoStakingData.userBalance < daoStakingData.minStakeRequired + 0.02 && (
                  <span className="block mt-1 text-red-300">
                    ⚠️ Need {(daoStakingData.minStakeRequired + 0.02 - daoStakingData.userBalance).toFixed(2)} more MOVE
                  </span>
                )}
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <div style={{
                  background: (isJoining || daoStakingData.userDaoStaked < daoStakingData.minStakeRequired) 
                    ? 'linear-gradient(45deg, #4b5563, #6b7280)' 
                    : 'linear-gradient(45deg, #ffc30d, #b80af7)',
                  borderRadius: '13px',
                  padding: '2px',
                  display: 'inline-block',
                }}>
                  <button
                    onClick={handleJoinDAO}
                    disabled={isJoining || daoStakingData.userDaoStaked < daoStakingData.minStakeRequired}
                    className="px-4 py-2 font-medium text-sm transition-all w-full h-full"
                    style={{
                      background: '#121212',
                      borderRadius: '11px',
                      border: 'none',
                      color: (isJoining || daoStakingData.userDaoStaked < daoStakingData.minStakeRequired) ? '#9ca3af' : '#fff',
                      cursor: (isJoining || daoStakingData.userDaoStaked < daoStakingData.minStakeRequired) ? 'not-allowed' : 'pointer',
                      opacity: (isJoining || daoStakingData.userDaoStaked < daoStakingData.minStakeRequired) ? 0.5 : 1,
                    }}
                  >
                    {isJoining ? 'Joining...' : 'Join DAO'}
                  </button>
                </div>
                {daoStakingData.userDaoStaked < daoStakingData.minStakeRequired && (
                  <button
                    onClick={() => {
                      setActiveTab('stake');
                      setShowStakeForm(true);
                      const needed = daoStakingData.minStakeRequired - daoStakingData.userDaoStaked;
                      setStakeAmount(needed.toFixed(2));
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium"
                  >
                    Stake {(daoStakingData.minStakeRequired - daoStakingData.userDaoStaked).toFixed(2)} MOVE
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {daoStakingData.isMember && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <FaCheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            <div className="text-center sm:text-left">
              <p className="text-green-300 font-medium text-sm sm:text-base">✓ Member of {dao.name}</p>
              <p className="text-green-200 text-xs sm:text-sm">
                You have {daoStakingData.userDaoStaked.toFixed(2)} MOVE staked in this DAO and can participate in governance.
                {daoStakingData.userBalance > 1 && (
                  <span className="block mt-1">
                    You can stake in other DAOs with your remaining {daoStakingData.userBalance.toFixed(2)} MOVE balance.
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-1 bg-white/5 rounded-xl p-1">
        {[
          { id: 'overview', label: 'Overview', icon: Shield },
          { id: 'stake', label: 'Stake & Unstake', icon: Coins },
          { id: 'rewards', label: 'Rewards', icon: Award },
          { id: 'history', label: 'All Activities', icon: History }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 sm:py-3 rounded-xl font-medium transition-all text-sm ${
                activeTab === tab.id
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.id === 'overview' ? 'Overview' : tab.id === 'stake' ? 'Stake' : tab.id === 'rewards' ? 'Rewards' : 'Activities'}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 gap-6">
          {/* DAO Staking Overview */}
          <div className="professional-card rounded-xl p-6">
            <h3 className="text-xl font-bold text-white flex items-center space-x-2 mb-6">
              <Shield className="w-5 h-5 text-blue-400" />
              <span>{dao.name} Staking Pool</span>
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Coins className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-white font-medium">Total in DAO Vault</span>
                </div>
                <span className="text-white">{daoStakingData.totalStakedInDAO.toLocaleString()} tokens</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Users className="w-4 h-4 text-green-400" />
                  </div>
                  <span className="text-white font-medium">Global Stakers</span>
                </div>
                <span className="text-white">{daoStakingData.totalStakers.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <Calculator className="w-4 h-4 text-yellow-400" />
                  </div>
                  <span className="text-white font-medium">Reward Rate</span>
                </div>
                <span className="text-white">Based on participation</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-500/20 rounded-lg">
                    <Lock className="w-4 h-4 text-orange-400" />
                  </div>
                  <span className="text-white font-medium">Min. Stake Required</span>
                </div>
                <span className="text-white">{daoStakingData.minStakeRequired} tokens</span>
              </div>
            </div>
          </div>

          {/* Your Position */}
          <div className="professional-card rounded-xl p-6">
            <h3 className="text-xl font-bold text-white flex items-center space-x-2 mb-6">
              <UserCheck className="w-5 h-5 text-green-400" />
              <span>Your Position</span>
            </h3>

            <div className="space-y-4">
              <div className="text-center mb-6 p-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl">
                <p className="text-3xl font-bold text-white mb-1">{daoStakingData.userDaoStaked.toFixed(2)} MOVE</p>
                <p className="text-gray-400">Your Stake in {dao.name}</p>
                {daoStakingData.isMember && (
                  <p className="text-green-400 text-sm mt-2">
                    Member of {dao.name}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Voting Power (in this DAO)</span>
                  <span className="text-white font-medium">{daoStakingData.userVotingPower.toFixed(0)} MOVE</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{dao.name} Membership</span>
                  <span className={`font-medium ${daoStakingData.isMember ? 'text-green-400' : 'text-red-400'}`}>
                    {daoStakingData.isMember ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Wallet Balance</span>
                  <span className="text-white font-medium">{daoStakingData.userBalance.toFixed(2)} MOVE</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Min. for {dao.name}</span>
                  <span className="text-orange-400 font-medium">{Number(daoStakingData.minStakeRequired || 0).toFixed(0)} MOVE</span>
                </div>
                <div className="flex items-center justify-between text-sm border-t border-white/10 pt-3">
                  <span className="text-gray-400">Est. Monthly from {dao.name}</span>
                  <span className="text-green-400 font-medium">{projectedRewards.monthly.toFixed(2)} MOVE</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'stake' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stake Section */}
          <div className="professional-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                <Lock className="w-5 h-5 text-green-400" />
                <span>Stake tokens</span>
              </h3>
              <button
                onClick={() => setShowStakeForm(!showStakeForm)}
                className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-xl text-sm font-medium border border-green-500/30 transition-all"
              >
                {showStakeForm ? 'Cancel' : 'Stake'}
              </button>
            </div>

            {showStakeForm && (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Amount to Stake (tokens)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={daoStakingData.userBalance}
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      className={`professional-input w-full px-4 py-3 rounded-xl ${errors.stake ? 'border-red-500' : ''}`}
                      placeholder="Enter amount to stake"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex space-x-1">
                      <button
                        onClick={() => {
                          const gasReserve = 0.02;
                          const availableBalance = Math.max(0, daoStakingData.userBalance - gasReserve);
                          const minStakeForDAO = Math.max(daoStakingData.minStakeRequired, 6); // Contract minimum is 6 MOVE
                          const currentStaked = daoStakingData.userDaoStaked;
                          
                          // Calculate what user needs to reach minimum
                          const neededForMin = Math.max(0, minStakeForDAO - currentStaked);
                          
                          if (neededForMin > 0 && availableBalance >= neededForMin) {
                            setStakeAmount(neededForMin.toFixed(2));
                          } else if (availableBalance >= 6) {
                            setStakeAmount('6.00'); // Fallback to contract minimum
                          } else {
                            setStakeAmount(availableBalance.toFixed(2));
                          }
                        }}
                        className="text-xs text-green-400 hover:text-green-300 px-1 font-medium"
                        title={`Set to minimum required (${Math.max(daoStakingData.minStakeRequired, 6)} MOVE)`}
                      >
                        MIN
                      </button>
                      <button
                        onClick={() => {
                          const gasReserve = 0.02;
                          const availableBalance = Math.max(0, daoStakingData.userBalance - gasReserve);
                          if (availableBalance > 0) {
                            setStakeAmount(availableBalance.toFixed(2));
                          }
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300 px-1 font-medium"
                        title="Set to maximum available balance (after gas reserve)"
                      >
                        MAX
                      </button>
                    </div>
                  </div>
                  {errors.stake && <p className="text-red-400 text-sm mt-1">{errors.stake}</p>}
                </div>

                <div className="bg-white/5 rounded-xl p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Available Balance</p>
                      <p className="text-white font-medium">
                        {balanceLoading ? (
                          <span className="animate-pulse">Loading...</span>
                        ) : (
                          `${Math.max(0, daoStakingData.userBalance - 0.02).toFixed(2)} MOVE`
                        )}
                      </p>
                      <p className="text-xs text-gray-500">(after 0.02 gas reserve)</p>
                      {daoStakingData.userBalance === 0 && !balanceLoading && (
                        <p className="text-xs text-red-400 mt-1">⚠️ No balance detected - Visit faucet to get testnet MOVE</p>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-400">Min. for {dao.name}</p>
                      <p className={`font-medium ${
                        daoStakingData.userBalance >= daoStakingData.minStakeRequired + 0.02 
                          ? 'text-green-400' 
                          : 'text-red-400'
                      }`}>
                        {daoStakingData.minStakeRequired > 0 
                          ? `${daoStakingData.minStakeRequired.toFixed(0)} MOVE`
                          : 'Loading...'
                        }
                      </p>
                      <p className="text-xs text-gray-500">
                        {daoStakingData.minStakeRequired > 0 ? (
                          daoStakingData.userBalance >= daoStakingData.minStakeRequired + 0.02 
                            ? '✓ Can join' 
                            : '✗ Need more'
                        ) : (
                          'Fetching requirement...'
                        )}
                      </p>
                    </div>
                  </div>
                  
                  {/* Additional Info Panel */}
                  <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-blue-300 space-y-1">
                        <p><strong>Staking in {dao.name}:</strong></p>
                        <ul className="space-y-1 ml-2">
                          <li>• Minimum stake: {daoStakingData.minStakeRequired > 0 ? `${daoStakingData.minStakeRequired} MOVE` : 'Loading...'} (as set by DAO creator)</li>
                          <li>• Stake gives 1:1 voting power in this DAO only</li>
                          <li>• You can unstake after 1 hour (prevents gaming)</li>
                          <li>• Falling below minimum removes DAO membership</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleStake}
                  disabled={
                    isStaking ||
                    !stakeAmount ||
                    Number.isNaN(parseFloat(stakeAmount)) ||
                    parseFloat(stakeAmount) <= 0
                  }
                  className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all flex items-center justify-center space-x-2"
                >
                  {isStaking ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Staking...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Stake in {dao.name}</span>
                    </>
                  )}
                </button>
            {!stakingReady && (
              <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-300 text-sm">
                Preparing staking pool… checking readiness. You can still try to stake; if the pool isn’t ready yet, we’ll recheck automatically.
              </div>
            )}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Your Stake in {dao.name}</span>
                <span className="text-white font-medium">{daoStakingData.userDaoStaked.toFixed(2)} MOVE</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Voting Power (this DAO)</span>
                <span className="text-white font-medium">{daoStakingData.userVotingPower.toFixed(0)} MOVE</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Est. Daily from {dao.name}</span>
                <span className="text-green-400 font-medium">{projectedRewards.daily.toFixed(4)} MOVE</span>
              </div>
            </div>
          </div>

          {/* Unstake Section */}
          <div className="professional-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                <Unlock className="w-5 h-5 text-red-400" />
                <span>Unstake tokens</span>
              </h3>
              <button
                onClick={() => setShowUnstakeForm(!showUnstakeForm)}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl text-sm font-medium border border-red-500/30 transition-all"
              >
                {showUnstakeForm ? 'Cancel' : 'Unstake'}
              </button>
            </div>

            {showUnstakeForm && (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Amount to Unstake (tokens)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={daoStakingData.userDaoStaked}
                      value={unstakeAmount}
                      onChange={(e) => setUnstakeAmount(e.target.value)}
                      className={`professional-input w-full px-4 py-3 rounded-xl ${errors.unstake ? 'border-red-500' : ''}`}
                      placeholder="Enter amount to unstake"
                    />
                    <button
                      onClick={() => setUnstakeAmount(daoStakingData.userDaoStaked.toString())}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-red-400 hover:text-red-300"
                    >
                      MAX
                    </button>
                  </div>
                  {errors.unstake && <p className="text-red-400 text-sm mt-1">{errors.unstake}</p>}
                </div>

                {!unstakingStatus.canUnstake && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-yellow-400" />
                      <div className="text-sm text-yellow-300">
                        <p><strong>Time Lock Active:</strong> You must wait {unstakingStatus.message.toLowerCase()} before unstaking.</p>
                        <p className="text-xs text-yellow-200 mt-1">This prevents gaming of voting power and ensures fair governance.</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                  <div className="flex items-start space-x-2">
                    <Info className="w-4 h-4 text-yellow-400 mt-0.5" />
                    <div className="text-sm space-y-2">
                      <p className="text-yellow-300 font-medium">Important:</p>
                      <p className="text-yellow-200">
                        You must maintain at least {Number(daoStakingData.minStakeRequired||0).toFixed(0)} MOVE staked to remain a member of {dao.name}. Unstaking below this amount will remove your membership and voting rights.
                      </p>
                      <p className="text-yellow-200">
                        Unstaking is locked for 1 hour after your last stake transaction to prevent gaming. If you staked recently, you must wait 1 hour before unstaking.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleUnstake}
                  disabled={isUnstaking || !unstakeAmount || !unstakingStatus.canUnstake}
                  className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all flex items-center justify-center space-x-2"
                >
                  {isUnstaking ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Unstaking...</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>Unstake from {dao.name}</span>
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Your Stake to Unstake</span>
                <span className="text-white font-medium">{daoStakingData.userDaoStaked.toFixed(2)} MOVE</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Unstaking Status</span>
                <span className={`font-medium ${unstakingStatus.canUnstake ? 'text-green-400' : 'text-yellow-400'}`}>
                  {unstakingStatus.message}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">{dao.name} Membership</span>
                <span className={`font-medium ${daoStakingData.isMember ? 'text-green-400' : 'text-red-400'}`}>
                  {daoStakingData.isMember ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Min. for {dao.name}</span>
                <span className="text-orange-400 font-medium">{daoStakingData.minStakeRequired} MOVE</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'rewards' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Claimable Rewards */}
          <div className="professional-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                <Award className="w-5 h-5 text-yellow-400" />
                <span>Claimable Rewards</span>
              </h3>
              <button
                onClick={handleClaimRewards}
                disabled={daoRewardsData.totalClaimable === 0}
                className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 rounded-xl text-sm font-medium border border-yellow-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Claim All
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-4">
                <div className="text-center">
                    <p className="text-2xl font-bold text-white mb-2">{Number(daoRewardsData.totalClaimable || 0).toFixed(2)} MOVE</p>
                  <p className="text-yellow-300 text-sm">Total Claimable from {dao.name}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <TrendingUp className="w-4 h-4 text-blue-400" />
                    </div>
                    <span className="text-white font-medium">Voting Rewards</span>
                  </div>
                  <span className="text-white">—</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <FaCheckCircle className="w-4 h-4 text-green-400" />
                    </div>
                    <span className="text-white font-medium">Proposal Rewards</span>
                  </div>
                  <span className="text-white">—</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <Coins className="w-4 h-4 text-purple-400" />
                    </div>
                    <span className="text-white font-medium">Staking Rewards</span>
                  </div>
                  <span className="text-white">—</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <p className="text-blue-300 text-sm">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Last distribution: {daoRewardsData.lastDistribution ? ActivityTracker.formatTimeAgo(daoRewardsData.lastDistribution) : 'Never'}
                </p>
              </div>
            </div>
          </div>

          {/* Rewards Projection */}
          <div className="professional-card rounded-xl p-6">
            <h3 className="text-xl font-bold text-white flex items-center space-x-2 mb-6">
              <Calculator className="w-5 h-5 text-purple-400" />
              <span>Rewards Projection</span>
            </h3>

            <div className="space-y-4">
              <div className="text-center mb-6">
                <p className="text-3xl font-bold text-white">Based on Participation</p>
                <p className="text-gray-400">Reward Rate</p>
                <p className="text-sm text-gray-500 mt-1">Earned through {dao.name} activities</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <span className="text-gray-400">Daily Rewards</span>
                  <span className="text-white font-medium">{projectedRewards.daily.toFixed(4)} tokens</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <span className="text-gray-400">Monthly Rewards</span>
                  <span className="text-white font-medium">{projectedRewards.monthly.toFixed(2)} tokens</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <span className="text-gray-400">Yearly Rewards</span>
                  <span className="text-white font-medium">{projectedRewards.yearly.toFixed(2)} tokens</span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <h4 className="text-lg font-semibold text-white">Rewards Summary</h4>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Total Claimed</span>
                  <span className="text-green-400 font-medium">{daoRewardsData.totalClaimed.toFixed(2)} tokens</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Pending Claims</span>
                  <span className="text-yellow-400 font-medium">{daoRewardsData.totalClaimable.toFixed(2)} tokens</span>
                </div>
                <div className="flex items-center justify-between text-sm border-t border-white/10 pt-3">
                  <span className="text-gray-400">Total Earned from {dao.name}</span>
                  <span className="text-white font-bold">{(daoRewardsData.totalClaimed + daoRewardsData.totalClaimable).toFixed(2)} tokens</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="professional-card rounded-xl p-6">
          <div className="flex items-center space-x-2 mb-6">
            <History className="w-5 h-5 text-gray-400" />
            <span className="text-xl font-bold text-white">All Activities in {dao.name}</span>
          </div>

          <ActivityTable
            activities={allActivities}
            isLoading={activitiesLoading}
            error={activitiesError}
            onRefresh={refreshActivities}
            showUserColumn={false}
            showDAOColumn={false}
            showAmountColumn={true}
            className="mt-4"
          />
        </div>
      )}
    </div>
  );
};

export default DAOStaking;