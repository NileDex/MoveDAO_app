import React from 'react';
import { Home, Plus, Search, Users, Settings, TrendingUp } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, isOpen = false, onClose }) => {
  const menuItems = [
    { id: 'home', icon: Home, label: 'Dashboard', color: 'text-blue-400' },
    { id: 'search', icon: Search, label: 'Explore DAOs', color: 'text-green-400' },
    { id: 'create-new', icon: Plus, label: 'Create DAO', color: 'text-purple-400' },
    { id: 'community', icon: Users, label: 'Community', color: 'text-pink-400' },
  ];

  // Desktop Sidebar (unchanged)
  const desktopSidebar = (
    <div className="fixed top-0 left-0 z-60 w-20 bg-black/30 backdrop-blur-md min-h-screen flex-col items-center py-6 space-y-4 hidden sm:flex">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`group relative transition-all duration-300 ${
              isActive 
                ? '' 
                : ''
            }`}
            title={item.label}
          >
            <Icon className={`w-6 h-6 ${isActive ? item.color : 'text-gray-400 group-hover:text-white'}`} />
          </button>
        );
      })}
      <div className="flex-1"></div>
      {/* Trending Icon at Bottom */}
      <div className="mt-auto pb-4">
        <button
          onClick={() => onViewChange('trending')}
          className={`group relative transition-all duration-300 ${
            currentView === 'trending' ? 'text-yellow-400' : 'text-gray-400 group-hover:text-white'
          }`}
          title="Trending"
        >
          <TrendingUp className="w-4 h-4" />
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