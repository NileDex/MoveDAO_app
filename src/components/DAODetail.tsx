import React, { useState, useEffect } from 'react';
import { ArrowLeft, Home, FileText, Wallet, Users, Zap, Coins, Shield, Menu, X } from 'lucide-react';
import { FaShare } from 'react-icons/fa';
import { DAO } from '../types/dao';
import DAOHome from './dao/DAOHome';
import DAOProposals from './dao/DAOProposals';
import DAOTreasury from './dao/DAOTreasury';
import DAOMembers from './dao/DAOMembers';
import DAOStaking from './dao/DAOStaking';
import DAOAdmin from './dao/DAOAdmin';
import ShareModal from './ShareModal';
import { updateMetaTags, generateDAOMetaTags, resetToDefaultMetaTags } from '../utils/metaTags';

interface DAODetailProps {
  dao: DAO;
  onBack: () => void;
}

const DAODetail: React.FC<DAODetailProps> = ({ dao, onBack }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [bgLoaded, setBgLoaded] = useState(false);
  const [bgError, setBgError] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Preload background and avatar to avoid flicker
  useEffect(() => {
    if (dao.background) {
      setBgLoaded(false);
      setBgError(false);
      const img = new Image();
      (img as any).decoding = 'async';
      img.onload = () => setBgLoaded(true);
      img.onerror = () => setBgError(true);
      img.src = dao.background;
    } else {
      setBgError(true);
    }
  }, [dao.background]);

  useEffect(() => {
    if (dao.image) {
      setAvatarLoaded(false);
      setAvatarError(false);
      const img = new Image();
      (img as any).decoding = 'async';
      img.onload = () => setAvatarLoaded(true);
      img.onerror = () => setAvatarError(true);
      img.src = dao.image;
    } else {
      setAvatarError(true);
    }
  }, [dao.image]);
  const [showShareModal, setShowShareModal] = useState(false);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isMobileMenuOpen]);

  // Update meta tags when DAO changes
  useEffect(() => {
    const metaConfig = generateDAOMetaTags(dao);
    updateMetaTags(metaConfig);

    // Cleanup: reset to default meta tags when component unmounts
    return () => {
      resetToDefaultMetaTags();
    };
  }, [dao]);

  const tabs = [
    { id: 'home', label: 'Overview', icon: Home, color: 'text-blue-400' },
    { id: 'proposals', label: 'Proposals', icon: FileText, color: 'text-green-400' },
    { id: 'staking', label: 'Staking', icon: Coins, color: 'text-orange-400' },
    { id: 'treasury', label: 'Treasury', icon: Wallet, color: 'text-yellow-400' },
    { id: 'members', label: 'Members', icon: Users, color: 'text-pink-400' },
    { id: 'admin', label: 'Admin', icon: Shield, color: 'text-purple-400' },
    { id: 'apps', label: 'Apps', icon: Zap, color: 'text-cyan-400' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <DAOHome dao={dao} />;
      case 'proposals':
        return <DAOProposals dao={dao} />;
      case 'staking':
        return <DAOStaking dao={dao} />;
      case 'treasury':
        return <DAOTreasury dao={dao} />;
      case 'members':
        return <DAOMembers dao={dao} />;
      case 'admin':
        return <DAOAdmin dao={dao} />;
      case 'apps':
        return (
          <div className="container mx-auto px-2 sm:px-6 max-w-screen-lg space-y-6">
            <div className="professional-card rounded-xl p-12 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Apps & Integrations</h3>
              <p className="text-gray-400">Connect third-party apps and services to enhance your DAO</p>
            </div>
          </div>
        );
      default:
        return (
          <div className="container mx-auto px-2 sm:px-6 max-w-screen-lg space-y-6">
            <div className="professional-card rounded-xl p-12 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Coming Soon</h3>
              <p className="text-gray-400">This feature is under development</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="relative bg-black/30 border-b border-white/10 overflow-hidden">
        {/* Desktop Background - Full coverage */}
        <div className="hidden sm:block">
          {dao.background && !bgError && (
            <div 
              className={`absolute left-0 right-0 top-0 bottom-0 bg-cover bg-center bg-no-repeat pointer-events-none transition-opacity duration-300 ${bgLoaded ? 'opacity-30' : 'opacity-0'}`}
              style={{ backgroundImage: `url(${dao.background})` }}
            />
          )}
          {dao.background && !bgLoaded && !bgError && (
            <div className="absolute left-0 right-0 top-0 bottom-0 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 pointer-events-none" />
          )}
          {(!dao.background || bgError) && (
            <div className="absolute left-0 right-0 top-0 bottom-0 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 pointer-events-none" />
          )}
        </div>

        {/* Mobile Background - Twitter banner style */}
        <div className="sm:hidden">
          {dao.background && !bgError && (
            <div 
              className={`absolute left-0 right-0 top-0 h-32 bg-cover bg-center bg-no-repeat pointer-events-none transition-opacity duration-300 ${bgLoaded ? 'opacity-60' : 'opacity-0'}`}
              style={{ backgroundImage: `url(${dao.background})` }}
            />
          )}
          {dao.background && !bgLoaded && !bgError && (
            <div className="absolute left-0 right-0 top-0 h-32 bg-gradient-to-r from-indigo-600/30 to-purple-600/30 pointer-events-none" />
          )}
          {(!dao.background || bgError) && (
            <div className="absolute left-0 right-0 top-0 h-32 bg-gradient-to-r from-indigo-600/30 to-purple-600/30 pointer-events-none" />
          )}
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-6">
          {/* Breadcrumb */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3 text-sm">
              <button
                onClick={onBack}
                className="p-2 text-white hover:text-gray-300 hover:bg-white/5 rounded-xl transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-white">Dashboard</span>
              <span className="text-white/60">/</span>
              <span className="text-white font-medium">{dao.name}</span>
            </div>
            
            {/* Mobile Share Button */}
            <button 
              onClick={() => setShowShareModal(true)}
              className="sm:hidden p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all"
              title="Share this DAO"
            >
              <FaShare className="w-4 h-4" />
            </button>
          </div>

          {/* DAO Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 w-full">
              <div className="relative flex-shrink-0 mx-auto sm:mx-0">
                {dao.image && !avatarLoaded && !avatarError && (
                  <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-gray-600/70 to-gray-700/70 animate-pulse border-2 border-white/20" />
                )}
                {dao.image && (
                  <img 
                    src={dao.image} 
                    alt={dao.name}
                    loading="eager"
                    decoding="async"
                    className={`w-20 h-20 rounded-xl object-cover ${avatarLoaded ? '' : 'hidden'}`}
                    onLoad={() => setAvatarLoaded(true)}
                    onError={() => setAvatarError(true)}
                  />
                )}
                {(!dao.image || avatarError) && (
                  <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center">
                    <span className="text-white text-2xl font-bold">
                      {dao.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                {dao.subname && dao.subname.trim() && (
                  <div className="absolute -bottom-2 -right-2">
                    <span className="px-2 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs rounded-lg font-medium">
                      {dao.subname}
                    </span>
                  </div>
                )}
              </div>
              <div className="text-center sm:text-left w-full sm:max-w-xl">
                <h1 className="text-3xl font-bold text-white mb-2">{dao.name}</h1>
                <p className="text-gray-400 text-lg max-w-xl mx-auto sm:mx-0">{dao.description}</p>
                <div className="flex flex-wrap justify-center sm:justify-start items-center space-x-2 sm:space-x-4 mt-3 text-sm text-gray-400">
                  <span>Established {dao.established}</span>
                  <span>•</span>
                  <span>{dao.members} members</span>
                  <span>•</span>
                  <span>{dao.proposals} proposals</span>
                </div>
              </div>
            </div>
            
            <div className="hidden sm:flex items-center space-x-3">
              <button 
                onClick={() => setShowShareModal(true)}
                className="p-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all"
                title="Share this DAO"
              >
                <FaShare className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          {/* Desktop Navigation - Hidden on Mobile */}
          <nav className="hidden md:flex flex-row space-x-1 mt-8 bg-white/5 rounded-xl p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all justify-center ${
                    isActive
                      ? 'bg-white/10 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? tab.color : ''}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Mobile Menu Button - Visible on Mobile */}
          <div className="md:hidden mt-8">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="w-full bg-white/5 rounded-xl p-4 flex items-center justify-between text-white font-medium hover:bg-white/10 transition-all"
            >
              <div className="flex items-center space-x-2">
                {(() => {
                  const activeTabData = tabs.find(tab => tab.id === activeTab);
                  const Icon = activeTabData?.icon || Home;
                  return (
                    <>
                      <Icon className={`w-4 h-4 ${activeTabData?.color || 'text-blue-400'}`} />
                      <span>{activeTabData?.label || 'Overview'}</span>
                    </>
                  );
                })()}
              </div>
              <Menu className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {renderContent()}
      </div>

      {/* Mobile Navigation Modal - Bottom Sheet */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[9998] md:hidden" style={{ pointerEvents: 'auto' }}>
          {/* Light Overlay - Lower z-index to not interfere with header */}
          <div 
            className="absolute inset-0 bg-black/30"
            style={{ pointerEvents: 'auto' }}
            onClick={(e) => {
              e.stopPropagation();
              setIsMobileMenuOpen(false);
            }}
          />
          
          {/* Bottom Sheet */}
          <div 
            className="absolute bottom-0 left-0 right-0 bg-white/10 backdrop-blur-xl rounded-t-3xl p-4 max-h-[60vh] overflow-y-auto z-[9999]"
            style={{ pointerEvents: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-12 h-1 bg-gray-400/50 rounded-full mx-auto mb-4" />
            
            {/* Navigation Items */}
            <div className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab(tab.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center space-x-3 w-full px-3 py-2.5 rounded-xl font-medium transition-all text-left ${
                      isActive
                        ? 'bg-white/20 text-white shadow-lg'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? tab.color : 'text-gray-400'}`} />
                    <span className="flex-1">{tab.label}</span>
                    {isActive && (
                      <div className="w-2 h-2 bg-blue-400 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      <ShareModal 
        dao={dao}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </div>
  );
};

export default DAODetail;