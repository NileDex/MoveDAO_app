import React from 'react';
import { Link } from 'react-router-dom';
import { Menu } from 'lucide-react';
import './styles/Header.css';
import '@razorlabs/razorkit/style.css';
import WalletConnectButton from './WalletConnect';
import mainLogo from '../assets/mainlogo.png';

interface HeaderProps {
  onMenuClick?: () => void;
  onProfileClick?: () => void;
  currentDAO?: string;
  disableTheme?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, onProfileClick, disableTheme = false }) => {
  
  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-left">
          <div className="header-logo">
            <img src={mainLogo} alt="MoveDAO" className="header-logo-image" />
            {/* Hide logo and subtitle on mobile, show on md+ */}
            <div className="header-title-group hidden md:block">
            </div>
          </div>
          <div className="header-menu-items hidden md:flex items-center gap-6 ml-8">
            <Link to="/onboard" className="text-white font-medium text-sm cursor-pointer hover:text-gray-300 transition-colors">
              Onboard
            </Link>
          </div>
        </div>
        <div className="header-actions">
          <WalletConnectButton onProfileClick={onProfileClick} />
          <button className="header-menu-btn md:hidden" onClick={onMenuClick} aria-label="Open Sidebar">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;