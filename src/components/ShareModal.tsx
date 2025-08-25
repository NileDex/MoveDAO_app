import React from 'react';
import { X, FileText, Users, Calendar } from 'lucide-react';
import { FaXTwitter } from 'react-icons/fa6';
import { DAO } from '../types/dao';

interface ShareModalProps {
  dao: DAO;
  isOpen: boolean;
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ dao, isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleShareToX = () => {
    const text = `Check out ${dao.name} DAO on Movement Network! 🚀\n\n${dao.description}\n\n${dao.members} members • ${dao.proposals} proposals\n\n#MovementNetwork #DAO #Web3`;
    const url = window.location.href;
    const xUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(xUrl, '_blank', 'width=550,height=420');
  };

  return (
    <div className="fixed inset-0 bg-[#0f0f11]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f0f11] rounded-2xl shadow-2xl max-w-lg w-full border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Share on X</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Clean DAO Preview Card */}
          <div className="mb-6 p-6 bg-gradient-to-br from-white/5 to-white/10 rounded-xl border border-white/20">
            <div className="flex items-start space-x-4 mb-4">
              {/* DAO Avatar */}
              <div className="flex-shrink-0">
                {dao.image ? (
                  <img 
                    src={dao.image} 
                    alt={dao.name}
                    className="w-16 h-16 rounded-xl object-cover shadow-lg"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 shadow-lg flex items-center justify-center">
                    <span className="text-white text-xl font-bold">
                      {dao.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              
              {/* DAO Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-white mb-2 truncate">{dao.name}</h3>
                <p className="text-gray-300 text-sm line-clamp-2 leading-relaxed mb-3">
                  {dao.description}
                </p>
                
                {/* Stats */}
                <div className="flex items-center space-x-4 text-sm text-gray-400">
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{dao.members} members</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <FileText className="w-4 h-4" />
                    <span>{dao.proposals} proposals</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>{dao.established}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Chain Badge */}
            <div className="flex justify-end">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs rounded-full border border-indigo-400/30">
                {dao.chain}
              </span>
            </div>
          </div>

          {/* Share Button */}
          <button
            onClick={handleShareToX}
            className="w-full flex items-center justify-center space-x-3 p-4 bg-black hover:bg-gray-900 text-white rounded-xl font-medium transition-all border border-white/20 hover:border-white/30"
          >
            <FaXTwitter className="w-5 h-5" />
            <span>Share on X</span>
          </button>

          {/* Preview Text */}
          <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
            <p className="text-xs text-gray-400 mb-2">Post preview:</p>
            <p className="text-sm text-gray-300 leading-relaxed">
              Check out {dao.name} DAO on Movement Network! 🚀<br/><br/>
              {dao.description}<br/><br/>
              {dao.members} members • {dao.proposals} proposals<br/><br/>
              #MovementNetwork #DAO #Web3
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;