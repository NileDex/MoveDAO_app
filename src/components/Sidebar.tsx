import React, { useEffect, useState } from 'react';
import { Home, Plus, Search, Users, Settings, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  onCollapseChange?: (isCollapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, isOpen = false, onClose, onCollapseChange }) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sidebar_collapsed');
      if (saved !== null) return saved === 'true';
    } catch {}
    return true; // Default collapsed on first load
  });
  
  const handleToggle = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    onCollapseChange?.(newState);
    try { localStorage.setItem('sidebar_collapsed', String(newState)); } catch {}
  };

  // Notify parent on mount and when state changes to keep layout in sync
  useEffect(() => {
    onCollapseChange?.(isCollapsed);
  }, [isCollapsed, onCollapseChange]);
  
  const menuItems = [
    { id: 'home', icon: Home, label: 'Dashboard', color: 'text-blue-400' },
    // { id: 'search', icon: Search, label: 'Explore DAOs', color: 'text-green-400' },
    { id: 'create-new', icon: Plus, label: 'Create DAO', color: 'text-purple-400' },
    // { id: 'community', icon: Users, label: 'Community', color: 'text-pink-400' },
  ];

  // Desktop Sidebar (responsive)
  const desktopSidebar = (
    <div className={`fixed top-16 left-0 backdrop-blur-md flex flex-col py-6 space-y-4 hidden md:flex h-[calc(100vh-4rem)] transition-all duration-300 z-40 ${
      isCollapsed ? 'w-16' : 'w-48'
    }`}
         style={{ 
           background: 'var(--card-bg)', 
           borderRight: '1px solid var(--border)' 
         }}>
      {/* Toggle Button */}
      <div className="flex justify-end px-4 mb-2">
        <button
          onClick={handleToggle}
          className="p-1 rounded-lg transition-colors"
          style={{ 
            color: 'var(--text-dim)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-dim)' }} />
          ) : (
            <ChevronLeft className="w-4 h-4" style={{ color: 'var(--text-dim)' }} />
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
              className="group relative transition-all duration-300 flex items-center space-x-3 px-3 py-2 rounded-lg"
              style={{
                background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: isActive ? 'var(--text)' : 'var(--text-dim)'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.color = 'var(--text)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-dim)';
                }
              }}
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
          className="group relative transition-all duration-300 flex items-center space-x-3 px-3 py-2 rounded-lg w-full"
          style={{
            background: currentView === 'trending' ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: currentView === 'trending' ? '#fbbf24' : 'var(--text-dim)'
          }}
          onMouseEnter={(e) => {
            if (currentView !== 'trending') {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              e.currentTarget.style.color = 'var(--text)';
            }
          }}
          onMouseLeave={(e) => {
            if (currentView !== 'trending') {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-dim)';
            }
          }}
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
      <div className="fixed inset-y-0 left-0 z-[60] w-4/5 max-w-xs backdrop-blur-md flex flex-col py-8 px-6 space-y-6 animate-slide-in sm:hidden" 
           style={{ background: 'var(--card-bg)' }}>
        <button
          className="absolute top-4 right-4 rounded-full p-2 z-[1100]"
          style={{ color: 'var(--text)', background: 'var(--card-bg)' }}
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
                className={`flex items-center gap-4 text-lg font-semibold transition-all duration-200`}
                style={{ color: isActive ? 'var(--text)' : 'var(--text-dim)' }}
              >
                <Icon className={`w-7 h-7 ${isActive ? item.color : ''}`} 
                      style={{ color: !isActive ? 'var(--text-dim)' : undefined }} />
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
            className="transition-all duration-200"
            style={{ color: currentView === 'trending' ? '#fbbf24' : 'var(--text-dim)' }}
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