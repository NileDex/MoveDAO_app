import React, { useState, useEffect } from 'react';
import {
  Plus,
  Clock,
  Search,
  XCircle,
  Play,
  Pause,
  Target,
  BarChart3,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { FaCheckCircle } from 'react-icons/fa';
import { DAO } from '../../types/dao';
import { useWallet } from '@razorlabs/razorkit';
import { aptosClient } from '../../movement_service/movement-client';
import { safeView, batchSafeView } from '../../utils/rpcUtils';
import { MODULE_ADDRESS } from '../../movement_service/constants';
import DAOProposalDetails from './DAOProposalDetails';
import { useDAOMembership } from '../../hooks/useDAOMembership';
import { useDAOState } from '../../contexts/DAOStateContext';
import { useWalletBalance } from '../../hooks/useWalletBalance';
import { useAlert } from '../alert/AlertContext';
import { useSectionLoader } from '../../hooks/useSectionLoader';
import SectionLoader from '../common/SectionLoader';

interface DAOProposalsProps {
  dao: DAO;
  sidebarCollapsed?: boolean;
}

interface ProposalData {
  id: string;
  title: string;
  description: string;
  proposer: string;
  status: string;
  contractStatus?: string; // Actual contract status
  category: string;
  votesFor: number;
  votesAgainst: number;
  abstainVotes: number;
  totalVotes: number;
  totalStaked: number;
  quorumRequired: number;
  quorumCurrent: number;
  votingStart: string;
  votingEnd: string;
  executionWindow: number;
  executionDeadline: string;
  created: string;
  userVotingPower: number;
  userVoted: boolean;
  userVoteType: string | null;
  needsActivation?: boolean; // Flag indicating if proposal needs manual activation
  needsFinalization?: boolean; // Flag indicating if proposal needs manual finalization
}

// Simple in-memory cache for proposal data
const proposalCache = new Map<string, { data: ProposalData[]; timestamp: number }>();
const PROPOSAL_CACHE_TTL = 30000; // 30 seconds

const DAOProposals: React.FC<DAOProposalsProps> = ({ dao, sidebarCollapsed = false }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProposal, setSelectedProposal] = useState<ProposalData | null>(null);
  const [proposals, setProposals] = useState<ProposalData[]>([]);
  const [, setProposalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [userStatus, setUserStatus] = useState({ isAdmin: false, isMember: false, isCouncil: false, isStaker: false });
  const [newProposal, setNewProposal] = useState({
    title: '',
    description: '',
    category: 'general',
    votingDuration: 7,
    executionWindow: 3,
    minQuorum: 20,
    startTime: '',
    endTime: ''
  });

  const { account, signAndSubmitTransaction } = useWallet();
  
  // Use persistent membership state
  const { 
    membershipData, 
    isMember, 
    isStaker, 
    canJoinDAO 
  } = useDAOMembership(dao);
  
  // Get wallet balance from DAO state context and wallet balance hook
  const { userState } = useDAOState();
  const { 
    balance: hookWalletBalance, 
    isLoading: balanceLoading, 
    error: balanceError, 
    refresh: refreshBalance 
  } = useWalletBalance();
  // Membership and proposal stakes use 6 decimals (1e6), not 8 decimals (1e8) like Aptos coins  
  const MEMBERSHIP_DECIMALS = 1e6;  // 6 decimals for membership/proposal stakes
  const toMOVE = (u64: number): number => u64 / MEMBERSHIP_DECIMALS;
  const [canCreateProposal, setCanCreateProposal] = useState(true);
  const [nextProposalTime, setNextProposalTime] = useState<Date | null>(null);
  const [stakeRequirements, setStakeRequirements] = useState({
    minStakeToJoin: 0,
    minStakeToPropose: 0,
    userCurrentStake: 0,
    isAdmin: false,
    isMember: false,
    canPropose: false
  });
  const [membershipConfigMissing, setMembershipConfigMissing] = useState(false);
  const [votingError, setVotingError] = useState<string>('');
  const [showVotingError, setShowVotingError] = useState(false);
  const { showAlert } = useAlert();

  // Status mappings from contract
  const statusMap: { [key: number]: string } = {
    0: 'draft',
    1: 'active', 
    2: 'passed',
    3: 'rejected',
    4: 'executed',
    5: 'cancelled'
  };

  // UI helpers
  const Pill: React.FC<{ className?: string; icon?: React.ReactNode; children: React.ReactNode }>
    = ({ className = '', icon, children }) => (
    <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium border ${className}`}>
      {icon ? <span className="-ml-0.5">{icon}</span> : null}
      <span>{children}</span>
    </span>
  );

  // Keep user status in sync with context membership state immediately
  useEffect(() => {
    setUserStatus(prev => ({
      ...prev,
      isMember,
      isStaker,
    }));
  }, [isMember, isStaker]);

  // Lightweight role re-check using a single ABI view; never downgrade on transient failures
  useEffect(() => {
    let cancelled = false;
    const recheck = async () => {
      try {
        if (!dao.id || !account?.address) return;
        const [statusRes, canCreateRes] = await Promise.allSettled([
          aptosClient.view({ payload: { function: `${MODULE_ADDRESS}::proposal::get_user_status_code`, functionArguments: [dao.id, account.address] } }),
          aptosClient.view({ payload: { function: `${MODULE_ADDRESS}::proposal::can_user_create_proposals`, functionArguments: [dao.id, account.address] } }),
        ]);
        if (cancelled) return;

        // Persistently set roles; if call fails, keep previous values
        setUserStatus(prev => {
          if (statusRes.status === 'fulfilled' && Array.isArray(statusRes.value)) {
            const code = Number(statusRes.value?.[0] || 0);
            return {
              ...prev,
              isAdmin: code === 3,
              isCouncil: code === 2,
              // Treat admin/council as members for UI purposes
              isMember: code === 1 || code === 2 || code === 3 || prev.isMember,
            };
          }
          return prev;
        });

        const adminIs = statusRes.status === 'fulfilled' && Array.isArray(statusRes.value)
          ? Number(statusRes.value?.[0] || 0) === 3
          : userStatus.isAdmin;
        const canCreateNow = canCreateRes.status === 'fulfilled' && Array.isArray(canCreateRes.value)
          ? Boolean(canCreateRes.value?.[0])
          : null;
        setCanCreateProposal(prev => adminIs || (canCreateNow === null ? prev : canCreateNow));
      } catch {}
    };
    recheck();
    return () => { cancelled = true; };
  }, [dao.id, account?.address]);


  const checkProposalEligibility = async () => {
    if (!account?.address) {
      setCanCreateProposal(false);
      setStakeRequirements({
        minStakeToJoin: 0,
        minStakeToPropose: 0,
        userCurrentStake: 0,
        isAdmin: false,
        isMember: false,
        canPropose: false
      });
      setUserStatus({ isAdmin: false, isMember: false, isCouncil: false, isStaker: false });
      return;
    }

    try {
      // Batch fetch staking requirements and user status with timeout
      const eligibilityPromises = [
        safeView({ 
            function: `${MODULE_ADDRESS}::membership::get_min_stake`, 
            functionArguments: [dao.id] 
        }),
        safeView({ 
            function: `${MODULE_ADDRESS}::membership::get_min_proposal_stake`, 
            functionArguments: [dao.id] 
        }),
        safeView({ 
          function: `${MODULE_ADDRESS}::staking::get_dao_staked_balance`, 
            functionArguments: [dao.id, account.address] 
        }),
        safeView({ 
            function: `${MODULE_ADDRESS}::admin::is_admin`, 
            functionArguments: [dao.id, account.address] 
        }),
        safeView({ 
            function: `${MODULE_ADDRESS}::membership::is_member`, 
            functionArguments: [dao.id, account.address] 
        }),
        safeView({ 
            function: `${MODULE_ADDRESS}::membership::can_create_proposal`, 
            functionArguments: [dao.id, account.address] 
        }),
        safeView({
          function: `${MODULE_ADDRESS}::council::is_council_member`,
          functionArguments: [dao.id, account.address]
        }).catch(() => null),
        aptosClient.getAccountResource({
          accountAddress: account.address,
          resourceType: `${MODULE_ADDRESS}::proposal::ProposerRecord`
        }).catch(() => null)
      ];

      // Add timeout to prevent hanging on slow calls (increased timeout)
      const [
        minStakeToJoinRes,
        minStakeToProposRes,
        userStakeRes,
        isAdminRes,
        isMemberRes,
        canProposeRes,
        isCouncilRes,
        proposerRecord
      ] = await Promise.race([
        Promise.allSettled(eligibilityPromises),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Eligibility check timeout')), 15000))
      ]) as any[];

      // Helpers for safe extraction from view responses
      const getU64 = (res: any): number => {
        return res && res.status === 'fulfilled' && Array.isArray(res.value)
          ? Number(res.value?.[0] ?? 0)
          : 0;
      };
      const getBool = (res: any): boolean => {
        return res && res.status === 'fulfilled' && Array.isArray(res.value)
          ? Boolean(res.value?.[0])
          : false;
      };
      
      // Check if membership config is missing and provide fallback values
      const membershipConfigMissingCheck = minStakeToJoinRes?.status === 'rejected' && 
        minStakeToJoinRes?.reason?.message?.includes('MISSING_DATA');
      setMembershipConfigMissing(membershipConfigMissingCheck);

      // Extract values with safe defaults - handle both raw and Octa values
      const rawMinStakeToJoin = getU64(minStakeToJoinRes);
      const rawMinStakeToPropose = getU64(minStakeToProposRes);
      const rawUserCurrentStake = getU64(userStakeRes);
      
      // IMPORTANT: The contract stores ALL stakes with 6 decimal places (1e6)
      // Convert all stake values consistently using the same decimal conversion:
      let minStakeToJoin = toMOVE(rawMinStakeToJoin); // Convert from 6-decimal to MOVE tokens
      let minStakeToPropose = toMOVE(rawMinStakeToPropose); // Convert from 6-decimal to MOVE tokens  
      const userCurrentStake = toMOVE(rawUserCurrentStake); // Convert from 6-decimal to MOVE
      const isAdmin = getBool(isAdminRes);
      const isMember = getBool(isMemberRes);
      
      // ADMIN BYPASS: If user is DAO creator (same address), they are admin
      const isDAOCreator = account.address === dao.id;
      
      // Handle missing membership configuration or admin bypass
      if (membershipConfigMissingCheck || isDAOCreator || isAdmin) {
        // Set reasonable defaults when calls fail
        if (minStakeToJoin === 0) minStakeToJoin = 6;
        if (minStakeToPropose === 0) minStakeToPropose = 6;
      }
      let isCouncil = getBool(isCouncilRes);

      // Fallback: try object-based council membership check via DAOInfo resource
      if (!isCouncil) {
        try {
          const daoInfoRes: any = await aptosClient.getAccountResource({
            accountAddress: dao.id,
            resourceType: `${MODULE_ADDRESS}::dao_core_file::DAOInfo`
          });
          const councilObjAddr = (daoInfoRes?.data as any)?.council?.inner || (daoInfoRes?.data as any)?.council || null;
          if (councilObjAddr) {
            const councilCheck = await aptosClient.view({
              payload: {
                function: `${MODULE_ADDRESS}::council::is_council_member_in_object`,
                functionArguments: [councilObjAddr, account.address]
              }
            });
            isCouncil = Boolean(councilCheck?.[0]);
          }
        } catch { /* ignore */ }
      }
      let canPropose = getBool(canProposeRes);
      
      // Handle missing membership configuration or RPC failures - allow proposal creation for:
      // 1. Admins (always allowed - bypass all stake requirements)
      // 2. Users with sufficient stake when config is missing or calls fail
      if (membershipConfigMissingCheck || canProposeRes?.status === 'rejected') {
        canPropose = isAdmin || isDAOCreator || userCurrentStake >= minStakeToPropose;
      }
      
      // CRITICAL: Admins and DAO creators should ALWAYS be able to create proposals regardless of config
      if (isAdmin || isDAOCreator) {
        canPropose = true;
      }
      
      // FALLBACK: If member and has enough stake but RPC failed, allow proposal creation
      if (isMember && userCurrentStake >= minStakeToPropose && !canPropose) {
        canPropose = true;
      }


      // Update stake requirements state using persistent data where available
      setStakeRequirements({
        minStakeToJoin: membershipData?.minStakeRequired || minStakeToJoin,
        minStakeToPropose,
        userCurrentStake: membershipData?.stakedAmount || userCurrentStake,
        isAdmin: isAdmin || isDAOCreator, // DAO creator is always admin
        isMember: membershipData?.isMember ?? isMember,
        canPropose: canPropose || isDAOCreator // DAO creator can always propose
      });

      setUserStatus({
        isAdmin,
        isMember: membershipData?.isMember ?? isMember,
        isCouncil,
        isStaker: membershipData?.isStaker || (userCurrentStake > 0)
      });

      // Check cooldown period
      let canCreateDueToCooldown = true;
      if (proposerRecord && proposerRecord.status === 'fulfilled' && proposerRecord.value?.data) {
        const lastProposalTime = Number((proposerRecord.value.data as any)?.last_proposal_time || 0);
        
        if (lastProposalTime > 0) {
        const cooldownPeriod = 24 * 60 * 60; // 24 hours in seconds
        const nowSeconds = Math.floor(Date.now() / 1000);
        const nextAllowedTime = lastProposalTime + cooldownPeriod;

        if (nowSeconds < nextAllowedTime) {
          canCreateDueToCooldown = false;
          setNextProposalTime(new Date(nextAllowedTime * 1000));
          } else {
            setNextProposalTime(null);
          }
        } else {
          setNextProposalTime(null);
        }
      } else {
        setNextProposalTime(null);
      }

      // Final eligibility: can propose (stake + membership) AND cooldown passed
      setCanCreateProposal((isAdmin || canPropose) && canCreateDueToCooldown);

    } catch (error) {
      console.warn('Failed to check proposal eligibility:', error);
      // Set safe defaults
      setCanCreateProposal(false);
      setStakeRequirements({
        minStakeToJoin: 0,
        minStakeToPropose: 0,
        userCurrentStake: 0,
        isAdmin: false,
        isMember: false,
        canPropose: false
      });
      setUserStatus({ isAdmin: false, isMember: false, isCouncil: false, isStaker: false });
    }
  };

  const fetchProposals = async (forceRefresh = false) => {
    try {
      // Persist roles before any list refresh to avoid UI flicker/down-grading
      try {
        if (dao.id && account?.address) {
          const status = await aptosClient.view({
            payload: { function: `${MODULE_ADDRESS}::proposal::get_user_status_code`, functionArguments: [dao.id, account.address] }
          }).catch(() => null);
          if (status && Array.isArray(status)) {
            const code = Number(status[0] || 0);
            setUserStatus(prev => ({
              ...prev,
              isAdmin: code === 3 || prev.isAdmin,
              isCouncil: code === 2 || prev.isCouncil,
              isMember: code === 1 || code === 2 || code === 3 || prev.isMember,
            }));
          }
        }
      } catch {}

      // Check cache first unless force refresh
      const cacheKey = `proposals_${dao.id}`;
      if (!forceRefresh) {
        const cached = proposalCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < PROPOSAL_CACHE_TTL) {
          setProposals(cached.data);
          setIsLoading(false);
          return;
        }
      }
      
      setIsLoading(true);
      
      // First, get the total number of proposals (with circuit breaker + cache)
      const countRes = await safeView({ 
        function: `${MODULE_ADDRESS}::proposal::get_proposals_count`, 
        functionArguments: [dao.id] 
      }, `proposals_count_${dao.id}`);
      
      const count = Number(countRes[0] || 0);
      setProposalCount(count);
      
      if (count === 0) {
        setProposals([]);
        return;
      }

      // Fetch individual proposals in optimized batches via managed request manager
      const batchSize = 5; // Process 5 proposals at a time for optimal performance
      const proposalResults: any[] = [];

      for (let i = 0; i < count; i += batchSize) {
        const batchEnd = Math.min(i + batchSize, count);
        const payloads = [] as any[];
        for (let j = i; j < batchEnd; j++) {
          payloads.push({
            function: `${MODULE_ADDRESS}::proposal::get_proposal`,
            functionArguments: [dao.id, j]
          });
        }
        const settled = await batchSafeView(payloads, { cachePrefix: `proposal_${dao.id}_${i}` });
        for (const s of settled) {
          if (s.status === 'fulfilled') proposalResults.push(s.value);
          else proposalResults.push(null);
        }
      }
      const validProposals: ProposalData[] = [];

      for (let i = 0; i < proposalResults.length; i++) {
        const result = proposalResults[i];
        if (!result || !result[0]) continue;

        const proposalData = result[0] as any;
        
        // Check if user can vote (is member with sufficient stake)
        let userCanVote = false;
        let userVoted = false;
        let userVoteType = null;
        
        if (account?.address) {
          // Check if user has already voted by examining the votes array first (faster)
          const votes = proposalData.votes || [];
          const userVote = votes.find((vote: any) => vote.voter === account.address);
          if (userVote) {
            userVoted = true;
            userVoteType = userVote.vote_type.value;
            userCanVote = true; // If they voted, they must be a member
          } else {
            // Use persistent membership state instead of querying blockchain each time
            userCanVote = isMember && isStaker;
          }
        }

        // Tally vote COUNTS from the on-chain votes vector (individual voters)
        const votesVec = (proposalData.votes || []) as any[];
        let yesCount = 0;
        let noCount = 0;
        let abstainCount = 0;
        for (const v of votesVec) {
          const vt = typeof v.vote_type?.value === 'number' ? v.vote_type.value : v.vote_type;
          if (vt === 1) yesCount += 1;
          else if (vt === 2) noCount += 1;
          else if (vt === 3) abstainCount += 1;
        }
        const totalVoters = yesCount + noCount + abstainCount;

        // Keep turnout (quorum) based on WEIGHT (staked voting power)
        const totalVotingWeight = toMOVE(Number(proposalData.yes_votes || 0))
          + toMOVE(Number(proposalData.no_votes || 0))
          + toMOVE(Number(proposalData.abstain_votes || 0));
        const totalStaked = 85200; // TODO: Get from DAO stats
        const quorumCurrent = totalStaked > 0 ? (totalVotingWeight / totalStaked) * 100 : 0;

        // Calculate effective status with automatic transitions
        const contractStatus = statusMap[proposalData.status.value] || 'unknown';
        const now = Date.now();
        const votingStart = new Date((Number(proposalData.voting_start || 0)) * 1000).getTime();
        const votingEnd = new Date((Number(proposalData.voting_end || 0)) * 1000).getTime();
        
        let effectiveStatus = contractStatus;
        
        // Keep status constant with contract; do not auto-transition in UI
        effectiveStatus = contractStatus;

        const proposal: ProposalData = {
          id: proposalData.id.toString(),
          title: proposalData.title,
          description: proposalData.description,
          proposer: proposalData.proposer,
          status: effectiveStatus,
          contractStatus: contractStatus, // Keep track of actual contract status
          category: 'general', // TODO: Add category to contract or derive from title
          // Expose vote COUNTS for UI totals and distribution
          votesFor: yesCount,
          votesAgainst: noCount,
          abstainVotes: abstainCount,
          totalVotes: totalVoters,
          totalStaked,
          quorumRequired: Number(proposalData.min_quorum_percent || 0),
          quorumCurrent,
          votingStart: new Date((Number(proposalData.voting_start || 0)) * 1000).toISOString(),
          votingEnd: new Date((Number(proposalData.voting_end || 0)) * 1000).toISOString(),
          executionWindow: Number(proposalData.execution_window || 0) / (24 * 60 * 60), // Convert to days
          executionDeadline: new Date((Number(proposalData.voting_end || 0) + Number(proposalData.execution_window || 0)) * 1000).toISOString(),
          created: new Date((Number(proposalData.created_at || 0)) * 1000).toISOString(),
          userVotingPower: userCanVote ? (membershipData?.votingPower || 0) : 0,
          userVoted,
          userVoteType: userVoteType === 1 ? 'yes' : userVoteType === 2 ? 'no' : userVoteType === 3 ? 'abstain' : null,
          needsActivation: contractStatus === 'draft' && now >= votingStart, // Flag for UI to show activation needed
          needsFinalization: contractStatus === 'active' && now >= votingEnd // Flag for UI to show finalization needed
        };

        validProposals.push(proposal);
      }

      const finalProposals = validProposals.reverse(); // Show newest first
      setProposals(finalProposals);
      
      // Cache the results
      proposalCache.set(cacheKey, { data: finalProposals, timestamp: Date.now() });
      
    } catch (error: any) {
      console.error('Failed to fetch proposals:', error);
      const msg = String(error?.message || error);
      if (msg.includes('Circuit breaker is OPEN') || msg.includes('429') || msg.includes('Too Many Requests')) {
        // Silently retry without showing message to user
        const retryDelay = 5000;
        setTimeout(() => {
          fetchProposals(forceRefresh);
        }, retryDelay);
      }
      setProposals([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
    checkProposalEligibility();
  }, [dao.id, account?.address]);

  // Auto-activation effect - runs when proposals change
  useEffect(() => {
    if (proposals.length > 0 && account?.address) {
      autoActivateEligibleProposals();
    }
  }, [proposals.length, account?.address]);

  // Periodic status sync effect
  useEffect(() => {
    if (proposals.length === 0) return;
    
    const intervalId = setInterval(() => {
      fetchProposals(); // Refresh proposals to sync status
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(intervalId);
  }, [proposals.length]);

  // Proposal creation function
  // Start voting function
  const handleStartVoting = async (proposalId: string) => {
    if (!account || !signAndSubmitTransaction) {
      showAlert('Please connect your wallet to start voting', 'error');
      return;
    }
    
    try {
      const payload = {
        function: `${MODULE_ADDRESS}::proposal::start_voting`,
        typeArguments: [],
        functionArguments: [
          dao.id,
          parseInt(proposalId)
        ]
      };
      
      const response = await signAndSubmitTransaction({ payload } as any);
      console.log('Voting started manually:', response);
      
      // Refresh proposals to update status
      await fetchProposals();
      
      showAlert('Voting started successfully! The proposal is now active for voting.', 'success');
    } catch (error: any) {
      console.error('Failed to start voting:', error);
      
      // Handle specific errors
      let errorMessage = 'Failed to start voting. Please try again.';
      if (error?.message || error?.toString()) {
        const errorString = error.message || error.toString();
        
        if (errorString.includes('invalid_status') || errorString.includes('0xc5')) {
          errorMessage = 'This proposal is not in draft status and cannot be activated.';
        } else if (errorString.includes('not_admin_or_proposer') || errorString.includes('0xc6')) {
          errorMessage = 'Only the proposal creator or DAO admins can start voting.';
        }
      }
      
      showAlert(errorMessage, 'error');
    }
  };

  // Auto-activation function for proposals that should be active
  const autoActivateEligibleProposals = async () => {
    if (!account?.address) return;
    
    const eligibleProposals = proposals.filter(proposal => 
      proposal.needsActivation && 
      (proposal.proposer === account.address)
    );
    
    for (const proposal of eligibleProposals) {
      try {
        console.log(`Auto-activating proposal ${proposal.id} as voting time has started`);
        await handleStartVoting(proposal.id);
      } catch (error) {
        console.warn(`Failed to auto-activate proposal ${proposal.id}:`, error);
        // Continue with other proposals even if one fails
      }
    }
  };

  // Finalize proposal function
  const handleFinalizeProposal = async (proposalId: string) => {
    if (!account || !signAndSubmitTransaction) {
      showAlert('Please connect your wallet to finalize this proposal', 'error');
      return;
    }
    
    try {
      const proposal = proposals.find(p => p.id === proposalId);
      if (!proposal) {
        showAlert('Proposal not found. Please refresh the page.', 'error');
        return;
      }
      
      // Check if voting period has ended
      const now = Date.now();
      const votingEnd = new Date(proposal.votingEnd).getTime();
      
      if (now < votingEnd) {
        showAlert('Voting period has not ended yet. Please wait for the voting period to end before finalizing.', 'error');
        return;
      }
      
      // Enhanced authorization check using contract view functions
      console.log('Checking finalization authorization...');
      try {
        const [canFinalizeRes, isAdminRes, canCreateRes] = await Promise.allSettled([
          aptosClient.view({
            payload: {
              function: `${MODULE_ADDRESS}::proposal::can_user_finalize_proposals`,
              functionArguments: [dao.id, account.address]
            }
          }),
          aptosClient.view({
            payload: {
              function: `${MODULE_ADDRESS}::admin::is_admin`,
              functionArguments: [dao.id, account.address]
            }
          }),
          aptosClient.view({
            payload: {
              function: `${MODULE_ADDRESS}::membership::can_create_proposal`,
              functionArguments: [dao.id, account.address]
            }
          })
        ]);
        
        const canFinalize = canFinalizeRes.status === 'fulfilled' && Array.isArray(canFinalizeRes.value) 
          ? Boolean(canFinalizeRes.value[0]) 
          : false;
        const isAdmin = isAdminRes.status === 'fulfilled' && Array.isArray(isAdminRes.value) 
          ? Boolean(isAdminRes.value[0]) 
          : false;
        const canCreate = canCreateRes.status === 'fulfilled' && Array.isArray(canCreateRes.value) 
          ? Boolean(canCreateRes.value[0]) 
          : false;
        
        console.log('Authorization check results:', { canFinalize, isAdmin, canCreate });
        
        if (!canFinalize && !isAdmin && !canCreate) {
          showAlert('You are not authorized to finalize proposals. You need to be either: 1. A DAO admin, OR 2. A member with proposal creation rights (sufficient stake). Please check your membership status and staked amount.', 'error');
          return;
        }
      } catch (authError) {
        console.warn('Authorization check failed, proceeding with transaction:', authError);
      }
      
      // Double-check proposal status and voting times on-chain before finalizing
      try {
        const [statusCheck, proposalDetails] = await Promise.allSettled([
          aptosClient.view({
            payload: {
              function: `${MODULE_ADDRESS}::proposal::get_proposal_status`,
              functionArguments: [dao.id, parseInt(proposalId)]
            }
          }),
          aptosClient.view({
            payload: {
              function: `${MODULE_ADDRESS}::proposal::get_proposal_details`,
              functionArguments: [dao.id, parseInt(proposalId)]
            }
          })
        ]);
        
        const currentStatus = statusCheck.status === 'fulfilled' && Array.isArray(statusCheck.value) 
          ? Number(statusCheck.value[0]) 
          : null;
        console.log('Current proposal status on-chain:', currentStatus);
        
        if (currentStatus !== 1) { // 1 = active status
          showAlert(`This proposal cannot be finalized. Current status: ${currentStatus === 0 ? 'draft' : currentStatus === 2 ? 'passed' : currentStatus === 3 ? 'rejected' : currentStatus === 4 ? 'executed' : 'unknown'}. Only active proposals can be finalized.`, 'error');
          return;
        }
        
        // Check voting end time on-chain
        if (proposalDetails.status === 'fulfilled' && Array.isArray(proposalDetails.value)) {
          const details = proposalDetails.value;
          // get_proposal_details returns: (id, title, description, proposer, status, yes_votes, no_votes, abstain_votes, created_at, voting_start, voting_end, execution_window, approved_by_admin, finalized_by_admin, vote_count, member_count)
          const votingEndOnChain = Number(details[10] || 0); // voting_end is at index 10
          const nowSeconds = Math.floor(Date.now() / 1000);
          
          console.log('Time check:', {
            nowSeconds,
            votingEndOnChain,
            hasVotingEnded: nowSeconds >= votingEndOnChain,
            timeUntilEnd: votingEndOnChain - nowSeconds
          });
          
          if (nowSeconds < votingEndOnChain) {
            const endDate = new Date(votingEndOnChain * 1000).toLocaleString();
            showAlert(`Voting period has not ended yet. Voting ends at: ${endDate}. Current time: ${new Date().toLocaleString()}. Time remaining: ${Math.ceil((votingEndOnChain - nowSeconds) / 60)} minutes`, 'error');
            return;
          }
        }
        
        // Check if staking module is properly initialized (needed for finalization)
        try {
          const totalStaked = await aptosClient.view({
            payload: {
              function: `${MODULE_ADDRESS}::staking::get_total_staked`,
              functionArguments: [dao.id]
            }
          });
          console.log('Total staked amount:', totalStaked);
        } catch (stakingError) {
          console.warn('Could not check staking amount:', stakingError);
          showAlert('Warning: Could not verify staking module state. The finalization might fail if staking is not properly initialized.', 'error');
        }
      } catch (statusError) {
        console.warn('Status/time check failed, proceeding with transaction:', statusError);
      }
      
      console.log('Attempting to finalize proposal:', {
        function: `${MODULE_ADDRESS}::proposal::finalize_proposal`,
        daoId: dao.id,
        proposalId: parseInt(proposalId),
        userAddress: account.address
      });
      
      // All checks passed, proceeding with transaction
      console.log('All validation checks passed. Proceeding with finalization...');
      
      const payload = {
        function: `${MODULE_ADDRESS}::proposal::finalize_proposal`,
        typeArguments: [],
        functionArguments: [
          dao.id,
          parseInt(proposalId)
        ]
      };
      
      console.log('Executing finalize transaction...');
      const response = await signAndSubmitTransaction({ payload } as any);
      console.log('Proposal finalized successfully:', response);
      
      // Refresh proposals to update status
      await fetchProposals();
      
      showAlert('Proposal finalized successfully! The outcome has been determined based on votes and quorum.', 'success');
    } catch (error: any) {
      console.error('Failed to finalize proposal:', error);
      console.error('Error type:', typeof error);
      console.error('Error keys:', Object.keys(error || {}));
      console.error('Error stack:', error?.stack);
      
      // Try to extract more detailed error information
      let errorDetails = {};
      if (error) {
        errorDetails = {
          message: error.message,
          code: error.code,
          data: error.data,
          details: error.details,
          reason: error.reason,
          transaction: error.transaction,
          transactionHash: error.transactionHash
        };
      }
      console.error('Detailed error info:', errorDetails);
      
      let errorMessage = 'Failed to finalize proposal. ';
      if (error?.message || error?.toString()) {
        const errorString = error.message || error.toString();
        
        if (errorString.includes('User rejected')) {
          errorMessage = 'Transaction was cancelled by user.';
        } else if (errorString.includes('simulation')) {
          errorMessage = 'Transaction simulation failed. This usually means:\\n\\n1. You are not authorized to finalize this proposal\\n2. The proposal is not in the correct status\\n3. The voting period has not ended yet\\n\\nPlease check your authorization and try again.';
        } else if (errorString.includes('invalid_status') || errorString.includes('0xc5')) {
          errorMessage = 'This proposal is not in active status and cannot be finalized.';
        } else if (errorString.includes('not_authorized') || errorString.includes('0x9')) {
          errorMessage = 'You are not authorized to finalize this proposal. Only admins or members with proposal creation rights can finalize proposals.';
        } else if (errorString.includes('voting_ended') || errorString.includes('0xc9')) {
          errorMessage = 'Voting period has not ended yet. Please wait for the voting period to end before finalizing.';
        } else if (errorString.includes('EABORTED')) {
          // Move abort error
          errorMessage = `Contract execution failed: ${errorString}\\n\\nThis indicates a Move contract assertion failed. Check console for detailed error information.`;
        } else {
          errorMessage += `Error details: ${errorString}`;
        }
      } else {
        errorMessage += 'No error details available. Check console logs for more information.';
      }
      
      showAlert(errorMessage, 'error');
    }
  };

  // Enhanced voting function with automatic activation check
  const handleVoteWithActivation = async (proposalId: string, voteType: number) => {
    // Clear any previous errors
    setShowVotingError(false);
    setVotingError('');
    
    const proposal = proposals.find(p => p.id === proposalId);
    
    if (!proposal) {
      setVotingError('Proposal not found. Please refresh the page.');
      setShowVotingError(true);
      return;
    }
    
    // If proposal needs activation and user can activate it, try auto-activation first
    if (proposal.needsActivation && proposal.contractStatus === 'draft') {
      const canActivate = proposal.proposer === account?.address;
      
      if (canActivate) {
        try {
          console.log('Auto-activating proposal before voting...');
          await handleStartVoting(proposalId);
          // Wait a moment for status to update, then proceed with voting
          setTimeout(() => handleVote(proposalId, voteType), 1000);
          return;
        } catch (error) {
          console.warn('Auto-activation failed, proceeding with regular vote:', error);
        }
      }
    }
    
    // Proceed with regular voting
    await handleVote(proposalId, voteType);
  };

  // Voting functions
  const handleVote = async (proposalId: string, voteType: number) => {
    if (!account || !signAndSubmitTransaction) {
      throw new Error('Please connect your wallet to vote on this proposal');
    }

    try {
      // Pre-validate conditions by checking proposal status
      const proposal = proposals.find(p => p.id === proposalId);
      if (!proposal) {
        throw new Error('Proposal not found. Please refresh the page and try again.');
      }

      // Check if voting has started by examining the voting start time
      const now = Date.now();
      const votingStart = new Date(proposal.votingStart).getTime();
      const votingEnd = new Date(proposal.votingEnd).getTime();

      // Enforce strict time-based voting - only allow voting when the scheduled time has been reached
      if (now < votingStart) {
        const startDate = new Date(votingStart).toLocaleString();
        throw new Error(`Voting has not started yet. Voting begins on ${startDate}. Please wait for the voting period to begin before casting your vote.`);
      }

      if (now > votingEnd) {
        const endDate = new Date(votingEnd).toLocaleString();
        throw new Error(`Voting has ended on ${endDate}. This proposal is no longer accepting votes.`);
      }

      if (proposal.userVoted) {
        throw new Error('You have already voted on this proposal. Each member can only vote once per proposal.');
      }

      // Enhanced membership and voting power checks using persistent state
      if (!isMember) {
        if (!isStaker) {
          throw new Error(`You are not a member of ${dao.name}. You need to stake at least ${membershipData?.minStakeRequired || 'some'} MOVE tokens to join this DAO and participate in governance.`);
        } else {
          throw new Error(`You have staked tokens but are not yet a member of ${dao.name}. Please join the DAO first to participate in governance voting.`);
        }
      }
      
      if (proposal.userVotingPower <= 0) {
        throw new Error(`You do not have sufficient voting power in ${dao.name}. Current voting power: ${membershipData?.votingPower || 0} MOVE. You may need to stake more tokens to participate in governance.`);
      }

      const payload = {
          function: `${MODULE_ADDRESS}::proposal::cast_vote`,
        typeArguments: [],
          functionArguments: [
            dao.id,
            parseInt(proposalId),
            voteType // 1 = yes, 2 = no, 3 = abstain
          ]
      };

      const response = await signAndSubmitTransaction({ payload } as any);
      console.log('Vote cast:', response);
      
      // Refresh proposals
      await fetchProposals();
      
      showAlert('Vote cast successfully!', 'success');
    } catch (error: any) {
      console.error('Failed to cast vote:', error);
      
      // Handle user-friendly error messages for voting with enhanced membership context
      let errorMessage = `Unable to cast vote on this ${dao.name} proposal. `;
      
      // Add specific membership context to the error
      if (!isMember) {
        if (!isStaker) {
          errorMessage += `You are not a member - you need to stake at least ${membershipData?.minStakeRequired || 'some'} MOVE tokens to join and vote.`;
        } else {
          errorMessage += `You have ${membershipData?.stakedAmount || 0} MOVE staked but need to join the DAO to vote.`;
        }
      } else if ((membershipData?.votingPower || 0) <= 0) {
        errorMessage += `You are a member but have no voting power. Current stake: ${membershipData?.stakedAmount || 0} MOVE.`;
      } else {
        errorMessage += 'Please check your membership status and try again.';
      }
      if (error?.message || error?.toString()) {
        const errorString = error.message || error.toString();
        
        // If it's already a user-friendly error (like voting time validation), use it directly
        if (errorString.includes('Voting has not started yet') || errorString.includes('Voting begins on')) {
          errorMessage = errorString;
        } else if (errorString.includes('0xc8') || errorString.includes('200')) {
          errorMessage = 'Voting has not started yet for this proposal. Please wait for the voting period to begin before casting your vote.';
        } else if (errorString.includes('0xc9') || errorString.includes('201')) {
          errorMessage = 'Voting has ended for this proposal. This proposal is no longer accepting votes.';
        } else if (errorString.includes('0xca') || errorString.includes('202')) {
          errorMessage = 'You have already voted on this proposal. Each member can only vote once per proposal.';
        } else if (errorString.includes('0xcb') || errorString.includes('203')) {
          errorMessage = 'Proposal not found. The proposal may have been removed or the ID is invalid. Please refresh and try again.';
        } else if (errorString.includes('0xd0') || errorString.includes('208')) {
          errorMessage = 'Invalid vote selection. Please choose a valid voting option (Yes, No, or Abstain).';
        } else if (errorString.includes('0x9') || errorString.includes('not_authorized')) {
          errorMessage = 'You are not authorized to vote on this proposal. You may need to stake tokens to become a DAO member.';
        } else if (errorString.includes('0x97') || errorString.includes('151')) {
          errorMessage = 'You are not a member of this DAO. Only DAO members can participate in governance voting.';
        } else if (errorString.includes('0x99') || errorString.includes('153')) {
          errorMessage = 'Insufficient stake to vote. You need to stake more tokens to participate in DAO governance.';
        }
      }
      
      // Show error to user instead of throwing
      setVotingError(errorMessage);
      setShowVotingError(true);
      
      // Auto-hide error after 8 seconds for longer messages
      setTimeout(() => {
        setShowVotingError(false);
        setVotingError('');
      }, 8000);
    }
  };

  const handleCreateProposal = async () => {
    if (!account || !signAndSubmitTransaction) {
      showAlert('Please connect your wallet to create a proposal', 'error');
      return;
    }

    if (!newProposal.title.trim() || !newProposal.description.trim()) {
      showAlert('Please fill in both title and description', 'error');
      return;
    }

    try {
      setIsCreating(true);

      // Enhanced stake validation with detailed feedback
      // ADMINS BYPASS FRONTEND CHECKS - no error messages shown to admins
      if (stakeRequirements.isAdmin) {
        // Admins proceed without any validation errors
      } else if (!stakeRequirements.canPropose) {
        // Only show staking errors to non-admin users
        let errorMessage = 'You cannot create proposals. ';
        
        // Check if membership config is missing and user has sufficient stake
        if (membershipConfigMissing && stakeRequirements.userCurrentStake >= 5) {
          errorMessage = 'DAO membership configuration is missing. You have sufficient stake but membership validation failed. Contact the DAO creator to initialize membership settings.';
        } else if (stakeRequirements.userCurrentStake === 0 && stakeRequirements.minStakeToJoin === 0) {
          errorMessage = `⚠️ DAO CONFIGURATION ISSUE: This DAO appears to be incorrectly configured or doesn't exist. Both your stake and minimum requirements show 0.00 MOVE. Please verify you're using the correct DAO address, or contact the DAO creator to properly initialize this DAO.`;
        } else if (!stakeRequirements.isMember) {
          errorMessage += `You need to be a DAO member first. Minimum stake to join: ${stakeRequirements.minStakeToJoin.toFixed(2)} MOVE tokens. Your current stake: ${stakeRequirements.userCurrentStake.toFixed(2)} MOVE tokens.`;
        } else {
          errorMessage += `You need to stake more tokens. Minimum stake for proposals: ${stakeRequirements.minStakeToPropose.toFixed(2)} MOVE tokens. Your current stake: ${stakeRequirements.userCurrentStake.toFixed(2)} MOVE tokens.`;
        }
        
        showAlert(errorMessage, 'error');
        return;
      }

      // Compute timing parameters
      const nowSeconds = Math.floor(Date.now() / 1000);
      let startDelaySeconds = 0;
      let votingDurationSeconds = newProposal.votingDuration * 24 * 60 * 60;

      const hasStart = Boolean(newProposal.startTime && newProposal.startTime.trim());
      const hasEnd = Boolean(newProposal.endTime && newProposal.endTime.trim());

      if (hasStart) {
        const startSeconds = Math.floor(new Date(newProposal.startTime).getTime() / 1000);
        startDelaySeconds = Math.max(0, startSeconds - nowSeconds);
      }

      if (hasEnd) {
        const endSeconds = Math.floor(new Date(newProposal.endTime).getTime() / 1000);
        const effectiveStart = hasStart ? Math.max(nowSeconds, Math.floor(new Date(newProposal.startTime).getTime() / 1000)) : nowSeconds;
        if (endSeconds <= effectiveStart) {
          showAlert('End time must be after the start time', 'error');
          return;
        }
        votingDurationSeconds = endSeconds - effectiveStart;
      }

      const executionWindowSeconds = newProposal.executionWindow * 24 * 60 * 60;
      // Convert percentage to basis points for future use if needed

      // Contract expects absolute timestamps for start and end
      // Ensure start timestamp is at least 30 seconds in the future to account for transaction time
      const minStartDelay = 30; // 30 seconds minimum delay
      const effectiveStartDelay = Math.max(startDelaySeconds, minStartDelay);
      const startTimestamp = Math.floor(Date.now() / 1000) + effectiveStartDelay;
      const endTimestamp = startTimestamp + votingDurationSeconds;

      // Validate all required values are present
      if (!dao.id) {
        showAlert('DAO ID is missing. Please refresh the page and try again.', 'error');
        return;
      }

      if (!MODULE_ADDRESS) {
        showAlert('Module address is not configured. Please check the application setup.', 'error');
        return;
      }

      // Debug logging to check for undefined values
      console.log('Creating proposal with arguments:', {
        daoId: dao.id,
        title: newProposal.title,
        description: newProposal.description,
        startTimestamp: startTimestamp.toString(),
        endTimestamp: endTimestamp.toString(),
        executionWindowSeconds: executionWindowSeconds.toString(),
        minQuorum: Math.floor(newProposal.minQuorum).toString(),
        moduleAddress: MODULE_ADDRESS
      });

      const functionArguments = [
            dao.id,
            newProposal.title,
            newProposal.description,
        startTimestamp.toString(),
        endTimestamp.toString(),
        executionWindowSeconds.toString(),
        Math.floor(newProposal.minQuorum).toString()
      ];

      // Validate no arguments are undefined
      const undefinedIndex = functionArguments.findIndex(arg => arg === undefined || arg === null);
      if (undefinedIndex !== -1) {
        console.error('Undefined argument at index:', undefinedIndex, functionArguments);
        showAlert('Invalid proposal data. Please check all fields and try again.', 'error');
        return;
      }

      const payload = {
        function: `${MODULE_ADDRESS}::proposal::create_proposal`,
        typeArguments: [],
        functionArguments
      };

      const response = await signAndSubmitTransaction({ payload } as any);
      console.log('Proposal created:', response);

      // Reset form and close
      setNewProposal({
        title: '',
        description: '',
        category: 'general',
        votingDuration: 7,
        executionWindow: 3,
        minQuorum: 20,
        startTime: '',
        endTime: ''
      });
      setShowCreateForm(false);

      // Refresh proposals, but do not downgrade roles on transient view failures
      await fetchProposals();
      // Re-evaluate create permission using single consolidated view with persistence
      try {
        const [statusRes, canCreateRes] = await Promise.allSettled([
          aptosClient.view({ payload: { function: `${MODULE_ADDRESS}::proposal::get_user_status_code`, functionArguments: [dao.id, account.address] } }),
          aptosClient.view({ payload: { function: `${MODULE_ADDRESS}::proposal::can_user_create_proposals`, functionArguments: [dao.id, account.address] } }),
        ]);
        setUserStatus(prev => {
          if (statusRes.status === 'fulfilled' && Array.isArray(statusRes.value)) {
            const code = Number(statusRes.value?.[0] || 0);
            return {
              ...prev,
              isAdmin: code === 3 || prev.isAdmin,
              isCouncil: code === 2 || prev.isCouncil,
              isMember: code === 1 || code === 2 || code === 3 || prev.isMember,
            };
          }
          return prev;
        });
        if (canCreateRes.status === 'fulfilled' && Array.isArray(canCreateRes.value)) {
          const can = Boolean(canCreateRes.value?.[0]);
          setCanCreateProposal(prev => userStatus.isAdmin || can || prev);
        }
      } catch {}
      
      showAlert('Proposal created successfully!', 'success');
    } catch (error: any) {
      console.error('Failed to create proposal:', error);
      let errorMessage = 'Failed to create proposal';
      
      // Check for specific error codes
      if (error?.message || error?.toString()) {
        const errorString = error.message || error.toString();
        
        if (errorString.includes('0x262') || errorString.includes('610')) {
          errorMessage = 'You can only create one proposal per 24 hours. Please wait before creating another proposal.';
        } else if (errorString.includes('insufficient') || errorString.includes('Not enough coins')) {
          errorMessage = 'Insufficient MOVE tokens. Creating a proposal requires 0.01 MOVE tokens as a fee (plus ~0.5 MOVE for gas). Please ensure you have at least 0.51 MOVE in your wallet.';
        } else if (errorString.includes('0x4') || errorString.includes('invalid_amount')) {
          errorMessage = 'Invalid proposal parameters. Please check your input values.';
        } else if (errorString.includes('0x9') || errorString.includes('not_authorized')) {
          errorMessage = 'You are not authorized to create proposals. You may need to stake more tokens or become a DAO member.';
        } else {
          errorMessage = `Failed to create proposal: ${errorString}`;
        }
      }
      
      showAlert(errorMessage, 'error');
    } finally {
      setIsCreating(false);
    }
  };

  // Filter proposals based on status, category, and search
  const filteredProposals = proposals.filter(proposal => {
    const matchesStatus = filterStatus === 'all' || proposal.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || proposal.category === filterCategory;
    const matchesSearch = searchTerm === '' || 
      proposal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proposal.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesCategory && matchesSearch;
  });

  // UI state for mobile icon filters
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  // Mobile stats carousel index
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Proposal statistics
  const proposalStats = {
    total: proposals.length,
    active: proposals.filter(p => p.status === 'active').length,
    passed: proposals.filter(p => p.status === 'passed').length,
    rejected: proposals.filter(p => p.status === 'rejected').length,
    executed: proposals.filter(p => p.status === 'executed').length
  };

  // Utility functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'passed': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'rejected': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'executed': return 'text-purple-400 bg-purple-500/20 border-purple-500/30';
      case 'cancelled': return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="w-4 h-4" />;
              case 'passed': return <FaCheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'executed': return <Target className="w-4 h-4" />;
      case 'cancelled': return <Pause className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const formatProposalId = (idStr: string) => {
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) return `#${idStr}`;
    const padded = String(id).padStart(5, '0');
    return `A-${padded}`;
  };

  const formatShortDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="w-full px-2 sm:px-6 space-y-6 sm:space-y-8">
      {/* Details view when a proposal is selected */}
      {selectedProposal ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedProposal(null)}
              className="px-3 py-2 bg-white/5 hover:bg.White/10 text-gray-300 rounded-lg text-sm"
            >
              ← Back to proposals
            </button>
          </div>
          
          {/* Voting Error Display - Proposal Details View */}
          {showVotingError && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start space-x-3">
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-red-300 font-medium mb-1">Voting Error</h3>
                <p className="text-red-200 text-sm">{votingError}</p>
              </div>
              <button
                onClick={() => {
                  setShowVotingError(false);
                  setVotingError('');
                }}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <DAOProposalDetails
            title={selectedProposal.title}
            description={selectedProposal.description}
            proposer={selectedProposal.proposer}
            endsAt={selectedProposal.votingEnd}
            votingStart={selectedProposal.votingStart}
            votingEnd={selectedProposal.votingEnd}
            quorumCurrentPercent={selectedProposal.quorumCurrent}
            quorumRequiredPercent={selectedProposal.quorumRequired}
            category={selectedProposal.category}
            votesFor={selectedProposal.votesFor}
            votesAgainst={selectedProposal.votesAgainst}
            votesAbstain={selectedProposal.abstainVotes}
            status={selectedProposal.status}
            proposalId={selectedProposal.id}
            createdAt={selectedProposal.created}
            daoName={dao.name}
            onVote={(voteType) => handleVoteWithActivation(selectedProposal.id, voteType)}
            onStartVoting={() => handleStartVoting(selectedProposal.id)}
            onFinalize={() => handleFinalizeProposal(selectedProposal.id)}
            canVote={selectedProposal.userVotingPower > 0}
            hasVoted={selectedProposal.userVoted}
            canStartVoting={Boolean(selectedProposal.proposer === account?.address || userStatus.isAdmin)}
            canFinalize={Boolean(userStatus.isAdmin || stakeRequirements.canPropose)}
            userAddress={account?.address}
            userIsAdmin={userStatus.isAdmin}
            userIsCouncil={userStatus.isCouncil}
            userIsMember={userStatus.isMember}
          />
        </div>
      ) : (
        <>
          {/* Voting Error Display */}
          {showVotingError && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start space-x-3">
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-red-300 font-medium mb-1">Voting Error</h3>
                <p className="text-red-200 text-sm">{votingError}</p>
              </div>
              <button
                onClick={() => {
                  setShowVotingError(false);
                  setVotingError('');
                }}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          )}
          
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text.White mb-2">Proposals</h1>
          <p className="text-gray-400">Community governance proposals for {dao.name}</p>
          {account?.address && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {userStatus.isAdmin && (
                <Pill className="text-purple-300 bg-purple-500/20 border-purple-500/30">Admin</Pill>
              )}
              {userStatus.isCouncil && (
                <Pill className="text-blue-300 bg-blue-500/20 border-blue-500/30">Council</Pill>
              )}
              {userStatus.isMember && (
                <Pill className="text-green-300 bg-green-500/20 border-green-500/30">Member</Pill>
              )}
              {!userStatus.isMember && userStatus.isStaker && (
                <Pill className="text-yellow-300 bg-yellow-500/20 border-yellow-500/30">Staker</Pill>
              )}
              {!userStatus.isAdmin && !userStatus.isCouncil && !userStatus.isMember && (
                <Pill className="text-gray-300 bg-gray-500/20 border-gray-500/30">Guest</Pill>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchProposals(true)}
            disabled={isLoading}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all disabled:opacity-50"
            title="Refresh proposals"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
            {(() => {
              const canCreate = userStatus.isAdmin || stakeRequirements.canPropose; // ABI: admin OR can_create_proposal
              const isAdmin = userStatus.isAdmin;
              const isMember = userStatus.isMember;
              const isCouncil = userStatus.isCouncil;
              let tooltip = 'Create a new governance proposal';
              let label = 'New Proposal';
              if (!canCreate) {
                if (nextProposalTime) {
                  tooltip = `You can create another proposal at ${nextProposalTime.toLocaleString()}`;
                  label = `Wait ${Math.ceil((nextProposalTime.getTime() - Date.now()) / (1000 * 60 * 60))}h`;
                } else {
                  // Minimal, ABI-aligned messaging (no hard join gate)
                  if (!isAdmin) {
                    if (!isMember) {
                      label = 'Become Member';
                      tooltip = `Become a member to propose. Minimum stake to join: ${stakeRequirements.minStakeToJoin.toFixed(2)} MOVE.`;
                    } else {
                      label = 'Not Eligible';
                      tooltip = `Stake ≥ ${stakeRequirements.minStakeToPropose.toFixed(2)} MOVE to propose. Your stake: ${stakeRequirements.userCurrentStake.toFixed(2)} MOVE.`;
                    }
                    if (isCouncil) {
                      tooltip += ' (Council alone does not grant proposal creation per contract)';
                    }
                  }
                }
              }
              return (
                <div className="inline-block rounded-[13px] p-[2px]">
                  <button
                    onClick={() => canCreate && setShowCreateForm(true)}
                    disabled={!canCreate}
                    title={tooltip}
                    className={`flex items-center space-x-2 px-4 py-2 font-medium text-sm transition-all rounded-[11px] w-full h-full border ${
                      canCreate
                        ? 'text-gray-900 dark:text-white bg-transparent dark:bg-transparent border-gray-300 dark:border-white/20 hover:bg-transparent dark:hover:bg-transparent'
                        : 'cursor-not-allowed text-gray-500 dark:text-gray-400 bg-transparent dark:bg-transparent border-gray-300 dark:border-white/15'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                </div>
              );
            })()}
        </div>
      </div>

      {/* Stats - single card carousel on mobile, grid on larger screens */}
      <div className="sm:hidden">
        <div className="relative">
          {/* Total */}
          {carouselIndex === 0 && (
            <div className="professional-card p-4 text-center rounded-xl relative">
              <button
                type="button"
                className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1"
                onClick={() => setCarouselIndex((i) => (i - 1 + 5) % 5)}
                aria-label="Previous stat"
              >
                <ChevronLeft className="w-5 h-5 text-black dark:text-white" style={{ color: 'inherit' }} />
              </button>
              <button
                type="button"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1"
                onClick={() => setCarouselIndex((i) => (i + 1) % 5)}
                aria-label="Next stat"
              >
                <ChevronRight className="w-5 h-5 text-black dark:text-white" style={{ color: 'inherit' }} />
              </button>
              <div className="text-xl font-bold text-white">{proposalStats.total}</div>
              <div className="text-sm text-gray-400">Total</div>
            </div>
          )}
          {/* Active */}
          {carouselIndex === 1 && (
            <div className="professional-card p-4 text-center rounded-xl relative">
              <button
                type="button"
                className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1"
                onClick={() => setCarouselIndex((i) => (i - 1 + 5) % 5)}
                aria-label="Previous stat"
              >
                <ChevronLeft className="w-5 h-5 text-black dark:text-white" style={{ color: 'inherit' }} />
              </button>
              <button
                type="button"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1"
                onClick={() => setCarouselIndex((i) => (i + 1) % 5)}
                aria-label="Next stat"
              >
                <ChevronRight className="w-5 h-5 text-black dark:text-white" style={{ color: 'inherit' }} />
              </button>
              <div className="text-xl font-bold text-blue-400">{proposalStats.active}</div>
              <div className="text-sm text-gray-400">Active</div>
            </div>
          )}
          {/* Passed */}
          {carouselIndex === 2 && (
            <div className="professional-card p-4 text-center rounded-xl relative">
              <button
                type="button"
                className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1"
                onClick={() => setCarouselIndex((i) => (i - 1 + 5) % 5)}
                aria-label="Previous stat"
              >
                <ChevronLeft className="w-5 h-5 text-black dark:text-white" style={{ color: 'inherit' }} />
              </button>
              <button
                type="button"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1"
                onClick={() => setCarouselIndex((i) => (i + 1) % 5)}
                aria-label="Next stat"
              >
                <ChevronRight className="w-5 h-5 text-black dark:text-white" style={{ color: 'inherit' }} />
              </button>
              <div className="text-xl font-bold text-green-400">{proposalStats.passed}</div>
              <div className="text-sm text-gray-400">Passed</div>
            </div>
          )}
          {/* Rejected */}
          {carouselIndex === 3 && (
            <div className="professional-card p-4 text-center rounded-xl relative">
              <button
                type="button"
                className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1"
                onClick={() => setCarouselIndex((i) => (i - 1 + 5) % 5)}
                aria-label="Previous stat"
              >
                <ChevronLeft className="w-5 h-5 text-black dark:text-white" style={{ color: 'inherit' }} />
              </button>
              <button
                type="button"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1"
                onClick={() => setCarouselIndex((i) => (i + 1) % 5)}
                aria-label="Next stat"
              >
                <ChevronRight className="w-5 h-5 text-black dark:text-white" style={{ color: 'inherit' }} />
              </button>
              <div className="text-xl font-bold text-red-400">{proposalStats.rejected}</div>
              <div className="text-sm text-gray-400">Rejected</div>
            </div>
          )}
          {/* Executed */}
          {carouselIndex === 4 && (
            <div className="professional-card p-4 text-center rounded-xl relative">
              <button
                type="button"
                className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1"
                onClick={() => setCarouselIndex((i) => (i - 1 + 5) % 5)}
                aria-label="Previous stat"
              >
                <ChevronLeft className="w-5 h-5 text-black dark:text-white" style={{ color: 'inherit' }} />
              </button>
              <button
                type="button"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1"
                onClick={() => setCarouselIndex((i) => (i + 1) % 5)}
                aria-label="Next stat"
              >
                <ChevronRight className="w-5 h-5 text-black dark:text-white" style={{ color: 'inherit' }} />
              </button>
              <div className="text-xl font-bold text-purple-400">{proposalStats.executed}</div>
              <div className="text-sm text-gray-400">Executed</div>
            </div>
          )}
        </div>
      </div>

      {/* Grid for tablets and up */}
      <div className="hidden sm:grid grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
        <div className="professional-card p-3 sm:p-4 text-center rounded-xl">
          <div className="text-lg sm:text-xl font-bold text-white">{proposalStats.total}</div>
          <div className="text-xs sm:text-sm text-gray-400">Total</div>
        </div>
        <div className="professional-card p-3 sm:p-4 text-center rounded-xl">
          <div className="text-lg sm:text-xl font-bold text-blue-400">{proposalStats.active}</div>
          <div className="text-xs sm:text-sm text-gray-400">Active</div>
        </div>
        <div className="professional-card p-3 sm:p-4 text-center rounded-xl">
          <div className="text-lg sm:text-xl font-bold text-green-400">{proposalStats.passed}</div>
          <div className="text-xs sm:text-sm text-gray-400">Passed</div>
        </div>
        <div className="professional-card p-3 sm:p-4 text-center rounded-xl">
          <div className="text-lg sm:text-xl font-bold text-red-400">{proposalStats.rejected}</div>
          <div className="text-xs sm:text-sm text-gray-400">Rejected</div>
        </div>
        <div className="professional-card p-3 sm:p-4 text-center rounded-xl">
          <div className="text-lg sm:text-xl font-bold text-purple-400">{proposalStats.executed}</div>
          <div className="text-xs sm:text-sm text-gray-400">Executed</div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search proposals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="professional-input pl-10 pr-4 py-2 w-full rounded-xl text-sm"
          />
        </div>
        {/* Desktop selects only (icons removed) */}
        <div className="flex items-center space-x-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="professional-input px-3 py-2 rounded-xl text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="passed">Passed</option>
            <option value="rejected">Rejected</option>
            <option value="executed">Executed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="professional-input px-3 py-2 rounded-xl text-sm"
          >
            <option value="all">All Categories</option>
            <option value="general">General</option>
            <option value="governance">Governance</option>
            <option value="treasury">Treasury</option>
            <option value="technical">Technical</option>
            <option value="community">Community</option>
          </select>
        </div>
      </div>

      {/* Create Proposal Inline (non-modal) */}
      {showCreateForm && (
        <div className="professional-card rounded-xl p-6 w-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Create New Proposal</h2>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-gray-400 hover:text-white p-1"
            >
              <XCircle className="w-5 h-5" />
            </button>
                </div>

          {/* Comprehensive Proposal Requirements Notice */}
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <h3 className="text-amber-300 font-semibold">Important Requirements & Fees</h3>
                <div className="text-sm text-gray-300 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                    <span><strong className="text-amber-200">Proposal Fee:</strong> 0.01 MOVE tokens (anti-spam fee)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                    <span><strong className="text-amber-200">Gas Fees:</strong> ~0.5 MOVE for transaction</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                    <span><strong className="text-amber-200">Cooldown:</strong> 24 hours between proposals</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                    <span><strong className="text-amber-200">Total Needed:</strong> At least 0.51 MOVE in wallet</span>
                  </div>
                </div>
                {/* User Wallet Balance Status */}
                <div className="mt-3 p-3 bg-gray-800/50 rounded-lg border border-gray-600/30">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">Your Wallet Balance:</span>
                    <div className="flex items-center gap-3">
                      {balanceLoading ? (
                        <span className="text-gray-400 font-mono">Loading...</span>
                      ) : (
                        <>
                          <span className={`font-mono font-bold ${
                            (hookWalletBalance || userState?.totalBalance || 0) >= 0.51 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {(hookWalletBalance || userState?.totalBalance || 0).toFixed(2)} MOVE
                          </span>
                          {(hookWalletBalance || userState?.totalBalance || 0) >= 0.51 ? (
                            <FaCheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400" />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {!balanceLoading && (hookWalletBalance || userState?.totalBalance || 0) < 0.51 && (
                    <div className="mt-2 text-xs text-red-300">
                      ⚠️ Insufficient funds. You need {(0.51 - (hookWalletBalance || userState?.totalBalance || 0)).toFixed(2)} more MOVE.
                    </div>
                  )}
                  {balanceError && (
                    <div className="mt-2 text-xs text-amber-300">
                      ⚠️ Unable to fetch balance: {balanceError}
                    </div>
                  )}
                </div>
                {nextProposalTime && (
                  <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded">
                    <div className="flex items-center gap-2 text-red-300 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>Next proposal available: {nextProposalTime.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
                </div>

          {/* Stake Requirements Info */}
          {stakeRequirements.minStakeToPropose > 0 && (
            <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <h3 className="text-blue-300 font-medium mb-2">Proposal Creation Requirements</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                  <span className="text-gray-400">Your Current Stake:</span>
                  <div className={`font-mono font-bold ${
                    stakeRequirements.userCurrentStake >= stakeRequirements.minStakeToPropose 
                      ? 'text-green-400' 
                      : 'text-red-400'
                  }`}>
                    {stakeRequirements.userCurrentStake.toFixed(2)} MOVE
                    </div>
                    </div>
                    <div>
                  <span className="text-gray-400">Required for Proposals:</span>
                  <div className="text-blue-300 font-mono font-bold">
                    {stakeRequirements.minStakeToPropose.toFixed(2)} MOVE
                  </div>
                    </div>
                    <div>
                  <span className="text-gray-400">Status:</span>
                  <div className={`font-medium ${
                    stakeRequirements.isAdmin
                      ? 'text-purple-400'
                      : stakeRequirements.canPropose
                        ? 'text-green-400'
                        : 'text-red-400'
                  }`}>
                    {stakeRequirements.isAdmin 
                      ? 'Admin (No stake required)' 
                      : stakeRequirements.canPropose 
                        ? 'Eligible' 
                        : 'Need more stake'
                    }
                      </div>
                    </div>
                  </div>
              {!stakeRequirements.isAdmin && !stakeRequirements.canPropose && (
                <div className="mt-3 text-sm text-blue-200">
                  💡 You need to stake {(stakeRequirements.minStakeToPropose - stakeRequirements.userCurrentStake).toFixed(2)} more MOVE tokens to create proposals.
                      </div>
                    )}
                  </div>
                )}

          <div className="space-y-6">
              <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Basics</h3>
                <label className="block text-sm font-medium text-white mb-2">Title</label>
                <input
                  type="text"
                  value={newProposal.title}
                  onChange={(e) => setNewProposal({...newProposal, title: e.target.value})}
                  className="professional-input w-full px-3 py-2 rounded-xl text-sm"
                  placeholder="Enter proposal title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Description</label>
                <textarea
                  value={newProposal.description}
                  onChange={(e) => setNewProposal({...newProposal, description: e.target.value})}
                  className="professional-input w-full px-3 py-2 rounded-xl text-sm h-24 resize-none"
                  placeholder="Describe your proposal in detail"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Category</label>
                <select
                  value={newProposal.category}
                  onChange={(e) => setNewProposal({...newProposal, category: e.target.value})}
                  className="professional-input w-full px-3 py-2 rounded-xl text-sm"
                >
                  <option value="general">General</option>
                  <option value="governance">Governance</option>
                  <option value="treasury">Treasury</option>
                  <option value="technical">Technical</option>
                  <option value="community">Community</option>
                </select>
              </div>

            <div className={`grid grid-cols-1 gap-4 ${
              sidebarCollapsed ? 'md:grid-cols-2' : 'md:grid-cols-1'
            }`}>
                <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Voting Schedule</h3>
                <label className="block text-sm font-medium text-white mb-2">Start Time</label>
                  <input
                  type="datetime-local"
                  value={newProposal.startTime}
                  onChange={(e) => setNewProposal({...newProposal, startTime: e.target.value})}
                    className="professional-input w-full px-3 py-2 rounded-xl text-sm"
                  min={new Date().toISOString().slice(0, 16)}
                  />
                </div>

                <div>
                <label className="block text-sm font-medium text-white mb-2">End Time</label>
                <input
                  type="datetime-local"
                  value={newProposal.endTime}
                  onChange={(e) => setNewProposal({...newProposal, endTime: e.target.value})}
                  className="professional-input w-full px-3 py-2 rounded-xl text-sm"
                  min={newProposal.startTime || new Date().toISOString().slice(0, 16)}
                />
              </div>
            </div>

            <div className={`grid grid-cols-1 gap-4 ${
              sidebarCollapsed ? 'md:grid-cols-2' : 'md:grid-cols-1'
            }`}>
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Governance Parameters</h3>
                <label className="block text-sm font-medium text-white mb-2">Minimum Quorum (%)</label>
                  <input
                    type="number"
                    value={newProposal.minQuorum}
                  onChange={(e) => setNewProposal({...newProposal, minQuorum: parseFloat(e.target.value) || 0})}
                    className="professional-input w-full px-3 py-2 rounded-xl text-sm"
                  placeholder="e.g., 25"
                    min="1"
                    max="100"
                  />
                </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Execution Window (days)</label>
                <input
                  type="number"
                  value={newProposal.executionWindow}
                  onChange={(e) => setNewProposal({...newProposal, executionWindow: parseInt(e.target.value) || 7})}
                  className="professional-input w-full px-3 py-2 rounded-xl text-sm"
                  placeholder="e.g., 7"
                  min="1"
                  max="365"
                />
              </div>
              </div>

            <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCreateProposal}
                disabled={isCreating || !newProposal.title || !newProposal.description || !newProposal.startTime || !newProposal.endTime}
                className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${
                  isCreating || !newProposal.title || !newProposal.description || !newProposal.startTime || !newProposal.endTime
                    ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                >
                  {isCreating ? 'Creating...' : 'Create Proposal'}
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 border border-white/20 text-white rounded-xl text-sm hover:bg-white/5"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
      )}

          {/* Proposals List (compact rows) */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading proposals...</p>
        </div>
      ) : filteredProposals.length === 0 ? (
        <div className="text-center py-12">
          <BarChart3 className="w-16 h-16 text-gray-500 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-white mb-2">No proposals found</h3>
          <p className="text-gray-400 mb-4">
            {proposals.length === 0 
              ? 'This DAO has no proposals yet. Be the first to create one!'
              : 'Try adjusting your search filters.'}
          </p>
        </div>
      ) : (
        <div className="professional-card rounded-xl p-0 overflow-hidden">
          <div className="divide-y divide-white/10">
            {filteredProposals.map((proposal) => (
              <div
                key={proposal.id}
                className="p-4 hover:bg-white/5 transition-all cursor-pointer"
                onClick={() => setSelectedProposal(proposal)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 min-w-0">
                    <span className="text-xs sm:text-sm font-mono text-gray-400 w-16 shrink-0">{formatProposalId(proposal.id)}</span>
                    <Pill className={`${getStatusColor(proposal.status)} border-0 shrink-0`} icon={getStatusIcon(proposal.status)}>
                      <span className="capitalize">{proposal.status}</span>
                    </Pill>
                    <h3 className="text-white font-medium break-words text-sm sm:text-base">{proposal.title}</h3>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 sm:self-auto self-start">
                    {/* Finalize button for active proposals that have ended */}
                    {proposal.needsFinalization && (userStatus.isAdmin || stakeRequirements.canPropose) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFinalizeProposal(proposal.id);
                        }}
                        className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-medium transition-all"
                        title="Finalize proposal - voting period has ended"
                      >
                        Finalize
                      </button>
                    )}
                    {/* Activation button for draft proposals */}
                    {proposal.needsActivation && (proposal.proposer === account?.address || userStatus.isAdmin) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartVoting(proposal.id);
                        }}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-all"
                        title="Start voting for this proposal"
                      >
                        Start Voting
                      </button>
                    )}
                  <span className="text-xs sm:text-sm text-gray-400 whitespace-nowrap">{formatShortDate(proposal.created || proposal.votingEnd)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}
        </>
      )}
    </div>
  );
};

export default DAOProposals;
