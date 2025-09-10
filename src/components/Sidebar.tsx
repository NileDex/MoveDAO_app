import React, { useState } from 'react';
import { Home, Plus, Search, Users, Settings, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  onCollapseChange?: (isCollapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, isOpen = false, onClose, onCollapseChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const handleToggle = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    onCollapseChange?.(newState);
  };
  
  const menuItems = [
    { id: 'home', icon: Home, label: 'Dashboard', color: 'text-blue-400' },
    // { id: 'search', icon: Search, label: 'Explore DAOs', color: 'text-green-400' },
    { id: 'create-new', icon: Plus, label: 'Create DAO', color: 'text-purple-400' },
    // { id: 'community', icon: Users, label: 'Community', color: 'text-pink-400' },
  ];

  // Desktop Sidebar (responsive)
  const desktopSidebar = (
    <div className={`fixed top-16 left-0 backdrop-blur-md flex flex-col py-6 space-y-4 hidden md:flex border-r border-white/10 h-[calc(100vh-4rem)] transition-all duration-300 z-40 ${
      isCollapsed ? 'w-16' : 'w-48'
    }`}>
      {/* Toggle Button */}
      <div className="flex justify-end px-4 mb-2">
        <button
          onClick={handleToggle}
          className="p-1 rounded-lg hover:bg-white/10 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-400" />
          )}
        </button>
      </div>

      {/* Menu Items */}
      <div className="flex flex-col space-y-2 px-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`group relative transition-all duration-300 flex items-center space-x-3 px-3 py-2 rounded-lg ${
                isActive 
                  ? 'bg-white/10 text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              title={isCollapsed ? item.label : ''}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? item.color : ''}`} />
              {!isCollapsed && (
                <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1"></div>
      
      {/* Trending Icon at Bottom */}
      <div className="px-2">
        <button
          onClick={() => onViewChange('trending')}
          className={`group relative transition-all duration-300 flex items-center space-x-3 px-3 py-2 rounded-lg w-full ${
            currentView === 'trending' 
              ? 'bg-white/10 text-yellow-400' 
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
          title={isCollapsed ? 'Trending' : ''}
        >
          <TrendingUp className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && (
            <span className="text-sm font-medium whitespace-nowrap">Trending</span>
          )}
        </button>
      </div>
    </div>
  );

  // Mobile Sidebar Modal
  const mobileSidebar = isOpen ? (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/60 sm:hidden" onClick={onClose} />
      {/* Sidebar Modal */}
      <div className="fixed inset-y-0 left-0 z-[60] w-4/5 max-w-xs bg-black/95 backdrop-blur-md flex flex-col py-8 px-6 space-y-6 animate-slide-in sm:hidden">
        <button
          className="absolute top-4 right-4 text-white bg-black/60 rounded-full p-2 z-[1100]"
          onClick={onClose}
          aria-label="Close Sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="flex flex-col gap-4 mt-8">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`flex items-center gap-4 text-lg font-semibold transition-all duration-200 ${
                  isActive
                    ? 'text-white'
                    : 'text-gray-300'
                }`}
              >
                <Icon className={`w-7 h-7 ${isActive ? item.color : 'text-gray-400'}`} />
                {item.label}
              </button>
            );
          })}
        </div>
        <div className="flex-1"></div>
        {/* Trending Icon at Bottom for Mobile */}
        <div className="flex justify-center pt-4">
          <button
            onClick={() => onViewChange('trending')}
            className={`transition-all duration-200 ${
              currentView === 'trending' ? 'text-yellow-400' : 'text-gray-300'
            }`}
            title="Trending"
          >
            <TrendingUp className="w-5 h-5" />
          </button>
        </div>
      </div>
    </>
  ) : null;

  return (
    <>
      {desktopSidebar}
      {mobileSidebar}
    </>
  );
};

export default Sidebar;