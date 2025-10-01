import React from 'react';
import { Menu } from 'lucide-react';
import './styles/Header.css';
import '@razorlabs/razorkit/style.css';
import WalletConnectButton from './WalletConnect';
import mainLogo from '../assets/mainlogo.png';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
  onMenuClick?: () => void;
  onProfileClick?: () => void;
  currentDAO?: string;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, onProfileClick }) => {
  const { theme } = useTheme();
  
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