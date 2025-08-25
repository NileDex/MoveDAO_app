import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, Users, Info, Activity, TrendingUp, Shield, Zap } from 'lucide-react';
import { DAO } from '../../types/dao';
import { useDAOActivities } from '../../useServices/useOptimizedActivityTracker';
import OptimizedActivityTable from '../OptimizedActivityTable';
import { aptosClient } from '../../movement_service/movement-client';
import { MODULE_ADDRESS } from '../../movement_service/constants';
import { safeView } from '../../utils/rpcUtils';
import { ACTIVITY_CONFIG } from '../../constants/activityConstants';

interface DAOHomeProps {
  dao: DAO;
}

const DAOHome: React.FC<DAOHomeProps> = ({ dao }) => {
  const [adminAddress, setAdminAddress] = useState<string>('');
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(true);
  const [treasuryBalance, setTreasuryBalance] = useState<string>('0.00');
  const [isLoadingTreasury, setIsLoadingTreasury] = useState(true);

  const { 
    activities, 
    isLoading, 
    error, 
    pagination,
    refetch
  } = useDAOActivities(dao.id, {
    limit: ACTIVITY_CONFIG.DEFAULT_LIMIT,
    page: 1
  });

  // Fetch treasury balance from contract - comprehensive approach
  const fetchTreasuryBalance = async () => {
    try {
      setIsLoadingTreasury(true);
      console.log('Fetching treasury balance for DAO:', dao.id);

      let balance = 0;
      let treasuryObject: any = null;

      // Step 1: Try to get treasury object first (modern DAOs)
      try {
        const objectResult = await safeView({
          function: `${MODULE_ADDRESS}::dao_core_file::get_treasury_object`,
          functionArguments: [dao.id]
        });
        console.log('Treasury object fetch result:', objectResult);
        treasuryObject = (objectResult as any)?.[0];
      } catch (error) {
        console.log('Treasury object fetch failed:', error);
      }

      // Step 2: If treasury object exists, get balance from it
      if (treasuryObject) {
        try {
          const objectAddress = typeof treasuryObject === 'string' ? treasuryObject : (treasuryObject?.inner || treasuryObject?.value || treasuryObject?.address || null);
          console.log('Using treasury object address:', objectAddress);
          
          // Try comprehensive treasury info first
          try {
            const infoRes = await safeView({
              function: `${MODULE_ADDRESS}::treasury::get_treasury_info`,
              functionArguments: [objectAddress]
            });
            if (Array.isArray(infoRes) && infoRes.length >= 1) {
              balance = Number(infoRes[0] || 0) / 1e8;
              console.log('Got balance from treasury info:', balance);
            }
          } catch (infoError) {
            console.log('Treasury info failed, trying object balance:', infoError);
            // Fallback to direct object balance
            const balanceResult = await safeView({
              function: `${MODULE_ADDRESS}::treasury::get_balance_from_object`,
              functionArguments: [treasuryObject]
            });
            balance = Number(balanceResult[0] || 0) / 1e8;
            console.log('Got balance from object:', balance);
          }
        } catch (objError) {
          console.warn('Object-based balance fetch failed:', objError);
        }
      }

      // Step 3: Fallback to legacy balance if no object approach worked
      if (balance === 0) {
        try {
          const balanceResult = await safeView({
            function: `${MODULE_ADDRESS}::treasury::get_balance`,
            functionArguments: [dao.id]
          });
          
          if (balanceResult && Array.isArray(balanceResult) && balanceResult.length > 0) {
            balance = Number(balanceResult[0] || 0) / 1e8;
            console.log('Got balance from legacy method:', balance);
          }
        } catch (legacyError) {
          console.warn('Legacy balance fetch failed:', legacyError);
        }
      }

      console.log('Final treasury balance:', balance);
      setTreasuryBalance(balance.toFixed(2));
    } catch (error) {
      console.warn('Failed to fetch treasury balance:', error);
      setTreasuryBalance('0.00');
    } finally {
      setIsLoadingTreasury(false);
    }
  };

  // Fetch admin address based on contract behavior
  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        setIsLoadingAdmin(true);
        
        // Primary: Get admins from AdminList (contract initializes this during DAO creation)
        try {
          // First check if admin system exists
          const adminListExists = await safeView({
            function: `${MODULE_ADDRESS}::admin::exists_admin_list`,
            functionArguments: [dao.id]
          });
          
          if (adminListExists && adminListExists[0]) {
            // Get admins from the AdminList
            const adminResult = await safeView({
              function: `${MODULE_ADDRESS}::admin::get_admins`,
              functionArguments: [dao.id]
            });
            
            // Parse admin list (vector<address>)
            const admins: string[] = (() => {
              if (Array.isArray(adminResult)) {
                if (adminResult.length === 1 && Array.isArray(adminResult[0])) return adminResult[0] as string[];
                if (adminResult.every((a: any) => typeof a === 'string')) return adminResult as string[];
              }
              return [];
            })();

            if (admins.length > 0) {
              // Show first admin (usually the creator/super admin)
              const firstAdmin = admins[0];
              setAdminAddress(`${firstAdmin.slice(0, 6)}...${firstAdmin.slice(-4)}`);
              return;
            }
          }
        } catch (adminError) {
          console.warn('Admin system query failed:', adminError);
        }

        // Fallback: Get creator from DAOCreated event
        try {
          const events = await aptosClient.getModuleEventsByEventType({
            eventType: `${MODULE_ADDRESS}::dao_core_file::DAOCreated`,
            options: { limit: 100 },
          });

          const ev = (events as any[]).find(e => e?.data?.movedaoaddrxess === dao.id);
          const creator = ev?.data?.creator as string | undefined;
          if (creator) {
            setAdminAddress(`${creator.slice(0, 6)}...${creator.slice(-4)}`);
            return;
          }
        } catch (eventError) {
          console.warn('Error fetching creator from events:', eventError);
        }

        // Final fallback: DAO creator is the admin (contract guarantees this)
        setAdminAddress(`${dao.id.slice(0, 6)}...${dao.id.slice(-4)}`);
        
      } catch (error: any) {
        console.warn('Error fetching admin info:', error);
        // Contract guarantees DAO creator is admin, so use DAO address
        setAdminAddress(`${dao.id.slice(0, 6)}...${dao.id.slice(-4)}`);
      } finally {
        setIsLoadingAdmin(false);
      }
    };

    fetchAdmin();
    fetchTreasuryBalance();
  }, [dao.id]);

  return (
    <div className="container mx-auto px-2 sm:px-6 space-y-6 sm:space-y-10 max-w-screen-lg">

      {/* Governance Parameters section removed as requested */}

      {/* DAO Details & About */}
      <div className="professional-card w-full rounded-lg sm:rounded-xl p-3 sm:p-6 box-border">
        <h2 className="text-base sm:text-xl font-bold text-white mb-3 sm:mb-6 flex items-center space-x-2">
          <Info className="w-5 h-5 text-blue-400" />
          <span>About {dao.name}</span>
        </h2>
        
        {/* DAO Stats */}
        <div className="grid grid-cols-3 gap-4 w-full mb-6">
          <div className="flex flex-col items-center">
            <span className="font-medium text-xs sm:text-base text-gray-400 mb-1">Established</span>
            <span className="text-base sm:text-lg font-bold text-white">{dao.established}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-medium text-xs sm:text-base text-gray-400 mb-1">Treasury Value</span>
            <span className="text-base sm:text-lg font-bold text-white font-mono">
              {isLoadingTreasury ? 'Loading...' : `${treasuryBalance} MOVE`}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-medium text-xs sm:text-base text-gray-400 mb-1">Admin</span>
            <span className="text-base sm:text-lg font-bold text-white font-mono">
              {isLoadingAdmin ? '...' : adminAddress}
            </span>
          </div>
        </div>
        
        {/* About Description */}
        <div className="prose prose-invert max-w-none">
          {dao.description && (
            <p className="text-gray-300 leading-relaxed mb-2 sm:mb-4 text-xs sm:text-base">
              {dao.description}
            </p>
          )}
        </div>
      </div>


      {/* Recent Activity - Optimized Contract-based data */}
      <div className="w-full">
        <OptimizedActivityTable
          activities={activities}
          isLoading={isLoading}
          error={error}
          onRefresh={refetch}
          showUserColumn={true}
          showAmountColumn={true}
          showDAOColumn={false}
          maxRows={10}
          title="Recent DAO Activity"
        />
      </div>
    </div>
  );
};

export default DAOHome;