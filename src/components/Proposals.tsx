import React, { useState } from 'react';
import { Plus, ThumbsUp, ThumbsDown, Clock, Users } from 'lucide-react';

const Proposals: React.FC = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProposal, setNewProposal] = useState({
    title: '',
    description: '',
    category: 'general',
    startTime: '',
    endTime: ''
  });

  const proposals = [
    {
      id: 1,
      title: 'Increase Marketing Budget by 25%',
      description: 'Proposal to allocate additional funds for marketing initiatives to drive user acquisition and brand awareness.',
      author: '0x1234...5678',
      status: 'Active',
      votesFor: 145,
      votesAgainst: 23,
      totalVotes: 168,
      timeLeft: '3 days, 14 hours',
      category: 'Treasury',
      created: '2024-01-15'
    },
    {
      id: 2,
      title: 'Add wBTC to Treasury Holdings',
      description: 'Diversify treasury holdings by adding wrapped Bitcoin to our asset portfolio.',
      author: '0x9876...4321',
      status: 'Passed',
      votesFor: 234,
      votesAgainst: 45,
      totalVotes: 279,
      timeLeft: 'Ended',
      category: 'Treasury',
      created: '2024-01-12'
    },
    {
      id: 3,
      title: 'Update Governance Parameters',
      description: 'Adjust voting thresholds and proposal requirements to improve governance efficiency.',
      author: '0x5555...9999',
      status: 'Active',
      votesFor: 89,
      votesAgainst: 12,
      totalVotes: 101,
      timeLeft: '5 days, 8 hours',
      category: 'Governance',
      created: '2024-01-10'
    }
  ];

  const handleCreateProposal = () => {
    // Here you would typically submit to backend
    console.log('Creating proposal:', newProposal);
    setShowCreateForm(false);
    setNewProposal({ title: '', description: '', category: 'general', startTime: '', endTime: '' });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Proposals</h2>
        <div style={{
          background: '#1e1e20',
          borderRadius: '13px',
          padding: '2px',
          display: 'inline-block',
        }}>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center space-x-2 px-4 py-2 text-white"
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
            <span>Create Proposal</span>
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="professional-card rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Create New Proposal</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
              <input
                type="text"
                value={newProposal.title}
                onChange={(e) => setNewProposal({...newProposal, title: e.target.value})}
                className="professional-input w-full px-4 py-3 rounded-xl"
                placeholder="Enter proposal title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
              <select
                value={newProposal.category}
                onChange={(e) => setNewProposal({...newProposal, category: e.target.value})}
                className="professional-input w-full px-4 py-3 rounded-xl"
              >
                <option value="general">General</option>
                <option value="treasury">Treasury</option>
                <option value="governance">Governance</option>
                <option value="technical">Technical</option>
              </select>
            </div>
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
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
              <textarea
                value={newProposal.description}
                onChange={(e) => setNewProposal({...newProposal, description: e.target.value})}
                rows={4}
                className="professional-input w-full px-4 py-3 rounded-xl"
                placeholder="Describe your proposal in detail"
              />
            </div>
            <div className="flex space-x-3">
              <div style={{
                background: '#1e1e20',
                borderRadius: '13px',
                padding: '2px',
                display: 'inline-block',
              }}>
                <button
                  onClick={handleCreateProposal}
                  className="px-4 py-2 text-white"
                  style={{
                    background: '#121212',
                    borderRadius: '13px',
                    border: 'none',
                    color: 'inherit',
                    width: '100%',
                    height: '100%',
                  }}
                >
                  Submit Proposal
                </button>
              </div>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-medium transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {proposals.map((proposal) => (
          <div key={proposal.id} className="professional-card rounded-xl p-6 hover:bg-white/5 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold text-white">{proposal.title}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    proposal.status === 'Active' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                    proposal.status === 'Passed' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                    'bg-gray-500/20 text-gray-300 border-gray-500/30'
                  }`}>
                    {proposal.status}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-gray-300 border border-white/20">
                    {proposal.category}
                  </span>
                </div>
                <p className="text-gray-300 mb-3">{proposal.description}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-400">
                  <span>By {proposal.author}</span>
                  <span>Created {proposal.created}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-2 text-sm text-gray-400 mb-2">
                  <Clock className="w-4 h-4" />
                  <span>{proposal.timeLeft}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <ThumbsUp className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium text-green-400">{proposal.votesFor}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ThumbsDown className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-medium text-red-400">{proposal.votesAgainst}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-400">{proposal.totalVotes} total</span>
                </div>
              </div>
              
              {proposal.status === 'Active' && (
                <div className="flex space-x-2">
                  <button className="flex items-center space-x-1 bg-green-600/20 hover:bg-green-600/30 text-green-300 px-3 py-2 rounded-xl text-sm font-medium border border-green-600/30 transition-all">
                    <ThumbsUp className="w-3 h-3" />
                    <span>Vote For</span>
                  </button>
                  <button className="flex items-center space-x-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 px-3 py-2 rounded-xl text-sm font-medium border border-red-600/30 transition-all">
                    <ThumbsDown className="w-3 h-3" />
                    <span>Vote Against</span>
                  </button>
                  <button className="flex items-center space-x-1 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 px-3 py-2 rounded-xl text-sm font-medium border border-yellow-600/30 transition-all">
                    <span>Abstain</span>
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4 bg-white/5 rounded-xl p-3">
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>Voting Progress</span>
                <span>{Math.round((proposal.votesFor / proposal.totalVotes) * 100)}% approval</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(proposal.votesFor / proposal.totalVotes) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Proposals;