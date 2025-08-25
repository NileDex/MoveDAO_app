import React from 'react';
import StatsOverview from './StatsOverview';
import FeaturedDAOs from './FeaturedDAOs';
import { DAO } from '../types/dao';

interface MainDashboardProps {
  onDAOSelect: (dao: DAO) => void;
  onCreateDAO?: () => void;
}

const MainDashboard: React.FC<MainDashboardProps> = ({ onDAOSelect, onCreateDAO }) => {
  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 py-6 sm:py-8 w-full">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="w-full flex flex-col items-center justify-center text-center">
            <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2">Governance Hub</h1>
            <p className="text-gray-400 text-base sm:text-lg">Discover and participate in decentralized communities</p>
          </div>
          
          <div className="flex items-center space-x-3">
          </div>
        </div>
      </div>

      <StatsOverview />
      <FeaturedDAOs onDAOSelect={onDAOSelect} onCreateDAO={onCreateDAO} />
    </div>
  );
};

export default MainDashboard;