import React, { useState, useRef, useEffect } from 'react';
import { Wallet, X, ChevronDown, ArrowLeft, User, Moon, Sun } from 'lucide-react';
import ReactDOM from 'react-dom';
import { useWallet } from '@razorlabs/razorkit';
import { useAlert } from './alert/AlertContext';
import { useTheme } from '../contexts/ThemeContext';
import { truncateAddress } from '../utils/addressUtils';


  // Reown-inspired wallet modal
const WalletModal = ({
  isOpen,
  onClose,
  onWalletSelected,
  wallets,
  configuredWallets,
}: {
  isOpen: boolean;
  onClose: () => void;
  onWalletSelected: (walletName: string) => void;
  wallets: any[];
  configuredWallets: any[];
}) => {
  const [selectedWallet, setSelectedWallet] = useState<any | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeoutRef, setTimeoutRef] = useState<NodeJS.Timeout | null>(null);
  const { showAlert } = useAlert();
  const walletContext = useWallet();
  const { connected, account } = walletContext;
  const { theme } = useTheme();
  const isDarkTheme = theme === 'dark';

  // Monitor wallet connection state changes
  useEffect(() => {
    if (isConnecting && connected && account && selectedWallet) {
      console.log('Wallet connected successfully');
      
      if (timeoutRef) {
        clearTimeout(timeoutRef);
        setTimeoutRef(null);
      }
      
      setIsConnecting(false);
      showAlert('Wallet connected', 'success');
      onClose();
    }
  }, [connected, account, isConnecting, selectedWallet, showAlert, onClose, timeoutRef]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef) clearTimeout(timeoutRef);
    };
  }, [timeoutRef]);

  if (!isOpen) return null;
  
  const allWallets = [...configuredWallets, ...wallets];
  const availableWallets = allWallets.filter((wallet, index, self) =>
    index === self.findIndex((w) => w.name === wallet.name)
  );

  // Handle wallet selection and connection
  const handleWalletSelected = async (wallet: any) => {
    setSelectedWallet(wallet);
    setIsConnecting(true);
    setError(null);
    
    try {
      console.log('Starting wallet connection for:', wallet.name);
      await onWalletSelected(wallet.name);
      console.log('onWalletSelected completed');
      
      const timeoutId = setTimeout(() => {
        if (isConnecting && !(walletContext.connected && walletContext.account)) {
          console.log('Connection timeout');
          setIsConnecting(false);
          setError('Connection timeout - please try again');
        }
      }, 15000);
      
      setTimeoutRef(timeoutId);
      
    } catch (e: any) {
      console.error('Wallet connection error:', e);
      
      if (timeoutRef) {
        clearTimeout(timeoutRef);
        setTimeoutRef(null);
      }
      
      if (e?.code === 'WALLET__CONNECT_ERROR__USER_REJECTED' || e?.message?.includes('User rejected')) {
        setIsConnecting(false);
        setError(null);
      } else {
        showAlert('Connection failed: ' + (e?.message || 'Unknown error'), 'error');
        setError('Connection failed');
        setIsConnecting(false);
      }
    }
  };

  // Handle wallet install redirect
  const handleWalletInstall = (wallet: any) => {
    showAlert('Wallet not installed. Please install and try again.', 'error');
    if (wallet.name === 'Razor') {
      window.open('https://chromewebstore.google.com/detail/razor-wallet/fdcnegogpncmfejlfnffnofpngdiejii', '_blank');
    } else if (wallet.downloadUrl?.browserExtension) {
      window.open(wallet.downloadUrl.browserExtension, '_blank');
    } else {
      window.open(`https://www.google.com/search?q=${wallet.name}+wallet+install`, '_blank');
    }
  };

  // Reset modal state when closed
  const handleClose = () => {
    if (timeoutRef) {
      clearTimeout(timeoutRef);
      setTimeoutRef(null);
    }
    setSelectedWallet(null);
    setIsConnecting(false);
    setError(null);
    onClose();
  };

  // If wallet is selected, show connection view
  if (selectedWallet) {
    const isWalletReady = selectedWallet.installed !== false && (selectedWallet.installed || selectedWallet.name === 'Razor');
    
    return (
      <div className="modal-overlay" style={{
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100vw', 
        height: '100vh', 
        background: isDarkTheme ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)', 
        zIndex: 1000, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center'
      }}>
        <div className="modal-container" style={{
          background: isDarkTheme ? '#0f0f11' : '#ffffff',
          color: isDarkTheme ? '#f5f5f5' : '#111827', 
          borderRadius: 20, 
          minWidth: 360, 
          maxWidth: 400, 
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)', 
          padding: '24px 20px', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          border: isDarkTheme ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)'
        }}>
          {/* Back button (top left) */}
          <button 
            onClick={() => {
              if (timeoutRef) {
                clearTimeout(timeoutRef);
                setTimeoutRef(null);
              }
              setSelectedWallet(null);
              setIsConnecting(false);
              setError(null);
            }}
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text)',
              opacity: 0.7,
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
          >
            <ArrowLeft size={20} />
          </button>

          {/* Close button (top right) */}
          <button 
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text)',
              opacity: 0.7,
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
          >
            <X size={20} />
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, width: '100%' }}>
            {/* Wallet Icon with Orbiting Loader */}
            <div className="wallet-icon-container">
              {selectedWallet.iconUrl ? (
                <img 
                  src={selectedWallet.iconUrl} 
                  alt={selectedWallet.name} 
                  width={64} 
                  height={64} 
                  className={isConnecting ? 'wallet-icon-pulse' : ''}
                  style={{
                    borderRadius: 16,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                    position: 'relative',
                    zIndex: 2
                  }} 
                />
              ) : (
                <div 
                  className={isConnecting ? 'wallet-icon-pulse' : ''}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 16,
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 32,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                    position: 'relative',
                    zIndex: 2
                  }}>
                  {selectedWallet.name === 'Razor' ? '⚡' : '🔮'}
                </div>
              )}
              
              {/* Square Path Loader Animation */}
              {isConnecting && (
                <div className="square-loader">
                  <svg viewBox="0 0 100 100">
                    <rect x="10" y="10" width="80" height="80" rx="18" ry="18" className="square-progress" pathLength="100"/>
                  </svg>
                </div>
              )}
            </div>

            {/* Wallet Name */}
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ 
                fontSize: 24, 
                fontWeight: 600, 
                color: 'var(--text)', 
                margin: '0 0 8px 0',
                letterSpacing: '-0.02em'
              }}>
                {selectedWallet.name}
              </h3>
              <p style={{ 
                fontSize: 16, 
                color: 'var(--text-dim)', 
                margin: 0,
                lineHeight: 1.4
              }}>
                {isConnecting ? 'Connecting to your wallet...' : 
                 isWalletReady ? 'Ready to connect' : 'Installation required'}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 12,
                padding: 16,
                color: '#f87171',
                fontSize: 14,
                textAlign: 'center',
                width: '100%'
              }}>
                {error}
              </div>
            )}

            {/* Action Button */}
            {!isConnecting && (
              <button
                onClick={() => isWalletReady ? handleWalletSelected(selectedWallet) : handleWalletInstall(selectedWallet)}
                style={{
                  background: isWalletReady 
                    ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                    : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  border: 'none',
                  color: 'var(--text)',
                  padding: '14px 32px',
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  width: '100%',
                  maxWidth: 200
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(99, 102, 241, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {isWalletReady ? 'Connect Wallet' : 'Install Wallet'}
              </button>
            )}

          </div>
      </div>
    </div>
  );
  }

  // Default wallet selection view
  return (
    <div className="modal-overlay" style={{
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100vw', 
      height: '100vh', 
      background: isDarkTheme ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)', 
      zIndex: 1000, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center'
    }}>
              <div className="modal-container" style={{
          background: isDarkTheme ? '#0f0f11' : '#ffffff',
          color: isDarkTheme ? '#f5f5f5' : '#111827', 
          borderRadius: 20, 
          minWidth: 360, 
          maxWidth: 420, 
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)', 
          padding: '24px 20px', 
          display: 'flex', 
          flexDirection: 'column',
          border: isDarkTheme ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)'
        }}>
        <div className="modal-header" style={{
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          width: '100%', 
          marginBottom: 24
        }}>
          <h3 style={{
            fontSize: 24, 
            fontWeight: 600, 
            color: 'var(--text)',
            margin: 0,
            letterSpacing: '-0.02em'
          }}>
            Connect Wallet
          </h3>
          <button 
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text)',
              opacity: 0.7,
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-content" style={{ width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="wallet-list" style={{ flex: 1 }}>
            <div className="wallet-items" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {availableWallets?.map((wallet) => {
                const isWalletReady = wallet.installed !== false && (wallet.installed || wallet.name === 'Razor');
                return (
                  <div
                    key={wallet.name}
                    className="wallet-item"
                    style={{
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      padding: '12px 16px', 
                      borderRadius: 12, 
                      border: isDarkTheme ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)', 
                      cursor: 'pointer', 
                      background: isDarkTheme ? '#161618' : '#f8fafc',
                      transition: 'all 0.2s ease',
                      boxShadow: isDarkTheme ? '0 2px 8px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.08)'
                    }}
                    onClick={() => {
                      if (isWalletReady) {
                        handleWalletSelected(wallet);
                      } else {
                        handleWalletInstall(wallet);
                      }
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = isDarkTheme ? '#1e1e22' : '#eef2f7';
                      e.currentTarget.style.borderColor = isDarkTheme ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isDarkTheme ? '#161618' : '#f8fafc';
                      e.currentTarget.style.borderColor = isDarkTheme ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0,0,0,0.08)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {wallet.iconUrl ? (
                        <img 
                          src={wallet.iconUrl} 
                          alt={wallet.name} 
                          width={32} 
                          height={32} 
                          style={{
                            borderRadius: 8
                          }} 
                        />
                      ) : (
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 16
                        }}>
                          {wallet.name === 'Razor' ? '⚡' : '🔮'}
                        </div>
                      )}
                      <div>
                        <span style={{ 
                          fontWeight: 600, 
                          color: 'var(--text)',
                          fontSize: 16,
                          display: 'block'
                        }}>
                          {wallet.name}
                        </span>
                        <span style={{
                          fontSize: 14,
                          color: 'var(--text-dim)',
                          display: 'block'
                        }}>
                          {isWalletReady ? 'Ready to connect' : 'Installation required'}
                        </span>
                      </div>
                    </div>
                    <div style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      background: isWalletReady 
                        ? 'transparent'
                        : '#f59e0b',
                      color: 'var(--text)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {isWalletReady ? 'Connect' : 'Install'}
                    </div>
                  </div>
                );
              })}
            </div>
            {availableWallets.length === 0 && (
              <div className="no-wallets-message" style={{
                marginTop: 24, 
                color: isDarkTheme ? '#9ca3af' : '#6b7280',
                textAlign: 'center',
                padding: 24,
                background: isDarkTheme ? '#161618' : '#f8fafc',
                borderRadius: 16,
                border: isDarkTheme ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)'
              }}>
                <p style={{ margin: 0, fontSize: 16 }}>No wallets detected. Please install a supported wallet extension.</p>
              </div>
            )}
          </div>
          
          {/* Simple Footer */}
          <div style={{
            marginTop: 24,
            paddingTop: 16,
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            textAlign: 'center',
            flexShrink: 0
          }}>
            <p style={{
              fontSize: 12,
              color: '#808080',
              margin: 0,
              lineHeight: 1.4
            }}>
              Powered by Movement Network
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Button for header, opens modal, shows wallet status
interface WalletConnectButtonProps {
  onProfileClick?: () => void;
}

