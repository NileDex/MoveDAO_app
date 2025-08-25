import React, { useState, useEffect } from 'react';
import { Search, Filter, Users, Crown, Vote, UserPlus, MoreVertical, Coins, Shield, TrendingUp, RefreshCw } from 'lucide-react';
import { Member } from '../../types/dao';
import { DAO } from '../../types/dao';
import { useWallet } from '@razorlabs/razorkit';
import { aptosClient } from '../../movement_service/movement-client';
import { MODULE_ADDRESS } from '../../movement_service/constants';
import { safeView, safeGetAccountResource, safeGetModuleEventsByEventType } from '../../utils/rpcUtils';

interface DAOMembersProps {
  dao: DAO;
}

const DAOMembers: React.FC<DAOMembersProps> = ({ dao }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
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

      // Also include the connected account if present, to reflect immediate membership
      if (account?.address) candidateAddresses.add(account.address);

      // Validate membership and fetch stake per candidate (limit concurrency to avoid rate limits)
      const addresses = Array.from(candidateAddresses);
      const batchSize = 2; // Further reduced batch size to avoid 429 errors
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
          await new Promise(resolve => setTimeout(resolve, 1200)); // Increased to 1.2s delay between batches
        }
      }

      // Deduplicate by address
      const unique = new Map<string, Member>();
      collected.forEach((m) => unique.set(m.address, m));
      const members = Array.from(unique.values()).sort((a, b) => a.address.localeCompare(b.address));
      
      setActualMembers(members);
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
      
      setMembershipData({
        totalMembers: Number(totalMembersRes[0] || 0),
        totalStakers: Number(totalStakersRes[0] || 0),
        totalStaked: toMOVE(Number(totalStakedRes[0] || 0)),
        minStakeRequired: minStakeInMOVE,
        minProposalStake: minProposalStakeInMOVE,
        userIsMember,
        userStake
      });
      
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
    fetchMembershipData();
    fetchActualMembers();
  }, [dao.id, account?.address]);

  // Use actual members fetched from the blockchain
  const members = actualMembers;

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.shortAddress.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const totalVotingPower = members.reduce((sum, member) => sum + member.votingPower, 0);
  const activeMembers = members.filter(m => m.isActive).length;

  return (
    <div className="container mx-auto px-2 sm:px-6 max-w-screen-lg space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Community Members</h2>
          <p className="text-gray-400">Manage and view community membership</p>
        </div>
      </div>

      {/* Current User Membership Status */}
      {account?.address && (
        <div className={`professional-card rounded-xl p-4 border-2 ${
          membershipData.userIsMember 
            ? 'border-green-500/30 bg-green-500/10' 
            : 'border-orange-500/30 bg-orange-500/10'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${
                membershipData.userIsMember ? 'bg-green-500/20' : 'bg-orange-500/20'
              }`}>
                <Users className={`w-5 h-5 ${
                  membershipData.userIsMember ? 'text-green-400' : 'text-orange-400'
                }`} />
              </div>
              <div>
                <p className={`font-medium ${
                  membershipData.userIsMember ? 'text-green-300' : 'text-orange-300'
                }`}>
                  {membershipData.userIsMember ? '✓ You are a member' : '⚠️ Not a member'} of {dao.name}
                </p>
                <p className="text-sm text-gray-400">
                  Your stake: {membershipData.userStake.toFixed(2)} MOVE 
                  {!membershipData.userIsMember && ` (need ${membershipData.minStakeRequired.toFixed(0)} MOVE)`}
                </p>
              </div>
            </div>
            {membershipData.userIsMember ? (
              <div className="flex items-center space-x-3">
              <div className="text-green-400 font-bold text-lg">
                {membershipData.userStake.toFixed(0)} VP
                </div>
                <button
                  onClick={handleLeaveDAO}
                  disabled={isLeaving}
                  className="px-3 py-2 rounded-lg text-sm border border-red-500/40 text-red-300 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50"
                  title="Leave this DAO"
                >
                  {isLeaving ? 'Leaving…' : 'Leave DAO'}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 w-full">
        {/* Total Members */}
        <div className="min-w-0 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 shadow-lg rounded-lg p-2 sm:p-3 flex flex-col items-center justify-center text-center transition-transform duration-300">
          <div className="mb-1 p-1.5 sm:mb-2 sm:p-2 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 shadow-inner flex items-center justify-center">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow" />
          </div>
          <div className="mb-0.5 text-base sm:text-lg font-extrabold text-white">
            {isLoading ? '...' : membershipData.totalMembers}
          </div>
          <div className="mb-0.5 text-[10px] sm:text-xs text-gray-300 font-medium">Total Members</div>
        </div>
        {/* Total Stakers */}
        <div className="min-w-0 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 shadow-lg rounded-lg p-2 sm:p-3 flex flex-col items-center justify-center text-center transition-transform duration-300">
          <div className="mb-1 p-1.5 sm:mb-2 sm:p-2 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 shadow-inner flex items-center justify-center">
            <Coins className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow" />
          </div>
          <div className="mb-0.5 text-base sm:text-lg font-extrabold text-white">
            {isLoading ? '...' : membershipData.totalStakers}
          </div>
          <div className="mb-0.5 text-[10px] sm:text-xs text-gray-300 font-medium">Total Stakers</div>
        </div>
        {/* Total Staked */}
        <div className="min-w-0 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 shadow-lg rounded-lg p-2 sm:p-3 flex flex-col items-center justify-center text-center transition-transform duration-300">
          <div className="mb-1 p-1.5 sm:mb-2 sm:p-2 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-inner flex items-center justify-center">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow" />
          </div>
          <div className="mb-0.5 text-base sm:text-lg font-extrabold text-white">
            {isLoading ? '...' : `${formatCompact(membershipData.totalStaked)}`}
          </div>
          <div className="mb-0.5 text-[10px] sm:text-xs text-gray-300 font-medium">Total Staked</div>
        </div>
        {/* Min Stake */}
        <div className="min-w-0 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 shadow-lg rounded-lg p-2 sm:p-3 flex flex-col items-center justify-center text-center transition-transform duration-300">
          <div className="mb-1 p-1.5 sm:mb-2 sm:p-2 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 shadow-inner flex items-center justify-center">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow" />
          </div>
          <div className="mb-0.5 text-base sm:text-lg font-extrabold text-white">
            {isLoading ? '...' : membershipData.minStakeRequired.toFixed(0)}
          </div>
          <div className="mb-0.5 text-[10px] sm:text-xs text-gray-300 font-medium">Min Stake</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="professional-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">Member Directory</h3>
          <div className="flex items-center space-x-3">
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
            <div className="text-sm text-gray-400">
              {isLoadingMembers ? 'Loading...' : `${filteredMembers.length} shown of ${membershipData.totalMembers} total`}
            </div>
          </div>
        </div>
        
        {/* Member directory status */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-start space-x-3">
            <Vote className="w-5 h-5 text-blue-400 mt-0.5" />
            <div className="text-sm">
              <p className="text-blue-300 font-medium mb-1">Real-Time Member Data</p>
              <p className="text-blue-200">
                Showing verified members with actual stakes. Total registered: <span className="font-bold">{membershipData.totalMembers}</span> | 
                Total stakers: <span className="font-bold">{membershipData.totalStakers}</span> | 
                Your status: <span className={`font-bold ${membershipData.userIsMember ? 'text-green-400' : 'text-orange-400'}`}>
                  {membershipData.userIsMember ? 'Member' : 'Not Member'}
                </span>
              </p>
              <p className="text-xs text-blue-300 mt-1">
                {members.length === 0 && !isLoadingMembers 
                  ? 'No verified members found. Connect your wallet and stake to appear in the directory.' 
                  : 'Displaying members with verified stakes and active membership status.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="professional-input pl-10 pr-4 py-2 w-full rounded-xl text-sm"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="professional-input px-3 py-2 rounded-xl text-sm"
            >
              <option value="all">All Members</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Members Table: table scrolls within container, page doesn't scroll */}
        {/* Table for desktop and up */}
        <div className="hidden sm:block w-full min-w-0 p-0 m-0">
          <table className="professional-card rounded-xl p-0 m-0 w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-4 px-4 font-medium text-gray-300">Member</th>
                <th className="text-left py-4 px-4 font-medium text-gray-300">Staked tokens</th>
                <th className="text-left py-4 px-4 font-medium text-gray-300">Voting Power</th>
                <th className="text-left py-4 px-4 font-medium text-gray-300">Join Date</th>
                <th className="text-left py-4 px-4 font-medium text-gray-300">Status</th>
                <th className="text-left py-4 px-4 font-medium text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingMembers ? (
                <tr>
                  <td colSpan={6} className="py-8 px-4 text-center">
                    <div className="flex items-center justify-center space-x-2 text-gray-400">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                      <span>Loading member data...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 px-4 text-center">
                    <div className="text-gray-400">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-lg font-medium mb-1">No members found</p>
                      <p className="text-sm">
                        {membershipData.totalMembers > 0 
                          ? 'Try adjusting your search filters or connect your wallet if you are a member.'
                          : 'This DAO has no registered members yet. Be the first to join!'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member, index) => (
                <tr key={member.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                        {member.shortAddress.slice(4, 6).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-white">{member.shortAddress}</p>
                        <p className="text-sm text-gray-400">Member #{index + 1}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-white font-medium">{member.tokensHeld.toLocaleString()} tokens</span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-white">{member.tokensHeld.toLocaleString()} tokens</span>
                      <div className="text-xs text-gray-400">(1:1 ratio)</div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-gray-400">{member.joinDate}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                      member.isActive 
                        ? 'bg-green-500/20 text-green-300 border-green-500/30' 
                        : 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                    }`}>
                      {member.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <button className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Card/list layout for mobile */}
        <div className="sm:hidden space-y-4">
          {isLoadingMembers ? (
            <div className="bg-white/5 rounded-xl p-6 text-center">
              <div className="flex items-center justify-center space-x-2 text-gray-400">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                <span>Loading member data...</span>
              </div>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="bg-white/5 rounded-xl p-6 text-center">
              <div className="text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium mb-1">No members found</p>
                <p className="text-sm">
                  {membershipData.totalMembers > 0 
                    ? 'Try adjusting your search filters or connect your wallet if you are a member.'
                    : 'This DAO has no registered members yet. Be the first to join!'}
                </p>
              </div>
            </div>
          ) : (
            filteredMembers.map((member, index) => (
            <div key={member.id} className="bg-white/5 rounded-xl p-4 flex flex-col space-y-2 shadow border border-white/10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                  {member.shortAddress.slice(4, 6).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-white">{member.shortAddress}</p>
                  <p className="text-xs text-gray-400">Member #{index + 1}</p>
                </div>
                <span className={`ml-auto px-3 py-1 rounded-full text-xs font-medium border ${
                  member.isActive 
                    ? 'bg-green-500/20 text-green-300 border-green-500/30' 
                    : 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                }`}>
                  {member.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-gray-300">
                <div className="flex items-center space-x-1">
                  <span className="font-semibold text-white">Staked:</span>
                  <span>{member.tokensHeld.toLocaleString()} tokens</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="font-semibold text-white">Voting Power:</span>
                  <span>{member.tokensHeld.toLocaleString()} tokens</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="font-semibold text-white">Joined:</span>
                  <span>{member.joinDate}</span>
                </div>
              </div>
              <div className="flex justify-end">
                <button className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DAOMembers;