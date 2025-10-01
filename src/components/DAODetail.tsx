import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowDown, ArrowUp, Home, FileText, Wallet, Users, Zap, Coins, Shield, Menu, X } from 'lucide-react';
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
import { useDAOMembership } from '../hooks/useDAOMembership';
import { useDAOState } from '../contexts/DAOStateContext';
import { useWallet } from '@razorlabs/razorkit';
import { BalanceService } from '../useServices/useBalance';
import { MODULE_ADDRESS } from '../movement_service/constants';
import { aptosClient } from '../movement_service/movement-client';
import { useTreasury } from '../hooks/useTreasury';

interface DAODetailProps {
  dao: DAO;
  onBack: () => void;
  sidebarCollapsed?: boolean;
  onSidebarOpen?: () => void;
  onActiveTabChange?: (tabId: string, activeTab: string) => void;
  activeTab?: string;
}

const DAODetail: React.FC<DAODetailProps> = ({ dao, onBack, sidebarCollapsed = false, onSidebarOpen, onActiveTabChange, activeTab: externalActiveTab }) => {
  const [activeTab, setActiveTab] = useState('home');

  // Sync with external active tab (from sidebar on mobile)
  useEffect(() => {
    if (externalActiveTab) {
      setActiveTab(externalActiveTab);
    }
  }, [externalActiveTab]);
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [bgLoaded, setBgLoaded] = useState(false);
  const [bgError, setBgError] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // Membership for quick stake summary in test panel
  const { membershipData } = useDAOMembership(dao);
  const { refreshDAOData } = useDAOState();
  const tokenSymbol = dao.tokenSymbol || 'LABS';
  const votingPower = membershipData?.votingPower ?? 0;
  const formattedVotingPower = Intl.NumberFormat().format(votingPower);

  // Wallet for quick actions
  const { account, signAndSubmitTransaction } = useWallet();
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [showStakeForm, setShowStakeForm] = useState(false);
  const [showUnstakeForm, setShowUnstakeForm] = useState(false);

  // Treasury data for test panel
  const { treasuryData } = useTreasury(dao.id);
  const [movePrice, setMovePrice] = useState<number | null>(null);
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [stakeError, setStakeError] = useState('');
  const [unstakeError, setUnstakeError] = useState('');

  const handleQuickStake = async () => {
    setStakeError('');
    const raw = parseFloat(stakeAmount);
    if (!Number.isFinite(raw) || raw <= 0) {
      setStakeError('Enter a valid amount');
      return;
    }
    if (!account || !signAndSubmitTransaction) {
      setStakeError('Connect wallet');
      return;
    }
    try {
      setIsStaking(true);
      const balanceCheck = await BalanceService.hasSufficientBalance(account.address, raw, 0.02);
      if (!balanceCheck.sufficient) {
        setStakeError(`Insufficient balance. Available: ${BalanceService.formatBalance(balanceCheck.available)} MOVE`);
        return;
      }
      const amountOctas = BalanceService.moveToOctas(raw);
      const payload = {
        function: `${MODULE_ADDRESS}::staking::stake`,
        typeArguments: [],
        functionArguments: [dao.id, amountOctas],
      } as any;
      const tx = await signAndSubmitTransaction({ payload });
      if (tx && (tx as any).hash) {
        await aptosClient.waitForTransaction({ transactionHash: (tx as any).hash, options: { checkSuccess: true } });
      }
      // refresh global DAO membership state so UI updates immediately
      await refreshDAOData(dao.id);
    } catch (e:any) {
      setStakeError(e?.message || 'Stake failed');
    } finally {
      setIsStaking(false);
    }
  };

  const handleQuickUnstake = async () => {
    setUnstakeError('');
    const raw = parseFloat(unstakeAmount);
    if (!Number.isFinite(raw) || raw <= 0) {
      setUnstakeError('Enter a valid amount');
      return;
    }
    if (!account || !signAndSubmitTransaction) {
      setUnstakeError('Connect wallet');
      return;
    }
    try {
      setIsUnstaking(true);
      const amountOctas = BalanceService.moveToOctas(raw);
      const payload = {
        function: `${MODULE_ADDRESS}::staking::unstake`,
        typeArguments: [],
        functionArguments: [dao.id, amountOctas],
      } as any;
      const tx = await signAndSubmitTransaction({ payload });
      if (tx && (tx as any).hash) {
        await aptosClient.waitForTransaction({ transactionHash: (tx as any).hash, options: { checkSuccess: true } });
      }
      await refreshDAOData(dao.id);
    } catch (e:any) {
      setUnstakeError(e?.message || 'Unstake failed');
    } finally {
      setIsUnstaking(false);
    }
  };

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

  // Fetch MOVE price for treasury display
  useEffect(() => {
    const fetchMovePrice = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=movement&vs_currencies=usd');
        const data = await response.json();
        if (data.movement && data.movement.usd) {
          setMovePrice(data.movement.usd);
        }
      } catch (error) {
        console.warn('Failed to fetch MOVE price from CoinGecko:', error);
        setMovePrice(1); // $1 fallback
      }
    };

    fetchMovePrice();
    // Refresh price every 5 minutes
    const interval = setInterval(fetchMovePrice, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Update time and window size for debug panel
  useEffect(() => {
    const updateWindowSize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    const timeInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);

    // Set initial window size
    updateWindowSize();
    window.addEventListener('resize', updateWindowSize);

    return () => {
      clearInterval(timeInterval);
      window.removeEventListener('resize', updateWindowSize);
    };
  }, []);


  const tabs = [
    { id: 'home', label: 'Overview', icon: Home, color: 'text-blue-400' },
    { id: 'proposals', label: 'Proposals', icon: FileText, color: 'text-green-400' },
    { id: 'staking', label: 'Staking', icon: Coins, color: 'text-orange-400' },
    { id: 'treasury', label: 'Treasury', icon: Wallet, color: 'text-yellow-400' },
    { id: 'members', label: 'Members', icon: Users, color: 'text-pink-400' },
    { id: 'admin', label: 'Admin', icon: Shield, color: 'text-purple-400' },
    { id: 'apps', label: 'Apps', icon: Zap, color: 'text-cyan-400' },
  ];

  // Handle tab change and notify parent
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onActiveTabChange?.(dao.id, tabId);
  };

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
    <div className="min-h-screen w-full max-w-full overflow-x-hidden flex">
      {/* Main Content Area */}
      <div className="flex-1">
        {/* Header */}
        <div className="relative border-b border-white/10 overflow-hidden">
          {/* Twitter Banner Style Background */}
          {dao.background && !bgError && (
            <div 
              className={`absolute left-0 right-0 top-0 h-32 sm:h-40 md:h-48 bg-cover bg-center bg-no-repeat pointer-events-none transition-opacity duration-300 ${bgLoaded ? 'opacity-100' : 'opacity-0'}`}
              style={{ 
                backgroundImage: `url(${dao.background})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            />
          )}
          {dao.background && !bgLoaded && !bgError && (
            <div className="absolute left-0 right-0 top-0 h-32 sm:h-40 md:h-48 bg-gradient-to-r from-indigo-600/30 to-purple-600/30 pointer-events-none" />
          )}
          {(!dao.background || bgError) && (
            <div className="absolute left-0 right-0 top-0 h-32 sm:h-40 md:h-48 bg-gradient-to-r from-indigo-600/30 to-purple-600/30 pointer-events-none" />
          )}
          
          <div className="relative z-10 max-w-7xl 2xl:mx-auto px-6 no-px-override py-6">
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
              <div className="flex flex-col items-start space-y-4 w-full">
                <div className="relative flex-shrink-0 mx-0 mt-4">
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
                <div className="text-left w-full sm:max-w-xl">
                  <h1 className="text-3xl font-bold text-white mb-2">{dao.name}</h1>
                  <p className="text-white text-sm sm:text-base max-w-xl mx-0">{dao.description}</p>
                  <div className="flex flex-wrap justify-start items-center space-x-2 sm:space-x-4 mt-3 text-sm sm:text-base text-gray-400">
                    <span>Established {dao.established}</span>
                    <span>|</span>
                    <span className="text-white">{dao.members} members</span>
                    <span>|</span>
                    <span className="text-white">{dao.proposals} proposals</span>
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
            <nav className={`hidden md:flex flex-row flex-wrap gap-2 mt-8`}>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium justify-center ${
                      isActive
                        ? 'bg-white/10 text-white shadow-lg'
                        : 'text-gray-400'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? tab.color : ''}`} />
                    <span className="text-xs">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl 2xl:mx-auto px-6 py-8">
          {renderContent()}
        </div>
      </div>

      {/* Right Test Panel - From Top */}
      <div
        className={`hidden md:block flex-shrink-0 border-l border-white/10 min-h-screen overflow-auto transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'md:w-64 lg:w-72 xl:w-80 2xl:w-96' : 'md:w-56 lg:w-64 xl:w-72 2xl:w-80'
        }`}
        style={{ willChange: 'width' }}
      >
        <div className="p-4">
          <div className="professional-card rounded-xl p-4 mb-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              Test Panel
            </h3>

            {/* Quick Stake Summary */}
            <div className="mb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">{formattedVotingPower}</span>
                <span className="text-sm text-gray-400">{tokenSymbol}</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-gray-300 text-sm">
                <Zap className="w-4 h-4 text-blue-300" />
                <span>Governance Power</span>
              </div>
            </div>

            {/* Deposit / Withdraw */}
            <div className="grid grid-cols-2 gap-3">
              <button
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-b from-blue-600 to-blue-700 text-white font-medium shadow-inner"
                onClick={() => { setShowStakeForm(true); setShowUnstakeForm(false); }}
              >
                <ArrowDown className="w-4 h-4" />
                Stake
              </button>
              <button
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-gray-300 font-medium border border-white/10 hover:bg-white/10 transition-colors"
                onClick={() => { setShowUnstakeForm(true); setShowStakeForm(false); }}
              >
                <ArrowUp className="w-4 h-4" />
                Unstake
              </button>
            </div>

            {showStakeForm && (
              <div className="mt-3 space-y-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={`Amount (${tokenSymbol})`}
                  value={stakeAmount}
                  onChange={(e)=>setStakeAmount(e.target.value)}
                  className="w-full professional-input px-3 py-2 rounded-lg"
                />
                {stakeError && <div className="text-red-400 text-xs">{stakeError}</div>}
                <button onClick={handleQuickStake} disabled={isStaking} className="w-full px-3 py-2 rounded-lg bg-blue-600 text-white font-medium disabled:opacity-50">
                  {isStaking ? 'Staking…' : 'Confirm Stake'}
                </button>
              </div>
            )}

            {showUnstakeForm && (
              <div className="mt-3 space-y-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={`Amount (${tokenSymbol})`}
                  value={unstakeAmount}
                  onChange={(e)=>setUnstakeAmount(e.target.value)}
                  className="w-full professional-input px-3 py-2 rounded-lg"
                />
                {unstakeError && <div className="text-red-400 text-xs">{unstakeError}</div>}
                <button onClick={handleQuickUnstake} disabled={isUnstaking} className="w-full px-3 py-2 rounded-lg bg-white/10 text-white font-medium border border-white/10 disabled:opacity-50">
                  {isUnstaking ? 'Unstaking…' : 'Confirm Unstake'}
                </button>
              </div>
            )}

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-white/10 text-center text-gray-300 font-medium">
              My Governance
            </div>
          </div>

          {/* Treasury Card */}
          <div className="professional-card rounded-xl p-4 mb-6">
            {/* Treasury Balance */}
            <div className="mb-4">
              <div className="text-3xl font-bold text-white mb-1">
                {movePrice !== null 
                  ? `$${(treasuryData.balance * movePrice).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` 
                  : `$${(treasuryData.balance * 1).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
                }
              </div>
              <div className="text-sm text-gray-400">Treasury Balance</div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2 h-2 rounded-full ${account ? 'bg-green-400' : 'bg-red-400'}`}></span>
                <span className="text-xs text-gray-400">{account ? 'Wallet connected' : 'Wallet not connected'}</span>
              </div>
            </div>

            {/* Top Holdings */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-white mb-3">Holdings</h4>
              <div className="space-y-3">
                {/* MOVE */}
                {treasuryData.balance > 0 ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img 
                        src="https://ipfs.io/ipfs/QmUv8RVdgo6cVQzh7kxerWLatDUt4rCEFoCTkCVLuMAa27" 
                        alt="MOVE"
                        className="w-6 h-6 rounded-full flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.classList.remove('hidden');
                        }}
                      />
                      <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center hidden">
                        <span className="text-white text-xs font-bold">M</span>
                      </div>
                      <div>
                        <div className="text-white text-sm font-medium">MOVE</div>
                        <div className="text-gray-400 text-xs">Move Coin</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white text-sm font-medium">
                        {movePrice !== null 
                          ? `$${(treasuryData.balance * movePrice).toLocaleString(undefined, {maximumFractionDigits: 0})}` 
                          : `$${(treasuryData.balance * 1).toLocaleString(undefined, {maximumFractionDigits: 0})}`
                        }
                      </div>
                      <div className="text-gray-400 text-xs">{treasuryData.balance.toFixed(2)}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No treasury funds yet
                  </div>
                )}
              </div>
            </div>

            {/* View Treasury Button */}
            <button 
              onClick={() => setActiveTab('treasury')}
              className="w-full py-2 px-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-sm font-medium transition-colors"
            >
              View Treasury
            </button>
          </div>

          {/* Suggestions Card */}
          <div className="professional-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-white">Suggestions</h4>
              <button className="text-gray-400 hover:text-white text-xs">View All</button>
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <span>?</span>
              <span>No suggestions...</span>
            </div>
          </div>
        </div>
      </div>


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