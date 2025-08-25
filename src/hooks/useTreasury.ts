import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@razorlabs/razorkit';
import { aptosClient } from '../movement_service/movement-client';
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
  const [treasuryData, setTreasuryData] = useState<TreasuryData>({
    balance: 0,
    dailyWithdrawalLimit: 0,
    dailyWithdrawn: 0,
    remainingDaily: 0,
    lastWithdrawalDay: 0,
    isLoading: true,
    error: null
  });

  const [transactions, setTransactions] = useState<TreasuryTransaction[]>([]);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

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
      setIsAdmin(Boolean(result[0]));
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

      // Determine which address emits events: prefer treasury object, else DAO address (legacy)
      let eventAccount = daoId;
      try {
        const objRes = await aptosClient.view({
          payload: { function: `${MODULE_ADDRESS}::dao_core_file::get_treasury_object`, functionArguments: [daoId] },
        });
        const rawObj = (objRes as any)?.[0];
        const objAddr = typeof rawObj === 'string' ? rawObj : rawObj?.inner || rawObj?.value || rawObj?.address;
        if (objAddr) eventAccount = objAddr;
      } catch {}

      const depositType = `${MODULE_ADDRESS}::treasury::TreasuryDepositEvent` as `${string}::${string}::${string}`;
      const withdrawType = `${MODULE_ADDRESS}::treasury::TreasuryWithdrawalEvent` as `${string}::${string}::${string}`;
      const rewardType = `${MODULE_ADDRESS}::treasury::TreasuryRewardWithdrawalEvent` as `${string}::${string}::${string}`;

      const [deposits, withdrawals, rewards] = await Promise.all([
        aptosClient.getAccountEventsByEventType({ accountAddress: eventAccount, eventType: depositType, options: { limit: 50 } }).catch(() => []),
        aptosClient.getAccountEventsByEventType({ accountAddress: eventAccount, eventType: withdrawType, options: { limit: 50 } }).catch(() => []),
        aptosClient.getAccountEventsByEventType({ accountAddress: eventAccount, eventType: rewardType, options: { limit: 50 } }).catch(() => []),
      ]);

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
      for (const e of deposits as any[]) { const t = mapTx(e); if (t) txs.push(t); }
      for (const e of withdrawals as any[]) { const t = mapTx(e); if (t) txs.push(t); }
      for (const e of rewards as any[]) {
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

      // Fallback to module-level events if account-level queries returned nothing (indexer variance)
      if (txs.length === 0) {
        const [modDeposits, modWithdrawals, modRewards] = await Promise.all([
          aptosClient.getModuleEventsByEventType({ eventType: depositType, options: { limit: 100 } }).catch(() => []),
          aptosClient.getModuleEventsByEventType({ eventType: withdrawType, options: { limit: 100 } }).catch(() => []),
          aptosClient.getModuleEventsByEventType({ eventType: rewardType, options: { limit: 100 } }).catch(() => []),
        ]);

        const filtered = [
          ...(modDeposits as any[]).filter(e => (e?.data?.movedaoaddrxess || e?.data?.dao_address) === daoId),
          ...(modWithdrawals as any[]).filter(e => (e?.data?.movedaoaddrxess || e?.data?.dao_address) === daoId),
          ...(modRewards as any[]).filter(e => (e?.data?.movedaoaddrxess || e?.data?.dao_address) === daoId),
        ];

        for (const e of filtered) {
          const kind = (e?.type || '').endsWith('TreasuryDepositEvent') ? 'deposit' : 'withdrawal';
          const data = (e as any).data || {};
          const tsSec = Number(data.timestamp || 0);
          const amt = Number(data.amount || 0);
          if (!amt) continue;
          txs.push({
            type: kind as any,
            amount: toMOVE(amt),
            from: data.depositor || undefined,
            to: data.withdrawer || data.recipient || undefined,
            timestamp: new Date((tsSec || 0) * 1000).toISOString(),
            txHash: data.transaction_hash || (e as any)?.version || '',
          });
        }
      }

      txs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setTransactions(txs);
    } catch (err) {
      console.warn('Failed to fetch treasury transactions:', err);
      setTransactions([]);
    }
  }, [daoId]);

  // Fetch treasury data from blockchain
  const fetchTreasuryData = useCallback(async () => {
    if (!daoId) return;

    try {
      setTreasuryData(prev => ({ ...prev, isLoading: true, error: null }));

      // Try to get treasury object address first
      console.log('Fetching treasury object for DAO:', daoId);
      let treasuryObjectRes = { status: 'rejected' as const, value: null };
      try {
        const objectResult = await aptosClient.view({
          payload: {
            function: `${MODULE_ADDRESS}::dao_core_file::get_treasury_object`,
            functionArguments: [daoId]
          }
        });
        console.log('Treasury object fetch result:', objectResult);
        treasuryObjectRes = { status: 'fulfilled' as const, value: objectResult };
      } catch (error) {
        console.log('Treasury object fetch failed:', error);
      }

      // Try legacy balance as fallback
      let legacyBalanceRes = { status: 'rejected' as const, value: null };
      try {
        const balanceResult = await aptosClient.view({
          payload: {
            function: `${MODULE_ADDRESS}::treasury::get_balance`,
            functionArguments: [daoId]
          }
        });
        console.log('Legacy balance fetch result:', balanceResult);
        legacyBalanceRes = { status: 'fulfilled' as const, value: balanceResult };
      } catch (error) {
        console.log('Legacy balance fetch failed:', error);
      }

      let balance = 0;
      let treasuryObject: any = null;
      let dailyWithdrawalLimit = 0;
      let lastWithdrawalDay = 0;
      let dailyWithdrawn = 0;
      let allowsPublicDeposits = false;
      
      // Use treasury object if available
      if (treasuryObjectRes.status === 'fulfilled' && treasuryObjectRes.value) {
        const rawObj = (treasuryObjectRes.value as any)?.[0];
        console.log('Raw treasury object:', rawObj);
        // Store the raw object for Move function calls, but extract address for view calls
        treasuryObject = rawObj;
        const objectAddress = typeof rawObj === 'string' ? rawObj : (rawObj?.inner || rawObj?.value || rawObj?.address || null);
        console.log('Extracted treasury object address:', objectAddress);
        try {
          // Prefer full info when object is known
          const infoRes = await aptosClient.view({
            payload: {
              function: `${MODULE_ADDRESS}::treasury::get_treasury_info`,
              functionArguments: [objectAddress]
            }
          });
          if (Array.isArray(infoRes) && infoRes.length >= 6) {
            balance = Number(infoRes[0] || 0) / 1e8;
            dailyWithdrawalLimit = Number(infoRes[1] || 0) / 1e8;
            lastWithdrawalDay = Number(infoRes[2] || 0);
            dailyWithdrawn = Number(infoRes[3] || 0) / 1e8;
            allowsPublicDeposits = Boolean(infoRes[5]);
          } else {
            // Fallback to balance-only view if needed
            const balanceResult = await aptosClient.view({
              payload: {
                function: `${MODULE_ADDRESS}::treasury::get_balance_from_object`,
                functionArguments: [treasuryObject]
              }
            });
            balance = Number(balanceResult[0] || 0) / 1e8;
          }
        } catch (error) {
          console.warn('Object-based info fetch failed:', error);
        }
      }
      
      // Use legacy balance if object approach failed or unavailable
      if (balance === 0 && legacyBalanceRes.status === 'fulfilled') {
        balance = Number(legacyBalanceRes.value[0] || 0) / 1e8;
      }

      // Fallbacks if object path unavailable
      if (dailyWithdrawalLimit === 0) {
        dailyWithdrawalLimit = 10; // default in MOVE tokens: 10 MOVE
      }
      const currentDay = Math.floor(Date.now() / 1000 / 86400);
      const remainingDaily = dailyWithdrawalLimit - (lastWithdrawalDay === currentDay ? dailyWithdrawn : 0);

      const newTreasuryData = {
        balance,
        dailyWithdrawalLimit,
        dailyWithdrawn,
        remainingDaily,
        lastWithdrawalDay: currentDay,
        isLoading: false,
        error: null,
        treasuryObject, // Store the treasury object for future use
        allowsPublicDeposits
      };
      console.log('Setting treasury data with object:', newTreasuryData.treasuryObject);
      setTreasuryData(newTreasuryData);

    } catch (error: any) {
      console.warn('Treasury data fetch failed, using defaults:', error.message);
      
      // For network issues, set reasonable defaults instead of error state
      const isNetworkError = error.message?.includes('timeout') || 
                            error.message?.includes('429') || 
                            error.message?.includes('Network Error') ||
                            error.message?.includes('CORS');
      
      if (isNetworkError) {
        setTreasuryData({
          balance: 0,
          dailyWithdrawalLimit: 10,
          dailyWithdrawn: 0,
          remainingDaily: 10,
          lastWithdrawalDay: Math.floor(Date.now() / 1000 / 86400),
          isLoading: false,
          error: 'Unable to load treasury data due to network issues',
          allowsPublicDeposits: true
        });
      } else {
        setTreasuryData(prev => ({
          ...prev,
          isLoading: false,
          error: error.message || 'Failed to fetch treasury data'
        }));
      }
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
      
      // Debug: Check treasury setup thoroughly
      console.log('=== Treasury Debug Info ===');
      console.log('DAO ID:', daoId);
      console.log('Treasury Object:', treasuryData.treasuryObject);
      console.log('Full treasury data:', treasuryData);
      console.log('User Address:', account.address);
      console.log('Amount to deposit:', amount, 'MOVE');
      console.log('Amount in Octas:', amountOctas.toString());
      
      // Check treasury balance
      try {
        const treasuryBalance = await aptosClient.view({
          payload: {
            function: `${MODULE_ADDRESS}::treasury::get_balance`,
            functionArguments: [daoId]
          }
        });
        console.log('Treasury balance check:', treasuryBalance);
      } catch (e) {
        console.log('Treasury balance check failed:', e);
      }
      
      // Check if user is a member
      try {
        const isMember = await aptosClient.view({
          payload: {
            function: `${MODULE_ADDRESS}::membership::is_member`,
            functionArguments: [daoId, account.address]
          }
        });
        console.log('User is member:', isMember);
      } catch (e) {
        console.log('Member check failed:', e);
      }
      
      // Check user's coin store
      try {
        const coinStore = await aptosClient.getAccountResource({
          accountAddress: account.address,
          resourceType: `0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>`,
        });
        console.log('User has AptosCoin store:', !!coinStore);
      } catch (e) {
        console.log('User AptosCoin store check failed:', e);
      }
      
      // Ensure user has AptosCoin registered
      try {
        await aptosClient.getAccountResource({
          accountAddress: account.address,
          resourceType: `0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>`,
        });
      } catch {
        // Register AptosCoin only if not already registered
        try {
          const registerPayload = {
            function: `0x1::coin::register`,
            typeArguments: ["0x1::aptos_coin::AptosCoin"],
            functionArguments: [],
          };
          const regTx = await signAndSubmitTransaction({ payload: registerPayload } as any);
          if (regTx && (regTx as any).hash) {
            await aptosClient.waitForTransaction({ 
              transactionHash: (regTx as any).hash, 
              options: { checkSuccess: true } 
            });
          }
        } catch (regError: any) {
          // Ignore "already exists" error for AptosCoin registration
          if (!regError.message?.includes('0x8') && !regError.message?.includes('already_exists')) {
            throw regError;
          }
        }
      }

      // Force refresh treasury data to get the object if missing
      if (!treasuryData.treasuryObject) {
        console.log('Treasury object missing, fetching directly for DAO:', daoId);
        
        // First check if DAO exists
        try {
          const daoExists = await aptosClient.view({
            payload: {
              function: `${MODULE_ADDRESS}::dao_core_file::dao_exists`,
              functionArguments: [daoId]
            }
          });
          console.log('DAO exists check result:', daoExists);
          
          if (!(daoExists as any)?.[0]) {
            throw new Error(`DAO ${daoId} does not exist or was not properly created`);
          }
        } catch (error) {
          console.error('DAO existence check failed:', error);
          throw new Error(`Cannot verify DAO existence: ${error}`);
        }

        // Then try to get treasury object
        try {
          const objectResult = await aptosClient.view({
            payload: {
              function: `${MODULE_ADDRESS}::dao_core_file::get_treasury_object`,
              functionArguments: [daoId]
            }
          });
          console.log('Treasury object fetch result:', objectResult);
          const rawObj = (objectResult as any)?.[0];
          if (rawObj) {
            // Update treasury data with the found object
            setTreasuryData(prev => ({ ...prev, treasuryObject: rawObj }));
            console.log('Direct fetch successful, treasury object:', rawObj);
          } else {
            console.error('Treasury object fetch returned null/undefined');
          }
        } catch (error) {
          console.error('Failed to fetch treasury object directly:', error);
          // Try to provide more specific error information
          if ((error as any)?.message?.includes('MISSING_DATA')) {
            throw new Error(`DAO ${daoId} exists but has no treasury object. This DAO may have been created incorrectly.`);
          }
          throw new Error(`Failed to fetch treasury object: ${error}`);
        }
      }

      // Use object-based deposit function (required for all modern DAOs)
      let payload;
      if (treasuryData.treasuryObject) {
        // Extract the inner address - this is what the Aptos SDK expects for Object types
        const objectAddr = (treasuryData.treasuryObject as any).inner;
        console.log('Using treasury object address:', objectAddr);
        payload = {
          function: `${MODULE_ADDRESS}::treasury::deposit_to_object`,
          typeArguments: [],
          functionArguments: [objectAddr, amountOctas.toString()],
        };
      } else {
        // If no object found, just use the legacy method
        // The 0x8 error from legacy might be due to treasury not being at DAO address
        // Let's try using the extracted object address directly with legacy method
        console.log('No treasury object in state, using legacy deposit method...');
        payload = {
          function: `${MODULE_ADDRESS}::treasury::deposit`,
          typeArguments: [],
          functionArguments: [daoId, amountOctas.toString()],
        };
      }

      const tx = await signAndSubmitTransaction({ payload } as any);
      if (tx && (tx as any).hash) {
        await aptosClient.waitForTransaction({ 
          transactionHash: (tx as any).hash, 
          options: { checkSuccess: true } 
        });
      }

      // Debug: Check what events were emitted
      if (tx && (tx as any).hash) {
        console.log('Treasury deposit transaction hash:', (tx as any).hash);
        try {
          const txDetails = await aptosClient.getTransactionByHash({
            transactionHash: (tx as any).hash
          });
          console.log('Events emitted:', (txDetails as any)?.events);
        } catch (e) {
          console.log('Failed to get transaction details:', e);
        }
      }

      // Refresh data
      await Promise.all([fetchTreasuryData(), fetchUserBalance(), fetchTreasuryTransactions()]);
      return true;

    } catch (error: any) {
      console.error('Deposit failed:', error);
      
      if (error.message?.includes('User rejected')) {
        throw new Error('Transaction cancelled by user');
      } else if (error.message?.includes('insufficient') || error.message?.includes('0x6507')) {
        throw new Error('Insufficient MOVE balance for transaction and gas fees');
      } else if (error.message?.includes('0x97') || error.message?.includes('not_member')) {
        throw new Error('Only DAO members or admins can deposit to this treasury.');
      } else if (error.message?.includes('0x8') || error.message?.includes('already_exists')) {
        throw new Error('Resource already exists. This could be a duplicate transaction or AptosCoin registration issue.');
      } else if (error.message?.includes('not_found')) {
        throw new Error('Treasury not found. This DAO may use a newer treasury system that requires different deposit methods.');
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

      // Use object-based withdraw function (correct method for new DAOs)
      let payload;
      if (treasuryData.treasuryObject) {
        // Extract the treasury object address properly
        const objArg = typeof treasuryData.treasuryObject === 'string' 
          ? treasuryData.treasuryObject 
          : (treasuryData.treasuryObject as any).inner || (treasuryData.treasuryObject as any).value || treasuryData.treasuryObject;
        
        console.log('Using treasury object for withdrawal:', objArg);
        payload = {
          function: `${MODULE_ADDRESS}::treasury::withdraw_from_object`,
          typeArguments: [],
          functionArguments: [daoId, objArg, amountOctas.toString()],
        };
      } else {
        // Fallback to legacy withdraw if no treasury object found
        console.log('Using legacy withdraw method');
        payload = {
          function: `${MODULE_ADDRESS}::treasury::withdraw`,
          typeArguments: [],
          functionArguments: [daoId, amountOctas.toString()],
        };
      }

      const tx = await signAndSubmitTransaction({ payload } as any);
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
    if (daoId && account?.address) {
      // Add timeout to prevent hanging on slow network
      Promise.race([
        Promise.all([
          fetchTreasuryData(),
          fetchUserBalance(),
          checkAdminStatus(),
          fetchTreasuryTransactions()
        ]),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Treasury data fetch timeout')), 8000))
      ]).catch((error) => {
        console.warn('Treasury initialization failed:', error);
      });
    }
  }, [daoId, account?.address, fetchTreasuryData, fetchUserBalance, checkAdminStatus, fetchTreasuryTransactions]);

  // Refresh data every 30 seconds
  useEffect(() => {
    if (!daoId || !account?.address) return;
    
    const interval = setInterval(() => {
      Promise.all([
        fetchTreasuryData(),
        fetchUserBalance(),
        checkAdminStatus(),
        fetchTreasuryTransactions()
      ]);
    }, 60000);

    return () => clearInterval(interval);
  }, [daoId, account?.address, fetchTreasuryData, fetchUserBalance, checkAdminStatus, fetchTreasuryTransactions]);

  return {
    treasuryData,
    transactions,
    userBalance,
    isAdmin,
    deposit,
    withdraw,
    refreshData: () => Promise.all([fetchTreasuryData(), fetchUserBalance(), checkAdminStatus(), fetchTreasuryTransactions()]),
    toMOVE,
    fromMOVE
  };
};