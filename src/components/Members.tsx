import React, { useState } from 'react';
import { Users, Crown, Vote, TrendingUp, Search, Filter, Coins, Lock } from 'lucide-react';

const Members: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  const members = [
    {
      id: 1,
      address: '0x1234567890123456789012345678901234567890',
      shortAddress: '0x1234...7890',
      votingPower: 15.2,
      tokensHeld: 152000,
      proposalsCreated: 8,
      votesParticipated: 45,
      joinDate: '2023-01-15',
      role: 'founder',
      isActive: true
    },
    {
      id: 2,
      address: '0x9876543210987654321098765432109876543210',
      shortAddress: '0x9876...3210',
      votingPower: 12.8,
      tokensHeld: 128000,
      proposalsCreated: 5,
      votesParticipated: 42,
      joinDate: '2023-02-03',
      role: 'core',
      isActive: true
    },
    {
      id: 3,
      address: '0x5555555555555555555555555555555555555555',
      shortAddress: '0x5555...5555',
      votingPower: 8.5,
      tokensHeld: 85000,
      proposalsCreated: 3,
      votesParticipated: 38,
      joinDate: '2023-03-20',
      role: 'member',
      isActive: true
    },
    {
      id: 4,
      address: '0x7777777777777777777777777777777777777777',
      shortAddress: '0x7777...7777',
      votingPower: 6.2,
      tokensHeld: 62000,
      proposalsCreated: 2,
      votesParticipated: 28,
      joinDate: '2023-04-10',
      role: 'member',
      isActive: false
    },
    {
      id: 5,
      address: '0x3333333333333333333333333333333333333333',
      shortAddress: '0x3333...3333',
      votingPower: 4.1,
      tokensHeld: 41000,
      proposalsCreated: 1,
      votesParticipated: 22,
      joinDate: '2023-05-15',
      role: 'member',
      isActive: true
    }
  ];

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.shortAddress.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || member.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'founder':
        return <Crown className="w-4 h-4 text-yellow-400" />;
      case 'core':
        return <Users className="w-4 h-4 text-blue-400" />;
      default:
        return <Vote className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'founder':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'core':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="professional-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Members</h2>
          <div className="text-sm text-gray-400">
            Total: {members.length} members
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <Users className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-sm font-medium text-blue-300">Total Members</p>
                <p className="text-2xl font-bold text-white">1,247</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-sm font-medium text-green-300">Active Members</p>
                <p className="text-2xl font-bold text-white">982</p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <Vote className="w-8 h-8 text-purple-400" />
              <div>
                <p className="text-sm font-medium text-purple-300">Avg. Participation</p>
                <p className="text-2xl font-bold text-white">78%</p>
              </div>
            </div>
          </div>
          
          <div className="bg-orange-500/20 border border-orange-500/30 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <Coins className="w-8 h-8 text-orange-400" />
              <div>
                <p className="text-sm font-medium text-orange-300">Total Staked</p>
                <p className="text-2xl font-bold text-white">85.2K</p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <Crown className="w-8 h-8 text-yellow-400" />
              <div>
                <p className="text-sm font-medium text-yellow-300">Core Members</p>
                <p className="text-2xl font-bold text-white">12</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search members by address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="professional-input pl-10 pr-4 py-2 w-full rounded-xl"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="professional-input px-3 py-2 rounded-xl"
            >
              <option value="all">All Roles</option>
              <option value="founder">Founder</option>
              <option value="core">Core</option>
              <option value="member">Member</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 font-medium text-white">Member</th>
                <th className="text-left py-3 px-4 font-medium text-white">Staked</th>
                <th className="text-left py-3 px-4 font-medium text-white">Voting Power</th>
                <th className="text-left py-3 px-4 font-medium text-white">Proposals</th>
                <th className="text-left py-3 px-4 font-medium text-white">Participation</th>
                <th className="text-left py-3 px-4 font-medium text-white">Join Date</th>
                <th className="text-left py-3 px-4 font-medium text-white">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => (
                <tr key={member.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                        {member.shortAddress.slice(2, 4).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-white">{member.shortAddress}</p>
                        <div className="flex items-center space-x-2">
                          {getRoleIcon(member.role)}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRoleBadge(member.role)}`}>
                            {member.role}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      <Lock className="w-4 h-4 text-orange-400" />
                      <span className="text-sm text-white">{member.tokensHeld.toLocaleString()} tokens</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${member.votingPower}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-white">{member.votingPower}%</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-white">{member.proposalsCreated}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-white">{member.votesParticipated}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-gray-400">{member.joinDate}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                      member.isActive ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                    }`}>
                      {member.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Members;