const WalletConnectButton: React.FC<WalletConnectButtonProps> = ({ onProfileClick }) => {
  const { select, disconnect, configuredWallets, detectedWallets, account, name, connected } = useWallet();
  const [showModal, setShowModal] = useState(false);
  // Used to force WalletModal to reset steps on open
  const [modalKey, setModalKey] = useState(0);
  const { showAlert } = useAlert();

  // Button style with theme variables
  const { theme, cycleTheme } = useTheme();
  const isDarkTheme = theme === 'dark';
  const buttonStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 16px',
    border: 'none',
    background: isDarkTheme ? '#252527' : '#f3f4f6',
    borderRadius: '12px',
    height: 'auto',
    minWidth: 120,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 14,
    color: 'var(--text)',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
  };
  // Get icon for connected wallet
  const getWalletIcon = () => {
    const allWallets = [...configuredWallets, ...detectedWallets];
    const wallet = allWallets.find((w) => w.name === name);
    if (wallet && wallet.iconUrl) {
      return <img src={wallet.iconUrl} alt={wallet.name} width={18} height={18} style={{borderRadius:4, background:'none'}} />;
    }
    // fallback icon
    return <span style={{fontSize:16}}>{name === 'Razor' ? '⚡' : '🔮'}</span>;
  };
  // Handle wallet connect
  const handleConnect = async (walletName: string) => {
    try {
      console.log('Attempting to connect to wallet:', walletName);
      
      // If there's a stale connection state, disconnect first
      if (connected && !account) {
        console.log('Detected stale connection, disconnecting first');
        await disconnect();
        // Wait a bit for disconnect to complete
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      await select(walletName);
      console.log('Wallet select completed');
      // Don't show alert here - let the modal handle it
      // Only throw if there's an actual error
    } catch (e) {
      console.error('Wallet selection error:', e);
      // Re-throw the error so modal can handle it properly
      throw e;
    }
  };
  // Handle wallet disconnect
  const handleDisconnect = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await disconnect();
      setModalKey((k) => k + 1); // Reset modal for next open
      // Alert: Wallet disconnected
      showAlert('Wallet disconnected', 'info');
    } catch (e) {
      // Alert: Network error on disconnect
      showAlert('Network error on disconnect', 'error');
    }
  };
  // Open modal and reset step
  const handleOpenModal = () => {
    setModalKey((k) => k + 1);
    setShowModal(true);
  };
  
  // Handle button click - open modal when not connected, toggle dropdown when connected
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const handleButtonClick = () => {
    if (!connected || !account) {
      handleOpenModal();
    } else {
      setShowDropdown(!showDropdown);
    }
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  // Use utility function for address truncation

  // Hover state for dropdown items to simulate hover styles in inline CSS
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Render button and modal
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {/* Theme toggle button in front of Connect */}
      <button
        aria-label="Toggle theme"
        title={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
        className="theme-toggle-btn"
        onClick={cycleTheme}
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <button
        className="header-wallet-btn"
        style={{
          ...buttonStyle,
        }}
        onClick={handleButtonClick}
        tabIndex={0}
      >
        {connected && account ? (
          <>
            {getWalletIcon()}
            <span style={{
              fontFamily: 'monospace',
              fontSize: 13,
              color: 'var(--text)',
              fontWeight: 600,
              letterSpacing: 1,
              minWidth: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>{truncateAddress(account.address)}</span>
            <ChevronDown 
              size={16} 
              style={{
                marginLeft: 4,
                color: 'var(--text)',
                transition: 'transform 0.2s',
                transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)'
              }}
            />
          </>
        ) : (
          <>
            <Wallet className="w-4 h-4" />
            <span>Connect</span>
          </>
        )}
      </button>
      {typeof window !== 'undefined' && ReactDOM.createPortal(
        <WalletModal
          key={modalKey}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onWalletSelected={handleConnect}
          wallets={detectedWallets}
          configuredWallets={configuredWallets}
        />, document.body)}
        
        {/* Dropdown Menu */}
        {connected && account && showDropdown && (
          <div 
            ref={dropdownRef}
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 4,
              background: isDarkTheme ? '#252527' : '#ffffff',
              border: isDarkTheme ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.08)',
              borderRadius: 12,
              padding: 8,
              minWidth: 160,
              boxShadow: isDarkTheme ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.08)',
              zIndex: 1001
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onProfileClick) {
                  onProfileClick();
                }
                setShowDropdown(false);
              }}
              onMouseEnter={() => setHoveredItem('profile')}
              onMouseLeave={() => setHoveredItem(null)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: hoveredItem === 'profile' ? (isDarkTheme ? '#2f3033' : '#f3f4f6') : (isDarkTheme ? '#252527' : '#ffffff'),
                border: 'none',
                color: isDarkTheme ? '#f5f5f5' : '#111827',
                fontSize: 14,
                cursor: 'pointer',
                borderRadius: 12,
                transition: 'background 0.2s',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <User size={16} />
              Profile
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDisconnect(e);
                setShowDropdown(false);
              }}
              onMouseEnter={() => setHoveredItem('disconnect')}
              onMouseLeave={() => setHoveredItem(null)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: hoveredItem === 'disconnect' ? (isDarkTheme ? '#2f3033' : '#f3f4f6') : (isDarkTheme ? '#252527' : '#ffffff'),
                border: 'none',
                color: isDarkTheme ? '#f5f5f5' : '#111827',
                fontSize: 14,
                cursor: 'pointer',
                borderRadius: 12,
                transition: 'background 0.2s',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <X size={16} />
              Disconnect
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletConnectButton;