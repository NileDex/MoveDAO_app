import React from 'react';
import { Search, Star, TrendingUp, RefreshCw } from 'lucide-react';
import DAOCard from './DAOCard';
import { DAO } from '../types/dao';
import { useFetchCreatedDAOs } from '../useServices/useFetchDAOs';

interface FeaturedDAOsProps {
  onDAOSelect: (dao: DAO) => void;
  onCreateDAO?: () => void;
}

const FeaturedDAOs: React.FC<FeaturedDAOsProps> = ({ onDAOSelect, onCreateDAO }) => {
  const { daos, isLoading, error, refetch } = useFetchCreatedDAOs();

  if (isLoading) {
    return (
      <div className="mb-12 w-full">
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <h2 className="text-2xl font-bold text-white">All DAOs</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-sm sm:max-w-none mx-auto sm:mx-0" style={{ paddingLeft: '0.8rem', paddingRight: '0.8rem' }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="professional-card rounded-xl p-4 animate-pulse"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gray-600 rounded-xl"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-600 rounded mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-3/4"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-700 rounded"></div>
                <div className="h-3 bg-gray-700 rounded w-5/6"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mb-12 w-full">
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <h2 className="text-2xl font-bold text-white">All DAOs</h2>
        <button 
          onClick={() => {
            console.log('🔄 Manual refresh triggered by user')
            refetch()
          }}
          disabled={isLoading}
          className="px-3 py-2 text-gray-400 hover:text-white transition-all disabled:opacity-50"
          title="Refresh DAO list"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
        {daos.length > 0 && (
          <div className="text-sm text-gray-400 ml-auto">
            {daos.length} DAO{daos.length !== 1 ? 's' : ''} on Movement Network
          </div>
        )}
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <div className="text-red-300 text-sm">
            <span className="text-red-400">❌</span> {error}
          </div>
        </div>
      )}
      
      {daos.length === 0 && !error ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-500/20 rounded-full flex items-center justify-center">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No DAOs Found</h3>
          <p className="text-gray-400">Be the first to create a DAO on Movement Network!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-sm sm:max-w-none mx-auto sm:mx-0" style={{ paddingLeft: '0.8rem', paddingRight: '0.8rem' }}>
          {daos.map((dao) => (
            <DAOCard 
              key={dao.id} 
              dao={dao} 
              onClick={() => onDAOSelect(dao)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FeaturedDAOs;