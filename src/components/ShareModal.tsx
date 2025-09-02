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
    <div className="fixed inset-0 bg-[#0f0f11]/80 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-[#0f0f11] rounded-xl sm:rounded-2xl shadow-2xl max-w-lg w-full mx-2 sm:mx-0 border border-white/10 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
          <h2 className="text-lg sm:text-xl font-bold text-white">Share on X</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {/* Clean DAO Preview Card */}
          <div className="mb-4 sm:mb-6 p-4 sm:p-6 bg-gradient-to-br from-white/5 to-white/10 rounded-xl border border-white/20">
            <div className="flex flex-col sm:flex-row items-start space-y-3 sm:space-y-0 sm:space-x-4 mb-4">
              {/* DAO Avatar */}
              <div className="flex-shrink-0 mx-auto sm:mx-0">
                {dao.image ? (
                  <img 
                    src={dao.image} 
                    alt={dao.name}
                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl object-cover shadow-lg"
                  />
                ) : (
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 shadow-lg flex items-center justify-center">
                    <span className="text-white text-lg sm:text-xl font-bold">
                      {dao.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              
              {/* DAO Info */}
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2 truncate">{dao.name}</h3>
                <p className="text-gray-300 text-sm leading-relaxed mb-3">
                  {dao.description}
                </p>
                
                {/* Stats */}
                <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-400">
                  <div className="flex items-center space-x-1">
                    <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>{dao.members} members</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>{dao.proposals} proposals</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>{dao.established}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Chain Badge */}
            <div className="flex justify-center sm:justify-end">
              <span className="px-2 sm:px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs rounded-full border border-indigo-400/30">
                {dao.chain}
              </span>
            </div>
          </div>

          {/* Share Button */}
          <button
            onClick={handleShareToX}
            className="w-full flex items-center justify-center space-x-3 p-3 sm:p-4 bg-black hover:bg-gray-900 text-white rounded-xl font-medium transition-all border border-white/20 hover:border-white/30 text-sm sm:text-base"
          >
            <FaXTwitter className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Share on X</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;