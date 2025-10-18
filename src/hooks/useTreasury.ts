import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@razorlabs/razorkit';
import { aptosClient } from '../movement_service/movement-client';
import { safeView } from '../utils/rpcUtils';
import { MODULE_ADDRESS } from '../movement_service/constants';

interface TreasuryData {
  balance: number;
  dailyWithdrawalLimit: number;
  dailyWithdrawn: number;
  remainingDaily: number;
  lastWithdrawalDay: number;
  isLoading: boolean;
  error: string | null;
  treasuryObject?: string; // Store the treasury object address for object-based operations
  allowsPublicDeposits?: boolean;
}

interface TreasuryTransaction {
  type: 'deposit' | 'withdrawal';
  amount: number;
  from?: string;
  to?: string;
  timestamp: string;
  txHash: string;
}

export const useTreasury = (daoId: string) => {
  const { account, signAndSubmitTransaction } = useWallet();
  // Session cache with TTL + SWR (similar to Members)
  // @ts-ignore
  const treasurySessionCache: Map<string, any> = (window as any).__treasuryHookCache || ((window as any).__treasuryHookCache = new Map());
  // const TREASURY_TTL_MS = 5 * 60 * 1000; // 5 minutes fresh
  const TREASURY_MAX_STALE_MS = 10 * 60 * 1000; // 10 minutes allowable stale
  const cacheNow = Date.now();
  const cacheBaseKey = `dao_${daoId}`;
  const cacheUserKey = `${cacheBaseKey}_user_${account?.address || 'guest'}`;

  const getCached = <T,>(key: string): T | null => {
    const cached = treasurySessionCache.get(key);
    if (!cached) return null;
    const age = cacheNow - (cached.timestamp || 0);
    if (age < TREASURY_MAX_STALE_MS) return cached.data as T;
    return null;
  };

  const [treasuryData, setTreasuryData] = useState<TreasuryData>(() => {
    const cached = getCached<TreasuryData>(`${cacheBaseKey}_treasuryData`);
    if (cached) {
      return { ...cached, isLoading: false, error: null } as TreasuryData;
    }
    return {
    balance: 0,
    dailyWithdrawalLimit: 0,
    dailyWithdrawn: 0,
    remainingDaily: 0,
    lastWithdrawalDay: 0,
    isLoading: true,
    error: null
    };
  });

  const [transactions, setTransactions] = useState<TreasuryTransaction[]>(() => {
    const cached = getCached<TreasuryTransaction[]>(`${cacheBaseKey}_transactions`);
    return cached || [];
  });

  const [userBalance, setUserBalance] = useState<number>(() => {
    const cached = getCached<number>(`${cacheUserKey}_balance`);
    return typeof cached === 'number' ? cached : 0;
  });

  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    const cached = getCached<boolean>(`${cacheUserKey}_isAdmin`);
    return typeof cached === 'boolean' ? cached : false;
  });

  // Convert OCTAS to MOVE - using 1e8 (100,000,000) as per Movement blockchain standard
  const toMOVE = (octas: number): number => octas / 1e8;
  const fromMOVE = (move: number): number => Math.floor(move * 1e8);

  // Fetch user MOVE balance - exact same approach as DAOStaking
  const fetchUserBalance = useCallback(async () => {
    if (!account?.address) {
      setUserBalance(0);
      return;
    }
    
    try {
      const fetchWalletBalanceMOVE = async (): Promise<number> => {
        if (!account?.address) return 0;
        // 1) Try direct CoinStore for AptosCoin (MOVE)
        try {
          const res: any = await aptosClient.getAccountResource({
            accountAddress: account.address,
            resourceType: `0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>`,
          });
          const raw = Number(res?.data?.coin?.value ?? 0);
          const mv = raw / 1e8;
          if (mv > 0) return mv;
        } catch {}
        // 2) Try generic scan of resources for any CoinStore with non-zero value
        try {
          const resources: any[] = await (aptosClient as any).getAccountResources?.({ accountAddress: account.address });
          if (Array.isArray(resources)) {
            for (const r of resources) {
              if (typeof r?.type === 'string' && r.type.startsWith('0x1::coin::CoinStore<') && r.data?.coin?.value) {
                const raw = Number(r.data.coin.value || 0);
                if (raw > 0) return raw / 1e8;
              }
            }
          }
        } catch {}
        // 3) Last fallback: view function
        try {
          const balRes = await aptosClient.view({
            payload: {
              function: `0x1::coin::balance`,
              typeArguments: ["0x1::aptos_coin::AptosCoin"],
              functionArguments: [account.address],
            },
          });
          return Number(balRes[0] || 0) / 1e8;
        } catch {}
        return 0;
      };
      
      const walletBalance = await fetchWalletBalanceMOVE();
      setUserBalance(walletBalance);
      // cache user balance
      treasurySessionCache.set(`${cacheUserKey}_balance`, { data: walletBalance, timestamp: Date.now() });
    } catch (error) {
      console.error('Failed to fetch user balance:', error);
      setUserBalance(0);
    }
  }, [account?.address]);

  // Check if user is admin
  const checkAdminStatus = useCallback(async () => {
    if (!account?.address || !daoId) return;
    
    try {
      const result = await aptosClient.view({
        payload: {
          function: `${MODULE_ADDRESS}::admin::is_admin`,
          functionArguments: [daoId, account.address]
        }
      });
      const admin = Boolean(result[0]);
      setIsAdmin(admin);
      treasurySessionCache.set(`${cacheUserKey}_isAdmin`, { data: admin, timestamp: Date.now() });
    } catch (error) {
      console.warn('Failed to check admin status:', error);
      setIsAdmin(false);
    }
  }, [account?.address, daoId]);

  // Fetch treasury transactions from events (deposit/withdraw/reward)
  const fetchTreasuryTransactions = useCallback(async () => {
    try {
      if (!daoId) {
        setTransactions([]);
        return;
      }

      // Fetch treasury events from module account transactions
      let allEvents: any[] = [];

      try {
        const treasuryTransactions = await aptosClient.getAccountTransactions({
          accountAddress: MODULE_ADDRESS,
          options: { limit: 100 }
        });

        // Extract treasury events from transactions
        for (const tx of treasuryTransactions as any[]) {
          if (tx.events && Array.isArray(tx.events)) {
            for (const event of tx.events) {
              if (event.type && (
                event.type.includes('TreasuryDepositEvent') ||
                event.type.includes('TreasuryWithdrawalEvent') ||
                event.type.includes('TreasuryRewardWithdrawalEvent')
              )) {
                allEvents.push(event);
              }
            }
          }
        }
      } catch (err: any) {
        console.warn('Error fetching treasury transactions:', err.message);
      }

      // Categorize events
      const deposits = allEvents.filter(e => e.type?.includes('TreasuryDepositEvent'));
      const withdrawals = allEvents.filter(e => e.type?.includes('TreasuryWithdrawalEvent') && !e.type?.includes('Reward'));
      const rewards = allEvents.filter(e => e.type?.includes('TreasuryRewardWithdrawalEvent'));

      // Filter events for this specific DAO
      const filterForDAO = (events: any[]) => {
        return events.filter(e => {
          const daoAddr = e?.data?.movedao_addrxess || e?.data?.dao_address;
          return daoAddr === daoId;
        });
      };

      const daoDeposits = filterForDAO(deposits as any[]);
      const daoWithdrawals = filterForDAO(withdrawals as any[]);
      const daoRewards = filterForDAO(rewards as any[]);

      const mapTx = (ev: any): TreasuryTransaction | null => {
        const kind = ev?.type?.endsWith('TreasuryDepositEvent') ? 'deposit' : 'withdrawal';
        const data = ev?.data || {};
        const tsSec = Number(data.timestamp || 0);
        const amt = Number(data.amount || 0);
        if (!amt) return null;
        return {
          type: kind,
          amount: toMOVE(amt),
          from: data.depositor || undefined,
          to: data.withdrawer || undefined,
          timestamp: new Date((tsSec || 0) * 1000).toISOString(),
          txHash: data.transaction_hash || ev?.version || ev?.transaction_version || '',
        };
      };

      const txs: TreasuryTransaction[] = [];
      for (const e of daoDeposits) { const t = mapTx(e); if (t) txs.push(t); }
      for (const e of daoWithdrawals) { const t = mapTx(e); if (t) txs.push(t); }
      for (const e of daoRewards) {
        const data = (e as any)?.data || {};
        const tsSec = Number(data.timestamp || 0);
        const amt = Number(data.amount || 0);
        if (amt) {
          txs.push({
            type: 'withdrawal',
            amount: toMOVE(amt),
            from: undefined,
            to: data.recipient || undefined,
            timestamp: new Date((tsSec || 0) * 1000).toISOString(),
            txHash: data.transaction_hash || (e as any)?.version || (e as any)?.transaction_version || '',
          });
        }
      }

      txs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setTransactions(txs);
      treasurySessionCache.set(`${cacheBaseKey}_transactions`, { data: txs, timestamp: Date.now() });
    } catch (err) {
      console.warn('❌ Failed to fetch treasury transactions:', err);
      setTransactions([]);
    }
  }, [daoId]);

  // Fetch treasury data from blockchain
  const fetchTreasuryData = useCallback(async () => {
    if (!daoId) return;

    try {
      setTreasuryData(prev => ({ ...prev, isLoading: true, error: null }));
      // Fire object lookup and legacy balance in parallel for fastest first paint
      const [treasuryObjectRes, legacyBalanceRes] = await Promise.allSettled([
        safeView({ function: `${MODULE_ADDRESS}::dao_core_file::get_treasury_object`, functionArguments: [daoId] }, `treasury_obj_${daoId}`),
        safeView({ function: `${MODULE_ADDRESS}::treasury::get_balance`, functionArguments: [daoId] }, `treasury_legacy_${daoId}`),
      ]);

      let balance = 0;
      let treasuryObject: any = null;
      let dailyWithdrawalLimit = 0;
      let lastWithdrawalDay = 0;
      let dailyWithdrawn = 0;
      let allowsPublicDeposits = false;
      
      // If legacy balance is available and > 0, paint it immediately for faster UI feedback
      if (legacyBalanceRes.status === 'fulfilled') {
        const quickBalanceRaw = (legacyBalanceRes as any).value?.[0];
        const quickBalance = Number(quickBalanceRaw || 0) / 1e8;
        if (quickBalance > 0) {
          setTreasuryData(prev => ({
            ...prev,
            balance: quickBalance,
            isLoading: false,
            error: null,
          }));
        }
      }

      // Use treasury object if available
      if (treasuryObjectRes.status === 'fulfilled' && (treasuryObjectRes as any).value) {
        const rawObj = ((treasuryObjectRes as any).value as any)?.[0];
        // Normalize to the underlying object address string (handles { inner, value, address } shapes)
        const objectAddress = typeof rawObj === 'string'
          ? rawObj
          : (rawObj?.inner || rawObj?.value || rawObj?.address || rawObj);
        treasuryObject = objectAddress;
        try {
          // Prefer full info when object is known - use the raw object directly
          const infoRes = await safeView({ function: `${MODULE_ADDRESS}::treasury::get_treasury_info`, functionArguments: [objectAddress] }, `treasury_info_${daoId}`);
          if (Array.isArray(infoRes) && infoRes.length >= 6) {
            balance = Number(infoRes[0] || 0) / 1e8;
            dailyWithdrawalLimit = Number(infoRes[1] || 0) / 1e8;
            lastWithdrawalDay = Number(infoRes[2] || 0);
            dailyWithdrawn = Number(infoRes[3] || 0) / 1e8;
            allowsPublicDeposits = Boolean(infoRes[5]);
          } else {
            // Fallback to balance-only view if needed
            const balanceResult = await safeView({ function: `${MODULE_ADDRESS}::treasury::get_balance_from_object`, functionArguments: [objectAddress] }, `treasury_obj_balance_${daoId}`);
            balance = Number(balanceResult[0] || 0) / 1e8;
          }
        } catch (error: any) {
          // Silent fallback to legacy
        }
      }
      
      // Use legacy balance if object approach failed or unavailable
      if (balance === 0 && legacyBalanceRes.status === 'fulfilled') {
        // @ts-ignore
        const legacy = Number((legacyBalanceRes as any).value?.[0] || 0) / 1e8;
        balance = legacy;
      }

      // Fallbacks if object path unavailable
      if (dailyWithdrawalLimit === 0) {
        dailyWithdrawalLimit = 10; // default in MOVE tokens: 10 MOVE
      }
      const currentDay = Math.floor(Date.now() / 1000 / 86400);
      const remainingDaily = dailyWithdrawalLimit - (lastWithdrawalDay === currentDay ? dailyWithdrawn : 0);

      const newTreasuryData = {
        balance: balance > 0 ? balance : (treasuryData.balance || 0),
        dailyWithdrawalLimit,
        dailyWithdrawn,
        remainingDaily,
        lastWithdrawalDay: currentDay,
        isLoading: false,
        error: null,
        treasuryObject, // Store the treasury object for future use
        allowsPublicDeposits
      };
      setTreasuryData(prev => ({ ...prev, ...newTreasuryData }));
      treasurySessionCache.set(`${cacheBaseKey}_treasuryData`, { data: { ...newTreasuryData }, timestamp: Date.now() });

    } catch (error: any) {
      // Set reasonable defaults for missing treasury data
      setTreasuryData({
        balance: 0,
        dailyWithdrawalLimit: 10,
        dailyWithdrawn: 0,
        remainingDaily: 10,
        lastWithdrawalDay: Math.floor(Date.now() / 1000 / 86400),
        isLoading: false,
        error: null, // Don't show error, just display 0 balance
        allowsPublicDeposits: true
      });
    }
  }, [daoId]);

  // Deposit tokens to treasury
  const deposit = useCallback(async (amount: number): Promise<boolean> => {
    if (!account || !signAndSubmitTransaction || !daoId) {
      throw new Error('Wallet not connected or DAO ID missing');
    }

    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    if (amount > userBalance) {
      throw new Error(`Insufficient balance. You have ${userBalance.toFixed(3)} MOVE available`);
    }

    try {
      const amountOctas = Math.floor(amount * 1e8);

      // Ensure user has AptosCoin store
      // Some networks/wallets do not expose an entry function for coin registration.
      // In such cases, receiving any amount of MOVE auto-creates the store.
      try {
        await aptosClient.getAccountResource({
          accountAddress: account.address,
          resourceType: `0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>`,
        });
      } catch (e) {
        console.log('AptosCoin store not found; skipping in-app registration.');
      }

      // Get treasury object
      let treasuryObject = treasuryData.treasuryObject;

      if (!treasuryObject) {
        try {
          const objectResult = await aptosClient.view({
            payload: {
              function: `${MODULE_ADDRESS}::dao_core_file::get_treasury_object`,
              functionArguments: [daoId]
            }
          });
          treasuryObject = (objectResult as any)?.[0];
          if (treasuryObject) {
            setTreasuryData(prev => ({ ...prev, treasuryObject }));
          }
        } catch (error) {
          console.error('Failed to fetch treasury object:', error);
        }
      }

      // Use object-based deposit if treasury object is available
      let payload;
      if (treasuryObject) {
        const objectAddress = typeof treasuryObject === 'string'
          ? treasuryObject
          : (treasuryObject as any).inner || (treasuryObject as any).value || treasuryObject;

        payload = {
          function: `${MODULE_ADDRESS}::treasury::deposit_to_object_typed`,
          type_arguments: ['0x1::aptos_coin::AptosCoin'],
          typeArguments: ['0x1::aptos_coin::AptosCoin'],
          functionArguments: [objectAddress, amountOctas.toString()],
          arguments: [objectAddress, amountOctas.toString()],
        };
      } else {
        payload = {
          function: `${MODULE_ADDRESS}::treasury::deposit`,
          typeArguments: [],
          functionArguments: [daoId, amountOctas.toString()],
        };
      }

      const tx = await signAndSubmitTransaction({ payload } as any);
      if (!tx || !(tx as any).hash) {
        throw new Error('Transaction cancelled by user');
      }
      if (tx && (tx as any).hash) {
        await aptosClient.waitForTransaction({
          transactionHash: (tx as any).hash,
          options: { checkSuccess: true }
        });
      }

      await Promise.all([fetchTreasuryData(), fetchUserBalance(), fetchTreasuryTransactions()]);
      return true;

    } catch (error: any) {
      console.error('Deposit failed:', error);

      if (error.message?.includes('User rejected')) {
        throw new Error('Transaction cancelled by user');
      } else if (error.message?.includes('not an entry function')) {
        throw new Error('Wallet error: attempted to call a non-entry function. Please try again.');
      } else if (error.message?.includes('insufficient') || error.message?.includes('0x6507')) {
        throw new Error('Insufficient MOVE balance for transaction and gas fees');
      } else if (error.message?.includes('0x97') || error.message?.includes('not_member')) {
        const publicDepositsStatus = treasuryData.allowsPublicDeposits ? 'enabled' : 'disabled';
        throw new Error(`Deposit denied: You must be a DAO member or admin to deposit. Public deposits are currently ${publicDepositsStatus}. ${treasuryData.allowsPublicDeposits ? 'This may be a contract bug - public deposits should allow anyone to deposit.' : 'Ask a DAO admin to enable public deposits or join as a member first.'}`);
      } else if (error.message?.includes('0xa') || error.message?.includes('already_exists')) {
        throw new Error('Object or resource already exists. This may be due to an invalid treasury object format or a duplicate registration.');
      } else if (error.message?.includes('0x8') || error.message?.includes('not_found')) {
        throw new Error('Treasury not found. This DAO may use a newer treasury system that requires different deposit methods.');
      } else if (error.message?.includes('0x1') || error.message?.includes('not_admin')) {
        throw new Error('Permission denied. You may not have the required permissions to deposit to this treasury.');
      } else {
        throw new Error(error.message || 'Deposit transaction failed');
      }
    }
  }, [account, signAndSubmitTransaction, daoId, userBalance, fetchTreasuryData, fetchUserBalance]);

  // Withdraw tokens from treasury (admin only)
  const withdraw = useCallback(async (amount: number): Promise<boolean> => {
    if (!account || !signAndSubmitTransaction || !daoId) {
      throw new Error('Wallet not connected or DAO ID missing');
    }

    if (!isAdmin) {
      throw new Error('Only DAO admins can withdraw from treasury');
    }

    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    if (amount > treasuryData.balance) {
      throw new Error(`Insufficient treasury balance. Available: ${treasuryData.balance.toFixed(3)} MOVE`);
    }

    if (amount > treasuryData.remainingDaily) {
      throw new Error(`Exceeds daily withdrawal limit. Remaining today: ${treasuryData.remainingDaily.toFixed(3)} MOVE`);
    }

    try {
      const amountOctas = Math.floor(amount * 1e8);

      // Use object-based withdraw function
      let payload;
      if (treasuryData.treasuryObject) {
        const objectAddress = typeof treasuryData.treasuryObject === 'string'
          ? treasuryData.treasuryObject
          : (treasuryData.treasuryObject as any).inner || (treasuryData.treasuryObject as any).value || treasuryData.treasuryObject;

        payload = {
          function: `${MODULE_ADDRESS}::treasury::withdraw_from_object`,
          typeArguments: [],
          functionArguments: [daoId, objectAddress, amountOctas.toString()],
        };
      } else {
        payload = {
          function: `${MODULE_ADDRESS}::treasury::withdraw`,
          typeArguments: [],
          functionArguments: [daoId, amountOctas.toString()],
        };
      }

      const tx = await signAndSubmitTransaction({ payload } as any);
      if (!tx || !(tx as any).hash) {
        throw new Error('Transaction cancelled by user');
      }
      if (tx && (tx as any).hash) {
        await aptosClient.waitForTransaction({ 
          transactionHash: (tx as any).hash, 
          options: { checkSuccess: true } 
        });
      }

      // Refresh data
      await Promise.all([fetchTreasuryData(), fetchUserBalance(), fetchTreasuryTransactions()]);
      return true;

    } catch (error: any) {
      console.error('Withdrawal failed:', error);
      
      if (error.message?.includes('User rejected')) {
        throw new Error('Transaction cancelled by user');
      } else if (error.message?.includes('not_admin') || error.message?.includes('0x1')) {
        throw new Error('Only DAO admins can withdraw from treasury');
      } else if (error.message?.includes('withdrawal_limit_exceeded')) {
        throw new Error('Daily withdrawal limit exceeded');
      } else if (error.message?.includes('insufficient_treasury')) {
        throw new Error('Insufficient treasury balance');
      } else if (error.message?.includes('0x8') || error.message?.includes('not_found')) {
        throw new Error('Treasury not found. This DAO may use a newer treasury system that requires different withdrawal methods.');
      } else {
        throw new Error(error.message || 'Withdrawal transaction failed');
      }
    }
  }, [account, signAndSubmitTransaction, daoId, isAdmin, treasuryData.balance, treasuryData.remainingDaily, fetchTreasuryData, fetchUserBalance]);

  // Initialize data fetching with timeout protection
  useEffect(() => {
    if (daoId) {
      // Always fetch treasury data - this includes balance and basic info
      const basicTasks = [fetchTreasuryData(), fetchTreasuryTransactions()];
      
      // Add wallet-specific tasks only if connected
      const allTasks = account?.address 
        ? [...basicTasks, fetchUserBalance(), checkAdminStatus()]
        : basicTasks;
      
      // Add timeout to prevent hanging on slow network (increased to 15 seconds)
      Promise.race([
        Promise.all(allTasks),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Treasury data fetch timeout')), 15000))
      ]).catch(() => {
        // Silent - data will still be available even if some requests timeout
      });
    }
  }, [daoId, account?.address, fetchTreasuryData, fetchUserBalance, checkAdminStatus, fetchTreasuryTransactions]);

  // Refresh data every 60 seconds
  useEffect(() => {
    if (!daoId) return;
    
    const interval = setInterval(() => {
      // Always refresh treasury data and transactions
      const basicTasks = [fetchTreasuryData(), fetchTreasuryTransactions()];
      
      // Add wallet-specific refresh only if connected
      const allTasks = account?.address 
        ? [...basicTasks, fetchUserBalance(), checkAdminStatus()]
        : basicTasks;
        
      Promise.all(allTasks);
    }, 60000);

    return () => clearInterval(interval);
  }, [daoId, account?.address, fetchTreasuryData, fetchUserBalance, checkAdminStatus, fetchTreasuryTransactions]);

  // Toggle public deposits (admin only)
  const togglePublicDeposits = useCallback(async (allow: boolean): Promise<boolean> => {
    if (!account || !signAndSubmitTransaction || !daoId) {
      throw new Error('Wallet not connected or DAO ID missing');
    }

    if (!isAdmin) {
      throw new Error('Only DAO admins can change public deposit settings');
    }

    try {
      let payload;
      if (treasuryData.treasuryObject) {
        const objectAddress = typeof treasuryData.treasuryObject === 'string'
          ? treasuryData.treasuryObject
          : (treasuryData.treasuryObject as any).inner || (treasuryData.treasuryObject as any).value || treasuryData.treasuryObject;

        payload = {
          function: `${MODULE_ADDRESS}::treasury::set_public_deposits`,
          typeArguments: [],
          functionArguments: [daoId, objectAddress, allow],
        };
      } else {
        throw new Error('Treasury object not found. Cannot toggle public deposits.');
      }

      const tx = await signAndSubmitTransaction({ payload } as any);
      if (tx && (tx as any).hash) {
        await aptosClient.waitForTransaction({ 
          transactionHash: (tx as any).hash, 
          options: { checkSuccess: true } 
        });
      }

      // Refresh treasury data to get updated public deposits setting
      await fetchTreasuryData();
      return true;

    } catch (error: any) {
      console.error('Toggle public deposits failed:', error);
      
      if (error.message?.includes('User rejected')) {
        throw new Error('Transaction cancelled by user');
      } else if (error.message?.includes('not_admin') || error.message?.includes('0x1')) {
        throw new Error('Only DAO admins can change public deposit settings');
      } else if (error.message?.includes('0x8') || error.message?.includes('not_found')) {
        throw new Error('Treasury not found. Cannot update public deposit settings.');
      } else {
        throw new Error(error.message || 'Failed to update public deposit settings');
      }
    }
  }, [account, signAndSubmitTransaction, daoId, isAdmin, treasuryData.treasuryObject, fetchTreasuryData]);

  // Vault-related functions
  const depositToDAOVault = useCallback(async (vaultAddress: string, amount: number): Promise<boolean> => {
    if (!account || !signAndSubmitTransaction || !treasuryData.treasuryObject) {
      throw new Error('Wallet not connected or treasury not available');
    }

    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    try {
      const amountRaw = Math.floor(amount * 1e6);

      const objectAddress = typeof treasuryData.treasuryObject === 'string'
        ? treasuryData.treasuryObject
        : (treasuryData.treasuryObject as any).inner || (treasuryData.treasuryObject as any).value || treasuryData.treasuryObject;

      const payload = {
        function: `${MODULE_ADDRESS}::treasury::user_deposit_to_vault`,
        typeArguments: [],
        functionArguments: [objectAddress, vaultAddress, amountRaw.toString()],
      };

      const tx = await signAndSubmitTransaction({ payload } as any);
      if (tx && (tx as any).hash) {
        await aptosClient.waitForTransaction({
          transactionHash: (tx as any).hash,
          options: { checkSuccess: true }
        });
      }

      return true;

    } catch (error: any) {
      console.error('Vault deposit failed:', error);

      if (error.message?.includes('User rejected')) {
        throw new Error('Transaction cancelled by user');
      } else if (error.message?.includes('not_member')) {
        throw new Error('You must be a DAO member to deposit to vaults');
      } else if (error.message?.includes('insufficient')) {
        throw new Error('Insufficient token balance');
      } else {
        throw new Error(error.message || 'Vault deposit failed');
      }
    }
  }, [account, signAndSubmitTransaction, treasuryData.treasuryObject]);

  const getDAOVaults = useCallback(async (): Promise<string[]> => {
    if (!treasuryData.treasuryObject) return [];

    try {
      const result = await aptosClient.view({
        payload: {
          function: `${MODULE_ADDRESS}::treasury::get_dao_vaults`,
          functionArguments: [treasuryData.treasuryObject]
        }
      });
      return (result[0] as string[]) || [];
    } catch (error) {
      console.warn('Failed to fetch DAO vaults:', error);
      return [];
    }
  }, [treasuryData.treasuryObject]);

  return {
    treasuryData,
    transactions,
    userBalance,
    isAdmin,
    deposit,
    withdraw,
    togglePublicDeposits,
    depositToDAOVault,
    getDAOVaults,
    refreshData: () => Promise.all([fetchTreasuryData(), fetchUserBalance(), checkAdminStatus(), fetchTreasuryTransactions()]),
    toMOVE,
    fromMOVE
  };
};