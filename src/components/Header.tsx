import React from 'react';
import { Menu } from 'lucide-react';
import './styles/Header.css';
import '@razorlabs/razorkit/style.css';
import WalletConnectButton from './WalletConnect';

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-left">
          <div className="header-logo">
            <div className="header-logo-outer">
              <div className="header-logo-inner">
                <div className="header-logo-dot"></div>
              </div>
            </div>
            {/* Hide logo and subtitle on mobile, show on md+ */}
            <div className="header-title-group hidden md:block">
              <h1 className="header-title">MoveDAO-v2</h1>
              <p className="header-subtitle">Governance Platform</p>
            </div>
          </div>
        </div>
        <div className="header-actions">
          <WalletConnectButton />
          <button className="header-menu-btn" onClick={onMenuClick} aria-label="Open Sidebar">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;