import React, { useState, useEffect } from 'react';
import { useSectionLoader } from '../../hooks/useSectionLoader';
import { Users, RefreshCw } from 'lucide-react';
import { Member } from '../../types/dao';
import { DAO } from '../../types/dao';
import { useWallet } from '@razorlabs/razorkit';
import { aptosClient } from '../../movement_service/movement-client';
import { MODULE_ADDRESS } from '../../movement_service/constants';
import { safeView, safeGetModuleEventsByEventType } from '../../utils/rpcUtils';

interface DAOMembersProps {
  dao: DAO;
  sidebarCollapsed?: boolean;
}

const DAOMembers: React.FC<DAOMembersProps> = ({ dao, sidebarCollapsed = false }) => {
  // In-memory caches to keep member data stable between tab switches
  // Cache persists for the app lifetime; TTL avoids serving stale data too long
  const CACHE_TTL_MS = 60 * 1000; // 60 seconds
  // @ts-ignore - module-level singleton caches
  const membersCache: Map<string, { members: Member[]; timestamp: number }> = (window as any).__membersCache || ((window as any).__membersCache = new Map());
  // @ts-ignore
  const summaryCache: Map<string, { summary: any; timestamp: number }> = (window as any).__membersSummaryCache || ((window as any).__membersSummaryCache = new Map());
  const [membershipData, setMembershipData] = useState({
    totalMembers: 0,
    totalStakers: 0,
    totalStaked: 0,
    minStakeRequired: 1.0, // Default to 1 MOVE minimum
    minProposalStake: 6.0, // Default to 6 MOVE for proposals
    userIsMember: false,
    userStake: 0
  });
  const [actualMembers, setActualMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const sectionLoader = useSectionLoader();
  
  const { account, signAndSubmitTransaction } = useWallet();
  const OCTAS = 1e8;
  const toMOVE = (u64: number): number => u64 / OCTAS;

  // Format totals with dynamic units (no misleading 0.0K)
  const formatCompact = (amount: number): string => {
    if (!Number.isFinite(amount)) return '0';
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
    if (amount >= 1) return amount.toFixed(0);
    return amount.toFixed(2);
  };

  const fetchActualMembers = async () => {
    try {
      setIsLoadingMembers(true);
      const candidateAddresses = new Set<string>();

      // Query staking events to gather staker addresses for THIS DAO (they include movedaoaddrxess)
      const stakeType = `${MODULE_ADDRESS}::staking::StakeEvent` as `${string}::${string}::${string}`;
      const unstakeType = `${MODULE_ADDRESS}::staking::UnstakeEvent` as `${string}::${string}::${string}`;

      // Prefer module-level events (widely available), then filter by dao id
      const [stakeEvents, unstakeEvents] = await Promise.all([
        safeGetModuleEventsByEventType({ eventType: stakeType, options: { limit: 200 } }).catch(() => []),
        safeGetModuleEventsByEventType({ eventType: unstakeType, options: { limit: 200 } }).catch(() => []),
      ]);

      const pushIfForDAO = (ev: any) => {
        const d = ev?.data || {};
        if ((d.movedaoaddrxess || d.dao_address) === dao.id && typeof d.staker === 'string') {
          candidateAddresses.add(d.staker);
        }
      };

      (stakeEvents as any[]).forEach(pushIfForDAO);
      (unstakeEvents as any[]).forEach(pushIfForDAO);

      // Include the connected account if present, to reflect immediate membership
      if (account?.address) candidateAddresses.add(account.address);

      // Validate membership and fetch stake per candidate (limit concurrency to avoid rate limits)
      const addresses = Array.from(candidateAddresses);
      const batchSize = 5; // Increased batch size for faster loading
      const collected: Member[] = [];

      for (let i = 0; i < addresses.length; i += batchSize) {
        const batch = addresses.slice(i, i + batchSize);
        const batchPromises = batch.map(async (addr) => {
          try {
            const [isMemberRes, stakeRes] = await Promise.all([
              safeView({ function: `${MODULE_ADDRESS}::membership::is_member`, functionArguments: [dao.id, addr] }).catch(() => [false]),
              safeView({ function: `${MODULE_ADDRESS}::staking::get_dao_stake_direct`, functionArguments: [dao.id, addr] }).catch(() => [0]),
            ]);
            const isMember = Boolean(isMemberRes?.[0]);
            const stakeAmount = toMOVE(Number(stakeRes?.[0] || 0));
            if (isMember && stakeAmount > 0) {
              const member: Member = {
                id: addr,
                address: addr,
                shortAddress: `${addr.slice(0, 6)}...${addr.slice(-4)}`,
                votingPower: stakeAmount,
                tokensHeld: stakeAmount,
                joinDate: '-',
                isActive: true,
              };
              collected.push(member);
            }
          } catch (e) {
            // Ignore individual failures
          }
        });
        await Promise.allSettled(batchPromises);

        // Add delay between batches to avoid overwhelming the RPC
        if (i + batchSize < addresses.length) {
          await new Promise(resolve => setTimeout(resolve, 500)); // Reduced to 500ms for faster loading
        }
      }

      // Deduplicate by address
      const unique = new Map<string, Member>();
      collected.forEach((m) => unique.set(m.address, m));
      const members = Array.from(unique.values()).sort((a, b) => a.address.localeCompare(b.address));
      
      setActualMembers(members);
      // Save to cache
      membersCache.set(dao.id, { members, timestamp: Date.now() });
    } catch (error) {
      console.error('Failed to fetch actual members:', error);
      setActualMembers([]);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const fetchMembershipData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch DAO membership statistics
      const [
        totalMembersRes,
        totalStakedRes,
        minStakeRes,
        minProposalStakeRes
      ] = await Promise.all([
        safeView({ function: `${MODULE_ADDRESS}::membership::total_members`, functionArguments: [dao.id] }).catch(() => [0]),
        safeView({ function: `${MODULE_ADDRESS}::staking::get_total_staked`, functionArguments: [dao.id] }).catch(() => [0]),
        safeView({ function: `${MODULE_ADDRESS}::membership::get_min_stake`, functionArguments: [dao.id] }).catch(() => [0]),
        safeView({ function: `${MODULE_ADDRESS}::membership::get_min_proposal_stake`, functionArguments: [dao.id] }).catch(() => [0])
      ]);

      // Note: get_staker_count is not a view function, so we use total_members as a proxy
      // since members need to stake to join. In most cases, members = stakers
      const totalStakersRes = totalMembersRes;

      // Check current user's membership status and stake
      let userIsMember = false;
      let userStake = 0;
      
      if (account?.address) {
        try {
          const [isMemberRes, userStakeRes] = await Promise.all([
            safeView({ function: `${MODULE_ADDRESS}::membership::is_member`, functionArguments: [dao.id, account.address] }),
            safeView({ function: `${MODULE_ADDRESS}::staking::get_dao_staked_balance`, functionArguments: [dao.id, account.address] })
          ]);
          userIsMember = Boolean(isMemberRes[0]);
          userStake = toMOVE(Number(userStakeRes[0] || 0));
        } catch (e) {
          console.warn('Failed to fetch user membership data:', e);
        }
      }

      // Handle min stake conversion - if it's 0 or very small, use a reasonable default
      const rawMinStake = Number(minStakeRes[0] || 0);
      const minStakeInMOVE = rawMinStake > 0 ? toMOVE(rawMinStake) : 1.0; // Default to 1 MOVE if not set or too small
      
      const rawMinProposalStake = Number(minProposalStakeRes[0] || 0);
      const minProposalStakeInMOVE = rawMinProposalStake > 0 ? toMOVE(rawMinProposalStake) : 6.0; // Default to 6 MOVE if not set
      
      const summary = {
        totalMembers: Number(totalMembersRes[0] || 0),
        totalStakers: Number(totalStakersRes[0] || 0),
        totalStaked: toMOVE(Number(totalStakedRes[0] || 0)),
        minStakeRequired: minStakeInMOVE,
        minProposalStake: minProposalStakeInMOVE,
        userIsMember,
        userStake
      };
      setMembershipData(summary);
      // Save to cache
      summaryCache.set(dao.id, { summary, timestamp: Date.now() });
      
    } catch (error) {
      console.error('Failed to fetch membership data:', error);
      // Set reasonable defaults when API calls fail (rate limiting, network issues, etc.)
      setMembershipData(prev => ({
        ...prev,
        minStakeRequired: prev.minStakeRequired || 1.0, // Default to 1 MOVE
        minProposalStake: prev.minProposalStake || 6.0, // Default to 6 MOVE
        totalMembers: prev.totalMembers || 0,
        totalStakers: prev.totalStakers || 0,
        totalStaked: prev.totalStaked || 0,
        userIsMember: prev.userIsMember || false,
        userStake: prev.userStake || 0
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const [isLeaving, setIsLeaving] = useState(false);
  const handleLeaveDAO = async () => {
    if (!account || !signAndSubmitTransaction) return;
    try {
      setIsLeaving(true);
      const payload = {
        function: `${MODULE_ADDRESS}::membership::leave`,
        typeArguments: [],
        functionArguments: [dao.id],
      };
      const tx = await signAndSubmitTransaction({ payload } as any);
      if (tx && (tx as any).hash) {
        await aptosClient.waitForTransaction({ transactionHash: (tx as any).hash, options: { checkSuccess: true } });
      }
      await Promise.all([fetchMembershipData(), fetchActualMembers()]);
      alert(`You have left ${dao.name}.`);
    } catch (e: any) {
      const msg = String(e?.message || e || 'Failed to leave DAO');
      alert(msg.includes('User rejected') ? 'Transaction cancelled' : `Leave failed: ${msg}`);
    } finally {
      setIsLeaving(false);
    }
  };

  useEffect(() => {
    const now = Date.now();
    // Hydrate from cache immediately (no spinner) if fresh
    const cachedMembers = membersCache.get(dao.id);
    if (cachedMembers && now - cachedMembers.timestamp < CACHE_TTL_MS) {
      setActualMembers(cachedMembers.members);
      setIsLoadingMembers(false);
    }
    const cachedSummary = summaryCache.get(dao.id);
    if (cachedSummary && now - cachedSummary.timestamp < CACHE_TTL_MS) {
      setMembershipData(cachedSummary.summary);
      setIsLoading(false);
    }
    // Always trigger a background refresh using the section loader
    sectionLoader.executeWithLoader(async () => {
      await Promise.all([fetchMembershipData(), fetchActualMembers()]);
    });
  }, [dao.id]); // Fetch on DAO change only; cache keeps view instant between tabs

  // Use actual members fetched from the blockchain
  const members = actualMembers;
  const filteredMembers = members; // No filtering since search was removed

  const totalVotingPower = members.reduce((sum, member) => sum + member.votingPower, 0);
  const activeMembers = members.filter(m => m.isActive).length;

  return (
    <div className="w-full px-2 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Community Members</h2>
        </div>
        <div className="text-right">
          {sectionLoader.isLoading && (
            <div className="text-xs text-blue-300">Loading...</div>
          )}
          {sectionLoader.error && (
            <div className="text-xs text-red-300">Error loading members</div>
          )}
        </div>
      </div>


      {/* Stats removed per request */}

      {/* Member Directory */}
      <div className="bg-white/3 border border-white/5 rounded-xl p-4 w-full max-w-full overflow-hidden">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base md:text-lg font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="truncate">Member Directory</span>
              {filteredMembers.length > 0 && (
                <span className="text-xs sm:text-sm text-gray-400 hidden sm:inline">({filteredMembers.length})</span>
              )}
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                fetchMembershipData();
                fetchActualMembers();
              }}
              disabled={isLoading || isLoadingMembers}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all disabled:opacity-50"
              title="Refresh member data"
            >
              <RefreshCw className={`w-4 h-4 ${(isLoading || isLoadingMembers) ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-4 px-4 font-medium text-gray-300">Member</th>
                <th className="text-left py-4 px-4 font-medium text-gray-300">Staked</th>
                <th className="text-left py-4 px-4 font-medium text-gray-300">Status</th>
                <th className="text-left py-4 px-4 font-medium text-gray-300">Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.length === 0 ? (
                sectionLoader.isLoading ? null : (
                <tr>
                  <td colSpan={4} className="py-8 px-4 text-center">
                    <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No members found</p>
                    <p className="text-gray-500 text-xs mt-1">
                      {membershipData.totalMembers > 0 
                        ? 'Try adjusting your search'
                        : 'No registered members yet'}
                    </p>
                  </td>
                </tr>
                )
              ) : (
                filteredMembers.map((member, index) => (
                <tr key={member.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {member.shortAddress.slice(2, 4).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-white font-medium text-sm leading-tight">{member.shortAddress}</h4>
                        <p className="text-gray-400 text-xs leading-tight">Member #{index + 1}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-1">
                      <span className="text-sm text-white font-medium">{member.tokensHeld.toFixed(3)}</span>
                      <img
                        src="https://ipfs.io/ipfs/QmUv8RVdgo6cVQzh7kxerWLatDUt4rCEFoCTkCVLuMAa27"
                        alt="MOVE"
                        className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.classList.remove('hidden');
                        }}
                      />
                      <span className="hidden">MOVE</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs border ${
                      member.isActive 
                        ? 'text-green-400 border-green-500/30 bg-green-500/10' 
                        : 'text-gray-400 border-gray-500/30 bg-gray-500/10'
                    }`}>
                      {member.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-1 text-gray-400">
                      <span className="text-xs">{new Date().toLocaleDateString()}</span>
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
          {filteredMembers.length === 0 ? (
            sectionLoader.isLoading ? null : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No members found</p>
              <p className="text-gray-500 text-xs mt-1">
                {membershipData.totalMembers > 0 
                  ? 'Try adjusting your search'
                  : 'No registered members yet'}
              </p>
            </div>
            )
          ) : (
            <div className="space-y-1.5">
              {filteredMembers.map((member, index) => (
                <div
                  key={member.id}
                  className="rounded-lg p-2.5 hover:bg-white/5 transition-all border-b border-white/5 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {member.shortAddress.slice(2, 4).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="text-white font-medium text-sm leading-tight truncate">{member.shortAddress}</h4>
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] border flex-shrink-0 ${
                            member.isActive 
                              ? 'text-green-400 border-green-500/30 bg-green-500/10' 
                              : 'text-gray-400 border-gray-500/30 bg-gray-500/10'
                          }`}>
                            {member.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-gray-400">
                          <span>Member #{index + 1}</span>
                          <span>{new Date().toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center space-x-1">
                        <span className="text-sm font-medium text-white">{member.tokensHeld.toFixed(3)}</span>
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DAOMembers;