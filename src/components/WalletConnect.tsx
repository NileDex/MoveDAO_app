import React, { useState } from 'react';
import { Wallet } from 'lucide-react';
import ReactDOM from 'react-dom';
import { useWallet } from '@razorlabs/razorkit';
import { FaCheckCircle } from 'react-icons/fa';
import { useAlert } from './alert/AlertContext';

// Multi-step modal for wallet connect and signing
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
  // Step state: only 'select' (choose wallet)
  const [step, setStep] = useState<'select'>('select');
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wallet = useWallet();
  const { showAlert } = useAlert();

  if (!isOpen) return null;
  const allWallets = [...configuredWallets, ...wallets];
  const availableWallets = allWallets.filter((wallet, index, self) =>
    index === self.findIndex((w) => w.name === wallet.name)
  );

  // Handle wallet selection and close modal after connection
  const handleWalletSelected = async (walletName: string) => {
    setSelectedWallet(walletName);
    try {
      await onWalletSelected(walletName);
      // Alert: Wallet connected
      showAlert('Wallet connected', 'success');
      onClose();
    } catch (e) {
      // Alert: Wallet connection failed
      showAlert('Wallet connection failed', 'error');
      setError('Wallet connection failed');
    }
  };


  // Progress indicator for modal steps
  const Progress = () => (
    <div style={{ display: 'flex', gap: 16, marginBottom: 24, justifyContent: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          width: 22, height: 22, borderRadius: '50%', background: '#a21caf', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16
        }}>
          1
        </span>
        <span style={{ color: '#fff', fontWeight: 500 }}>Select Wallet</span>
      </div>
    </div>
  );

  // Modal UI
  return (
    <div className="modal-overlay" style={{position: 'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,0.6)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div className="modal-container" style={{background:'#18181b', color:'#fff', borderRadius:16, minWidth:320, maxWidth:400, boxShadow:'0 4px 24px rgba(0,0,0,0.32)', padding:28, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center'}}>
        <div className="modal-header" style={{display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%', marginBottom:18}}>
          <h3 style={{fontSize:20, fontWeight:600, color:'#fff'}}>Connect Wallet</h3>
          <button className="modal-close-btn" onClick={onClose} style={{fontSize:28, background:'none', border:'none', cursor:'pointer', color:'#fff'}}>&times;</button>
        </div>
        <Progress />
        <div className="modal-content" style={{width:'100%'}}>
          <div className="wallet-list">
            <h4 style={{fontSize:16, fontWeight:500, marginBottom:10, color:'#fff'}}>Select Wallet</h4>
            <div className="wallet-items" style={{display:'flex', flexDirection:'column', gap:14}}>
              {availableWallets?.map((wallet) => {
                const isWalletReady = wallet.installed !== false && (wallet.installed || wallet.name === 'Razor');
                return (
                  <div
                    key={wallet.name}
                    className="wallet-item"
                    style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:14, borderRadius:10, border:'1px solid #23272f', cursor:'pointer', background:'#23272f'}}
                    onClick={() => {
                      if (isWalletReady) {
                        handleWalletSelected(wallet.name);
                      } else {
                        // Alert: Wallet not installed
                        showAlert('Wallet not installed. Please install and try again.', 'error');
                        if (wallet.name === 'Razor') {
                          window.open('https://chromewebstore.google.com/detail/razor-wallet/fdcnegogpncmfejlfnffnofpngdiejii', '_blank');
                        } else if (wallet.downloadUrl?.browserExtension) {
                          window.open(wallet.downloadUrl.browserExtension, '_blank');
                        } else {
                          window.open(`https://www.google.com/search?q=${wallet.name}+wallet+install`, '_blank');
                        }
                      }
                    }}
                  >
                    <div style={{display:'flex', alignItems:'center', gap:10}}>
                      {wallet.iconUrl ? (
                        <img src={wallet.iconUrl} alt={wallet.name} width={32} height={32} style={{borderRadius:6, background:'#fff'}} />
                      ) : (
                        <span style={{fontSize:24}}>{wallet.name === 'Razor' ? '⚡' : '🔮'}</span>
                      )}
                      <span style={{fontWeight:500, color:'#fff'}}>{wallet.name}</span>
                    </div>
                    <div>
                      {isWalletReady ? (
                        <span style={{color:'#16a34a', fontWeight:500}}>Connect</span>
                      ) : (
                        <span style={{color:'#eab308', fontWeight:500}}>Install</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {availableWallets.length === 0 && (
              <div className="no-wallets-message" style={{marginTop:18, color:'#bbb'}}>
                <p>No wallets detected. Please install a supported wallet extension.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Button for header, opens modal, shows wallet status
const WalletConnectButton = () => {
  const { select, disconnect, configuredWallets, detectedWallets, account, name, connected } = useWallet();
  const [showModal, setShowModal] = useState(false);
  // Used to force WalletModal to reset steps on open
  const [modalKey, setModalKey] = useState(0);
  const { showAlert } = useAlert();

  // Button style with gradient border
  const buttonStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '2px',
    border: 'none',
    background: 'linear-gradient(45deg, #ffc30d, #b80af7)',
    borderRadius: '16px',
    height: 36,
    minWidth: 0,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 14,
    color: '#fff',
    overflow: 'hidden',
    maxWidth: 180,
  };
  // Inner content style
  const innerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: '#121212',
    borderRadius: '14px',
    padding: '0 10px',
    height: 32,
    minWidth: 0,
    overflow: 'hidden',
    width: '100%',
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
      await select(walletName);
      // Alert: Wallet connected (handled in modal)
    } catch (e) {
      // Alert: Wallet connection error
      showAlert('Wallet connection error', 'error');
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
  // Truncate address for display
  const truncateAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

  // Render button and modal
  return (
    <>
      <button
        className="header-wallet-btn"
        style={buttonStyle}
        onClick={connected ? undefined : handleOpenModal}
        tabIndex={0}
      >
        <div style={innerStyle}>
          {connected && account ? (
            <>
              {getWalletIcon()}
              <span style={{
                fontFamily: 'monospace',
                fontSize: 13,
                color: '#fff',
                background: 'none',
                borderRadius: 6,
                padding: '1px 6px',
                fontWeight: 600,
                letterSpacing: 1,
                minWidth: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>{truncateAddress(account.address)}</span>
              <span
                onClick={handleDisconnect}
                style={{
                  marginLeft: 4,
                  color: '#fff',
                  fontSize: 14,
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  borderRadius: '50%',
                  width: 20,
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s',
                }}
                title="Disconnect"
              >
                &#10005;
              </span>
            </>
          ) : (
            <>
              <Wallet className="w-4 h-4" />
              <span>Connect Wallet</span>
            </>
          )}
        </div>
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
    </>
  );
};

export default WalletConnectButton; 