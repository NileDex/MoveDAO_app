import React, { useState } from 'react';
import { 
  Plus, 
  ThumbsUp, 
  ThumbsDown, 
  Clock, 
  MessageCircle, 
  Filter, 
  Search, 
  AlertCircle,
  XCircle,
  Users,
  Zap,
  Eye,
  Play,
  Pause,
  Target,
  BarChart3,
  Timer,
  Calendar,
  Settings,
  TrendingUp,
  Minus
} from 'lucide-react';
import { FaCheckCircle } from 'react-icons/fa';
import { DAO } from '../../types/dao';

interface DAOProposalsProps {
  dao: DAO;
}

const DAOProposalsEnhanced: React.FC<DAOProposalsProps> = ({ dao }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProposal, setSelectedProposal] = useState<string | null>(null);
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

  // Enhanced mock data matching smart contract structure
  const proposals = [
    {
      id: '1',
      title: 'Community Fund Allocation for Q2 2024',
      description: 'Proposal to allocate 50,000 tokens from the community treasury to fund development initiatives, marketing campaigns, and community events for the second quarter.',
      status: 'active',
      category: 'treasury',
      proposer: '0x1234...5678',
      votesFor: 12470,
      votesAgainst: 1560,
      abstainVotes: 890,
      totalVotes: 14920,
      totalStaked: 85200,
      quorumRequired: 20,
      quorumCurrent: 17.5,
      votingStart: '2024-01-15T10:00:00Z',
      votingEnd: '2024-01-22T10:00:00Z',
      executionWindow: 3,
      executionDeadline: '2024-01-25T10:00:00Z',
      created: '2024-01-15T09:00:00Z',
      userVotingPower: 250,
      userVoted: false,
      userVoteType: null
    },
    {
      id: '2',
      title: 'Governance Parameter Updates',
      description: 'Adjust voting thresholds from 20% to 15% quorum and extend voting period from 5 to 7 days to improve participation.',
      status: 'passed',
      category: 'governance',
      proposer: '0x9876...4321',
      votesFor: 21560,
      votesAgainst: 2340,
      abstainVotes: 1100,
      totalVotes: 25000,
      totalStaked: 85200,
      quorumRequired: 20,
      quorumCurrent: 29.3,
      votingStart: '2024-01-10T10:00:00Z',
      votingEnd: '2024-01-17T10:00:00Z',
      executionWindow: 3,
      executionDeadline: '2024-01-20T10:00:00Z',
      created: '2024-01-10T09:00:00Z',
      userVotingPower: 250,
      userVoted: true,
      userVoteType: 'yes'
    },
    {
      id: '3',
      title: 'Strategic Partnership with DeFi Protocol',
      description: 'Establish a strategic partnership to integrate our governance token with a major DeFi protocol.',
      status: 'rejected',
      category: 'partnership',
      proposer: '0x5555...9999',
      votesFor: 8920,
      votesAgainst: 15450,
      abstainVotes: 630,
      totalVotes: 25000,
      totalStaked: 85200,
      quorumRequired: 20,
      quorumCurrent: 29.3,
      votingStart: '2024-01-12T10:00:00Z',
      votingEnd: '2024-01-19T10:00:00Z',
      executionWindow: 3,
      executionDeadline: null,
      created: '2024-01-12T09:00:00Z',
      userVotingPower: 250,
      userVoted: true,
      userVoteType: 'no'
    },
    {
      id: '4',
      title: 'Treasury Diversification Strategy',
      description: 'Diversify 30% of treasury holdings into stablecoins and blue-chip cryptocurrencies to reduce volatility.',
      status: 'draft',
      category: 'treasury',
      proposer: '0x7777...3333',
      votesFor: 0,
      votesAgainst: 0,
      abstainVotes: 0,
      totalVotes: 0,
      totalStaked: 85200,
      quorumRequired: 20,
      quorumCurrent: 0,
      votingStart: null,
      votingEnd: null,
      executionWindow: 7,
      executionDeadline: null,
      created: '2024-01-20T09:00:00Z',
      userVotingPower: 250,
      userVoted: false,
      userVoteType: null
    },
    {
      id: '5',
      title: 'Marketing Campaign Budget Approval',
      description: 'Approve budget for Q2 marketing initiatives including social media campaigns and conference sponsorships.',
      status: 'executed',
      category: 'marketing',
      proposer: '0x1111...2222',
      votesFor: 18500,
      votesAgainst: 3200,
      abstainVotes: 800,
      totalVotes: 22500,
      totalStaked: 82000,
      quorumRequired: 20,
      quorumCurrent: 27.4,
      votingStart: '2024-01-05T10:00:00Z',
      votingEnd: '2024-01-12T10:00:00Z',
      executionWindow: 3,
      executionDeadline: '2024-01-15T10:00:00Z',
      created: '2024-01-05T09:00:00Z',
      userVotingPower: 250,
      userVoted: true,
      userVoteType: 'yes'
    }
  ];

  // Filtering logic
  const filteredProposals = proposals.filter(proposal => {
    const matchesStatus = filterStatus === 'all' || proposal.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || proposal.category === filterCategory;
    const matchesSearch = searchTerm === '' || 
      proposal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proposal.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesCategory && matchesSearch;
  });

  // Handler functions
  const handleCreateProposal = () => {
    console.log('Creating proposal:', newProposal);
    setShowCreateForm(false);
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
  };

  const handleStartVoting = (proposalId: string) => {
    console.log('Starting voting for proposal:', proposalId);
  };

  const handleExecuteProposal = (proposalId: string) => {
    console.log('Executing proposal:', proposalId);
  };

  const handleCancelProposal = (proposalId: string) => {
    console.log('Cancelling proposal:', proposalId);
  };

  const handleVote = (proposalId: string, voteType: 'yes' | 'no' | 'abstain') => {
    console.log('Voting on proposal:', proposalId, 'with:', voteType);
  };

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
      case 'active': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'passed': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'rejected': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'executed': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'cancelled': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Eye className="w-4 h-4" />;
      case 'active': return <Play className="w-4 h-4" />;
              case 'passed': return <FaCheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'executed': return <Zap className="w-4 h-4" />;
      case 'cancelled': return <Pause className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'treasury': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      case 'governance': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'partnership': return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'marketing': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'technical': return 'bg-red-500/10 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  const formatTimeLeft = (endTime: string | null) => {
    if (!endTime) return 'Not scheduled';
    
    const now = new Date();
    const end = new Date(endTime);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  };

  const isExecutionExpired = (proposal: any) => {
    if (!proposal.executionDeadline || proposal.status !== 'passed') return false;
    return new Date() > new Date(proposal.executionDeadline);
  };

  return (
    <div className="container mx-auto px-2 sm:px-6 max-w-screen-lg space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Governance Proposals</h2>
          <p className="text-gray-400">Participate in {dao?.name || 'DAO'} decision-making</p>
        </div>
        <div style={{
          background: 'linear-gradient(45deg, #ffc30d, #b80af7)',
          borderRadius: '13px',
          padding: '2px',
          display: 'inline-block',
        }}>
        <button
          onClick={() => setShowCreateForm(true)}
            className="flex items-center space-x-2 px-4 py-3 font-medium w-full sm:w-auto"
            style={{
              background: '#121212',
              borderRadius: '13px',
              border: 'none',
              color: 'inherit',
              width: '100%',
              height: '100%',
            }}
        >
          <Plus className="w-4 h-4" />
          <span>New Proposal</span>
        </button>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="professional-card rounded-xl p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search proposals by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="professional-input pl-10 pr-4 py-2 w-full rounded-xl text-sm"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="professional-input px-3 py-2 rounded-xl text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="passed">Passed</option>
                  <option value="rejected">Rejected</option>
                  <option value="executed">Executed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-gray-400" />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="professional-input px-3 py-2 rounded-xl text-sm"
                >
                  <option value="all">All Categories</option>
                  <option value="treasury">Treasury</option>
                  <option value="governance">Governance</option>
                  <option value="partnership">Partnership</option>
                  <option value="marketing">Marketing</option>
                  <option value="technical">Technical</option>
                  <option value="general">General</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>{filteredProposals.length} proposals found</span>
            <div className="flex items-center space-x-4">
              <span>Total Voting Power: 85,200 tokens</span>
              <span>Active Proposals: {proposals.filter(p => p.status === 'active').length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Create Proposal Form */}
      {showCreateForm && (
        <div className="professional-card rounded-xl p-6 animate-fade-in">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center space-x-2">
            <Settings className="w-5 h-5 text-purple-400" />
            <span>Create New Proposal</span>
          </h3>
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
                <input
                  type="text"
                  value={newProposal.title}
                  onChange={(e) => setNewProposal({...newProposal, title: e.target.value})}
                  className="professional-input w-full px-4 py-3 rounded-xl"
                  placeholder="Enter proposal title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Category *</label>
                <select
                  value={newProposal.category}
                  onChange={(e) => setNewProposal({...newProposal, category: e.target.value})}
                  className="professional-input w-full px-4 py-3 rounded-xl"
                >
                  <option value="general">General</option>
                  <option value="treasury">Treasury</option>
                  <option value="governance">Governance</option>
                  <option value="partnership">Partnership</option>
                  <option value="marketing">Marketing</option>
                  <option value="technical">Technical</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Description *</label>
              <textarea
                value={newProposal.description}
                onChange={(e) => setNewProposal({...newProposal, description: e.target.value})}
                rows={4}
                className="professional-input w-full px-4 py-3 rounded-xl"
                placeholder="Provide detailed description of your proposal and its expected outcomes"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Start Time</label>
                <input
                  type="datetime-local"
                  value={newProposal.startTime}
                  onChange={(e) => setNewProposal({...newProposal, startTime: e.target.value})}
                  className="professional-input w-full px-4 py-3 rounded-xl"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">End Time</label>
                <input
                  type="datetime-local"
                  value={newProposal.endTime}
                  onChange={(e) => setNewProposal({...newProposal, endTime: e.target.value})}
                  className="professional-input w-full px-4 py-3 rounded-xl"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Voting Duration (days) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={newProposal.votingDuration}
                  onChange={(e) => setNewProposal({...newProposal, votingDuration: parseInt(e.target.value)})}
                  className="professional-input w-full px-4 py-3 rounded-xl"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Execution Window (days) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={newProposal.executionWindow}
                  onChange={(e) => setNewProposal({...newProposal, executionWindow: parseInt(e.target.value)})}
                  className="professional-input w-full px-4 py-3 rounded-xl"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Min. Quorum (%) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newProposal.minQuorum}
                  onChange={(e) => setNewProposal({...newProposal, minQuorum: parseInt(e.target.value)})}
                  className="professional-input w-full px-4 py-3 rounded-xl"
                />
              </div>
            </div>
            
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <h4 className="text-sm font-medium text-blue-300 mb-2 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4" />
                <span>Proposal Parameters</span>
              </h4>
              <div className="text-sm text-blue-200 space-y-1">
                <p>• Voting Duration: How long members can vote on this proposal</p>
                <p>• Execution Window: Time after voting ends to execute if passed</p>
                <p>• Min. Quorum: Minimum percentage of total voting power required</p>
                <p>• Your Voting Power: 250 tokens (0.29% of total)</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div style={{
                background: 'linear-gradient(45deg, #ffc30d, #b80af7)',
                borderRadius: '13px',
                padding: '2px',
                display: 'inline-block',
              }}>
              <button
                onClick={handleCreateProposal}
                disabled={!newProposal.title || !newProposal.description}
                className="px-6 py-3 font-medium w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: '#121212',
                  borderRadius: '13px',
                  border: 'none',
                  color: 'inherit',
                  width: '100%',
                  height: '100%',
                }}
              >
                Create Proposal
              </button>
              </div>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-medium transition-all w-full sm:w-auto"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Proposals List */}
      <div className="space-y-4">
        {filteredProposals.map((proposal) => (
          <div key={proposal.id} className="professional-card rounded-xl p-4 sm:p-6 w-full box-border transition-all">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex flex-row items-center flex-wrap gap-2 mb-3">
                  <h3 className="text-lg font-bold text-white">{proposal.title}</h3>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(proposal.status)}`}>
                      {getStatusIcon(proposal.status)}
                      <span>{proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}</span>
                    </span>
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getCategoryColor(proposal.category)}`}>
                      {proposal.category.charAt(0).toUpperCase() + proposal.category.slice(1)}
                    </span>
                  </div>
                </div>
                <p className="text-gray-300 mb-4 leading-relaxed text-sm sm:text-base">{proposal.description}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-400">
                  <span>By {proposal.proposer}</span>
                  <span>•</span>
                  <span>Created {new Date(proposal.created).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="text-right ml-0 sm:ml-6">
                <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-400 mb-2">
                  <Clock className="w-4 h-4" />
                  <span>{formatTimeLeft(proposal.votingEnd)}</span>
                </div>
                {proposal.status === 'passed' && isExecutionExpired(proposal) && (
                  <div className="flex items-center space-x-2 text-xs text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    <span>Execution expired</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quorum and Voting Power Visualization */}
            {proposal.status === 'active' && (
              <div className="mb-4 space-y-3">
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-medium text-white">Quorum Progress</span>
                    </div>
                    <span className="text-sm text-white">{proposal.quorumCurrent.toFixed(1)}% / {proposal.quorumRequired}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((proposal.quorumCurrent / proposal.quorumRequired) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-400">
                    {proposal.quorumCurrent >= proposal.quorumRequired ? 
                      "Quorum met - proposal eligible for passing" : 
                      `Need ${(proposal.quorumRequired - proposal.quorumCurrent).toFixed(1)}% more to meet quorum`
                    }
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Voting Section */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm">
                <div className="flex items-center space-x-2">
                  <ThumbsUp className="w-4 h-4 text-green-400" />
                  <span className="font-medium text-green-400">{proposal.votesFor.toLocaleString()} tokens</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ThumbsDown className="w-4 h-4 text-red-400" />
                  <span className="font-medium text-red-400">{proposal.votesAgainst.toLocaleString()} tokens</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Minus className="w-4 h-4 text-yellow-400" />
                  <span className="font-medium text-yellow-400">{proposal.abstainVotes.toLocaleString()} tokens</span>
                </div>
                <span className="text-gray-400">{proposal.totalVotes.toLocaleString()} total voting power</span>
                {proposal.userVoted && (
                  <span className="text-blue-400">You voted: {proposal.userVoteType}</span>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {proposal.status === 'draft' && (
                  <button 
                    onClick={() => handleStartVoting(proposal.id)}
                    className="flex items-center space-x-1 bg-green-600/20 hover:bg-green-600/30 text-green-300 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium border border-green-600/30 transition-all"
                  >
                    <Play className="w-3 h-3" />
                    <span>Start Voting</span>
                  </button>
                )}
                
                {proposal.status === 'active' && !proposal.userVoted && (
                  <>
                    <button 
                      onClick={() => handleVote(proposal.id, 'yes')}
                      className="flex items-center space-x-1 bg-green-600/20 hover:bg-green-600/30 text-green-300 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium border border-green-600/30 transition-all"
                    >
                      <ThumbsUp className="w-3 h-3" />
                      <span>Support (250 tokens)</span>
                    </button>
                    <button 
                      onClick={() => handleVote(proposal.id, 'no')}
                      className="flex items-center space-x-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium border border-red-600/30 transition-all"
                    >
                      <ThumbsDown className="w-3 h-3" />
                      <span>Oppose (250 tokens)</span>
                    </button>
                    <button 
                      onClick={() => handleVote(proposal.id, 'abstain')}
                      className="flex items-center space-x-1 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium border border-yellow-600/30 transition-all"
                    >
                      <Minus className="w-3 h-3" />
                      <span>Abstain (250 tokens)</span>
                    </button>
                  </>
                )}
                
                {proposal.status === 'passed' && !isExecutionExpired(proposal) && (
                  <button 
                    onClick={() => handleExecuteProposal(proposal.id)}
                    className="flex items-center space-x-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium border border-purple-600/30 transition-all"
                  >
                    <Zap className="w-3 h-3" />
                    <span>Execute</span>
                  </button>
                )}
                
                {(proposal.status === 'draft' || proposal.status === 'active') && (
                  <button 
                    onClick={() => handleCancelProposal(proposal.id)}
                    className="flex items-center space-x-1 bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium border border-orange-600/30 transition-all"
                  >
                    <Pause className="w-3 h-3" />
                    <span>Cancel</span>
                  </button>
                )}

              </div>

              {/* Enhanced Progress Bar */}
              {proposal.totalVotes > 0 && (
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="flex justify-between text-sm text-gray-400 mb-2">
                    <span>Vote Distribution</span>
                    <span>{Math.round((proposal.votesFor / proposal.totalVotes) * 100)}% support</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-3 mb-2 overflow-hidden">
                    <div className="h-full flex">
                      <div 
                        className="bg-green-500 transition-all duration-500"
                        style={{ width: `${(proposal.votesFor / proposal.totalVotes) * 100}%` }}
                      />
                      <div 
                        className="bg-red-500 transition-all duration-500"
                        style={{ width: `${(proposal.votesAgainst / proposal.totalVotes) * 100}%` }}
                      />
                      <div 
                        className="bg-yellow-500 transition-all duration-500"
                        style={{ width: `${(proposal.abstainVotes / proposal.totalVotes) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>For: {Math.round((proposal.votesFor / proposal.totalVotes) * 100)}%</span>
                    <span>Against: {Math.round((proposal.votesAgainst / proposal.totalVotes) * 100)}%</span>
                    <span>Abstain: {Math.round((proposal.abstainVotes / proposal.totalVotes) * 100)}%</span>
                  </div>
                </div>
              )}

              {/* Execution Window Info */}
              {proposal.status === 'passed' && proposal.executionDeadline && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
                  <div className="flex items-center space-x-2 text-sm">
                    <Timer className="w-4 h-4 text-blue-400" />
                    <span className="text-blue-300">
                      Execution window: {proposal.executionWindow} days 
                      (until {new Date(proposal.executionDeadline).toLocaleDateString()})
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {filteredProposals.length === 0 && (
          <div className="professional-card rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-500/20 to-gray-600/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No proposals found</h3>
            <p className="text-gray-400 mb-6">
              {searchTerm || filterStatus !== 'all' || filterCategory !== 'all' 
                ? 'Try adjusting your search or filter criteria' 
                : 'Be the first to create a proposal for this DAO'}
            </p>
            {!showCreateForm && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Proposal</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DAOProposalsEnhanced;