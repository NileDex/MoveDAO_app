import React, { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MainDashboard from './components/MainDashboard';
import CreateDAO from './components/CreateDAO';
import DAODetail from './components/DAODetail';
import PlatformGrowthCharts from './components/PlatformGrowthCharts';
import { UserProfile } from './components/profile';
import { DAO } from './types/dao';

function App() {
  const [currentView, setCurrentView] = useState('home');
  const [selectedDAO, setSelectedDAO] = useState<DAO | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleDAOSelect = (dao: DAO) => {
    setSelectedDAO(dao);
    setCurrentView('dao-detail');
  };

  const handleBackToHome = () => {
    setCurrentView('home');
    setSelectedDAO(null);
  };


  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return <MainDashboard onDAOSelect={handleDAOSelect} onCreateDAO={() => setCurrentView('create')} sidebarCollapsed={sidebarCollapsed} />;
      case 'create':
        return <CreateDAO onBack={handleBackToHome} />;
      case 'create-new':
        return <CreateDAO onBack={handleBackToHome} />;
      case 'dao-detail':
        return selectedDAO ? (
          <DAODetail dao={selectedDAO} onBack={handleBackToHome} sidebarCollapsed={sidebarCollapsed} />
        ) : (
          <MainDashboard onDAOSelect={handleDAOSelect} onCreateDAO={() => setCurrentView('create')} />
        );
      case 'search':
        return (
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="professional-card rounded-xl p-12 text-center">
              <h1 className="text-3xl font-bold text-white mb-4">Explore DAOs</h1>
              <p className="text-gray-400 mb-8">Advanced search and discovery features</p>
              <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl flex items-center justify-center mx-auto">
                <span className="text-2xl">🔍</span>
              </div>
              <p className="text-gray-500 mt-4">Coming soon...</p>
            </div>
          </div>
        );
      case 'trending':
        return <PlatformGrowthCharts />;
      case 'community':
        return (
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="professional-card rounded-xl p-12 text-center">
              <h1 className="text-3xl font-bold text-white mb-4">Community Hub</h1>
              <p className="text-gray-400 mb-8">Connect with other DAO members and builders</p>
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-xl flex items-center justify-center mx-auto">
                <span className="text-2xl">👥</span>
              </div>
              <p className="text-gray-500 mt-4">Coming soon...</p>
            </div>
          </div>
        );
      case 'profile':
        return <UserProfile />;
      default:
        return <MainDashboard onDAOSelect={handleDAOSelect} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header: always at the top */}
      <Header
        currentDAO={selectedDAO?.name}
        // Pass a prop to trigger sidebar open on mobile
        onMenuClick={() => setSidebarOpen(true)}
        onProfileClick={() => setCurrentView('profile')}
      />
      
      {/* Content area with sidebar below header */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar: below header on desktop, overlay on mobile */}
        <Sidebar
          currentView={currentView}
          onViewChange={(view) => {
            setCurrentView(view);
            setSidebarOpen(false); // close on mobile after selection
          }}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onCollapseChange={setSidebarCollapsed}
        />
        <main className={`flex-1 overflow-auto transition-all duration-300 ${
          sidebarCollapsed ? 'md:ml-16' : 'md:ml-48'
        }`}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;