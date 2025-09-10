import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, Users, Info, Activity, TrendingUp, Shield, Zap } from 'lucide-react';
import { DAO } from '../../types/dao';
import { useDAOActivities } from '../../useServices/useOptimizedActivityTracker';
import OptimizedActivityTable from '../OptimizedActivityTable';
import { aptosClient } from '../../movement_service/movement-client';
import { MODULE_ADDRESS } from '../../movement_service/constants';
import { safeView } from '../../utils/rpcUtils';
import { ACTIVITY_CONFIG } from '../../constants/activityConstants';
import { useGetProfile } from '../../useServices/useProfile';
import { truncateAddress } from '../../utils/addressUtils';

interface DAOHomeProps {
  dao: DAO;
}

const DAOHome: React.FC<DAOHomeProps> = ({ dao }) => {
  const [adminAddress, setAdminAddress] = useState<string>('');
  const [fullAdminAddress, setFullAdminAddress] = useState<string>('');
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(true);
  const [treasuryBalance, setTreasuryBalance] = useState<string>('0.00');
  const [isLoadingTreasury, setIsLoadingTreasury] = useState(true);

  // Fetch profile for admin address
  const { data: adminProfile, isLoading: adminProfileLoading } = useGetProfile(fullAdminAddress || null);

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

  // Fetch treasury balance from contract - professional cached approach
  const fetchTreasuryBalance = async () => {
    try {
      setIsLoadingTreasury(true);
      console.log('Fetching treasury balance for DAO:', dao.id);

      let balance = 0;
      let treasuryObject: any = null;

      // Step 1: Try to get treasury object first (modern DAOs) - with caching
      try {
        const objectResult = await safeView({
          function: `${MODULE_ADDRESS}::dao_core_file::get_treasury_object`,
          functionArguments: [dao.id]
        }, `treasury_object_${dao.id}`);
        console.log('Treasury object fetch result:', objectResult);
        treasuryObject = (objectResult as any)?.[0];
      } catch (error) {
        console.log('Treasury object fetch failed:', error);
      }

      // Step 2: If treasury object exists, get balance from it - with caching
      if (treasuryObject) {
        try {
          const objectAddress = typeof treasuryObject === 'string' ? treasuryObject : (treasuryObject?.inner || treasuryObject?.value || treasuryObject?.address || null);
          console.log('Using treasury object address:', objectAddress);
          
          // Try comprehensive treasury info first - with caching
          try {
            const infoRes = await safeView({
              function: `${MODULE_ADDRESS}::treasury::get_treasury_info`,
              functionArguments: [objectAddress]
            }, `treasury_info_${objectAddress}`);
            if (Array.isArray(infoRes) && infoRes.length >= 1) {
              balance = Number(infoRes[0] || 0) / 1e8;
              console.log('Got balance from treasury info:', balance);
            }
          } catch (infoError) {
            console.log('Treasury info failed, trying object balance:', infoError);
            // Fallback to direct object balance - with caching
            const balanceResult = await safeView({
              function: `${MODULE_ADDRESS}::treasury::get_balance_from_object`,
              functionArguments: [treasuryObject]
            }, `treasury_balance_obj_${dao.id}`);
            balance = Number(balanceResult[0] || 0) / 1e8;
            console.log('Got balance from object:', balance);
          }
        } catch (objError) {
          console.warn('Object-based balance fetch failed:', objError);
        }
      }

      // Step 3: Fallback to legacy balance if no object approach worked - with caching
      if (balance === 0) {
        try {
          const balanceResult = await safeView({
            function: `${MODULE_ADDRESS}::treasury::get_balance`,
            functionArguments: [dao.id]
          }, `treasury_balance_legacy_${dao.id}`);
          
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
          // First check if admin system exists - with caching
          const adminListExists = await safeView({
            function: `${MODULE_ADDRESS}::admin::exists_admin_list`,
            functionArguments: [dao.id]
          }, `admin_list_exists_${dao.id}`);
          
          if (adminListExists && adminListExists[0]) {
            // Get admins from the AdminList - with caching
            const adminResult = await safeView({
              function: `${MODULE_ADDRESS}::admin::get_admins`,
              functionArguments: [dao.id]
            }, `admin_list_${dao.id}`);
            
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
              setFullAdminAddress(firstAdmin);
              setAdminAddress(truncateAddress(firstAdmin));
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
            setFullAdminAddress(creator);
            setAdminAddress(truncateAddress(creator));
            return;
          }
        } catch (eventError) {
          console.warn('Error fetching creator from events:', eventError);
        }

        // Final fallback: DAO creator is the admin (contract guarantees this)
        setFullAdminAddress(dao.id);
        setAdminAddress(truncateAddress(dao.id));
        
      } catch (error: any) {
        console.warn('Error fetching admin info:', error);
        // Contract guarantees DAO creator is admin, so use DAO address
        setFullAdminAddress(dao.id);
        setAdminAddress(truncateAddress(dao.id));
      } finally {
        setIsLoadingAdmin(false);
      }
    };

    fetchAdmin();
    fetchTreasuryBalance();
  }, [dao.id]);

  return (
    <div className="w-full px-4 sm:px-6 space-y-8">
      
      {/* About Section */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
          <Info className="w-6 h-6 text-blue-400" />
          <span>About {dao.name}</span>
        </h2>
        
        {/* Key Stats */}
        <div className="grid grid-cols-2 gap-6">
          <div className="text-center md:text-left">
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-400">Treasury Balance</span>
              <div className="flex items-center justify-center md:justify-start space-x-2">
                {isLoadingTreasury ? (
                  <span className="text-xl font-bold text-white">Loading...</span>
                ) : (
                  <>
                    <span className="text-xl font-bold text-white font-mono">{treasuryBalance}</span>
                    <img 
                      src="https://ipfs.io/ipfs/QmUv8RVdgo6cVQzh7kxerWLatDUt4rCEFoCTkCVLuMAa27" 
                      alt="MOVE"
                      className="w-6 h-6"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                        if (fallback) fallback.classList.remove('hidden');
                      }}
                    />
                    <span className="text-xl font-bold text-white font-mono hidden">MOVE</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="text-center md:text-left">
            <div className="flex flex-col space-y-2">
              <span className="text-sm font-medium text-gray-400">Admin</span>
              {isLoadingAdmin || adminProfileLoading ? (
                <span className="text-sm text-gray-300">Loading...</span>
              ) : adminProfile ? (
                <div className="flex items-center justify-center md:justify-start space-x-3">
                  {adminProfile.avatarUrl ? (
                    <img 
                      src={adminProfile.avatarUrl} 
                      alt={adminProfile.displayName}
                      className="w-8 h-8 rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                        if (fallback) fallback.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white text-sm font-bold ${adminProfile.avatarUrl ? 'hidden' : ''}`}>
                    {adminProfile.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white">
                      {adminProfile.displayName}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">
                      {adminAddress}
                    </span>
                  </div>
                </div>
              ) : (
                <span className="text-sm font-mono text-white">
                  {adminAddress}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-4">
        <OptimizedActivityTable
          activities={activities}
          isLoading={isLoading}
          error={error}
          onRefresh={refetch}
          showUserColumn={true}
          showAmountColumn={true}
          showDAOColumn={false}
          showActionColumn={false}
          maxRows={10}
          title="Recent DAO Activity"
        />
      </div>
    </div>
  );
};

export default DAOHome;