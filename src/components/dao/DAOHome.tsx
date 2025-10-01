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
import { useSectionLoader } from '../../hooks/useSectionLoader';
import SectionLoader from '../common/SectionLoader';

// Admin Display Component with Profile - optimized for instant display
const AdminDisplay: React.FC<{ address: string }> = ({ address }) => {
  const { data: profileData, isLoading } = useGetProfile(address || null);

  // Always show address immediately, upgrade to profile when loaded
  if (profileData && !isLoading) {
    return (
      <div className="flex items-center space-x-3">
        {profileData.avatarUrl ? (
          <img
            src={profileData.avatarUrl}
            alt={profileData.displayName}
            className="w-8 h-8 rounded-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
              if (fallback) fallback.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white text-sm font-bold ${profileData.avatarUrl ? 'hidden' : ''}`}>
          {profileData.displayName.charAt(0).toUpperCase()}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-white">
            {profileData.displayName}
          </span>
          <span className="text-xs text-gray-400 font-mono">
            {truncateAddress(address)}
          </span>
        </div>
      </div>
    );
  }

  // Show address immediately (no loading state delay)
  return (
    <div className="flex items-center space-x-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center text-white text-sm font-bold">
        {address.charAt(2).toUpperCase()}
      </div>
      <span className="text-sm font-mono text-white">
        {truncateAddress(address)}
      </span>
    </div>
  );
};

interface DAOHomeProps {
  dao: DAO;
}

const DAOHome: React.FC<DAOHomeProps> = ({ dao }) => {
  const [fullAdminAddress, setFullAdminAddress] = useState<string>('');
  const [treasuryBalance, setTreasuryBalance] = useState<string>('0.00');

  // Section loader for Overview tab
  const sectionLoader = useSectionLoader();

  const [page, setPage] = useState<number>(1);
  const PAGE_LIMIT = 10;

  const { 
    activities, 
    isLoading, 
    error, 
    pagination,
    refetch
  } = useDAOActivities(dao.id, {
    limit: PAGE_LIMIT,
    page
  });

  // Fetch treasury balance from contract - professional cached approach
  const fetchTreasuryBalance = async () => {
    try {
      let balance = 0;
      let treasuryObject: any = null;

      // Step 1: Try to get treasury object first (modern DAOs) - with caching
      try {
        const objectResult = await safeView({
          function: `${MODULE_ADDRESS}::dao_core_file::get_treasury_object`,
          functionArguments: [dao.id]
        }, `treasury_object_${dao.id}`);
        treasuryObject = (objectResult as any)?.[0];
      } catch (error) {
        // Silent fallback to legacy method
      }

      // Step 2: If treasury object exists, get balance from it - with caching
      if (treasuryObject) {
        try {
          // Use the raw treasury object directly (it's already in the correct Object<Treasury> format)
          // Try comprehensive treasury info first - with caching
          try {
            const infoRes = await safeView({
              function: `${MODULE_ADDRESS}::treasury::get_treasury_info`,
              functionArguments: [treasuryObject]
            }, `treasury_info_${dao.id}`);
            if (Array.isArray(infoRes) && infoRes.length >= 1) {
              balance = Number(infoRes[0] || 0) / 1e8;
            }
          } catch (infoError: any) {
            // Fallback to direct object balance - with caching
            try {
              const balanceResult = await safeView({
                function: `${MODULE_ADDRESS}::treasury::get_balance_from_object`,
                functionArguments: [treasuryObject]
              }, `treasury_balance_obj_${dao.id}`);
              balance = Number(balanceResult[0] || 0) / 1e8;
            } catch (balError: any) {
              // Silent fallback to legacy
            }
          }
        } catch (objError: any) {
          // Silent fallback to legacy
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
          }
        } catch (legacyError) {
          // Silent - will show 0 balance
        }
      }

      setTreasuryBalance(balance.toFixed(2));
    } catch (error: any) {
      setTreasuryBalance('0.00');
    }
  };

  // Fetch admin address based on contract behavior
  useEffect(() => {
    const fetchOverviewData = async () => {
      try {
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
              setFullAdminAddress(admins[0]);
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
            return;
          }
        } catch (eventError) {
          console.warn('Error fetching creator from events:', eventError);
        }

        // Final fallback: DAO creator is the admin (contract guarantees this)
        setFullAdminAddress(dao.id);
        
        // Also fetch treasury balance
        await fetchTreasuryBalance();

      } catch (error: any) {
        console.warn('Error fetching overview data:', error);
        // Contract guarantees DAO creator is admin, so use DAO address as fallback
        setFullAdminAddress(dao.id);
        sectionLoader.setError(error?.message || 'Failed to load overview data');
      }
    };

    sectionLoader.executeWithLoader(fetchOverviewData);
  }, [dao.id]);

  const retryOverviewData = () => {
    sectionLoader.reset();
    const fetchOverviewData = async () => {
      // Re-fetch all overview data
      await fetchTreasuryBalance();
    };
    sectionLoader.executeWithLoader(fetchOverviewData);
  };

  return (
    <div className="w-full px-4 sm:px-6 space-y-8">
      {/* About Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg md:text-lg lg:text-xl xl:text-xl 2xl:text-xl font-bold text-white flex items-center space-x-3">
            <Info className="w-5 h-5 text-blue-400 ml-4" />
            <span>About {dao.name}</span>
          </h2>

          {/* Top-right status */}
          <div className="text-right">
            {sectionLoader.isLoading && (
              <div className="text-xs text-blue-300">Loading...</div>
            )}
            {sectionLoader.error && (
              <div className="text-xs text-red-300 cursor-pointer" onClick={retryOverviewData}>
                Error - Click to retry
              </div>
            )}
          </div>
        </div>

        {/* Key Stats (Admin only – Treasury removed) */}
        <div className="grid grid-cols-1 gap-6">
          <div className="text-left pl-12 sm:pl-0">
            <div className="flex flex-col space-y-2">
              <span className="text-sm font-medium text-gray-400">Admin</span>
              {fullAdminAddress ? (
                <AdminDisplay address={fullAdminAddress} />
              ) : (
                <span className="text-sm text-gray-300">Loading...</span>
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
          maxRows={undefined}
          showingCountText={
            pagination?.totalItems > 0
              ? `Showing ${(page - 1) * PAGE_LIMIT + Math.min(PAGE_LIMIT, activities.length)} of ${pagination.totalItems} activities`
              : undefined
          }
          hasNextPage={Boolean(pagination?.hasNextPage)}
          hasPrevPage={Boolean(pagination?.hasPreviousPage)}
          onNextPage={() => setPage(p => p + 1)}
          onPrevPage={() => setPage(p => Math.max(1, p - 1))}
          title="Recent DAO Activity"
        />
      </div>
    </div>
  );
};

export default DAOHome;