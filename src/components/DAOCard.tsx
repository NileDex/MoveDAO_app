import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { DAO } from '../types/dao';

interface DAOCardProps {
  dao: DAO;
  onClick: () => void;
}

const DAOCard: React.FC<DAOCardProps> = ({ dao, onClick }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  const [backgroundError, setBackgroundError] = useState(false);
  const backgroundRetryRef = React.useRef(0);


  // Debug logging for subname (reduced verbosity)
  React.useEffect(() => {
    if (dao.subname) {
      console.log(`🏷️ DAOCard for ${dao.name} has subname:`, dao.subname);
    }
  }, [dao.name, dao.subname]);

  // Optimized image preloading - keep images stable once loaded
  React.useEffect(() => {
    if (dao.image) {
      const img = new Image();
      img.decoding = 'async' as any;
      img.onload = () => setImageLoaded(true);
      img.onerror = () => setImageError(true);
      img.loading = 'eager';
      img.fetchPriority = 'high';
      img.src = dao.image;
    } else {
      setImageError(true);
    }
  }, [dao.image]);

  React.useEffect(() => {
    // Reset retry count when background changes
    backgroundRetryRef.current = 0;

    if (dao.background && dao.background.trim()) {

      // Validate background URL before attempting to load
      const isValidUrl = (url: string) => {
        try {
          // Check if it's a data URL
          if (url.startsWith('data:')) {
            return url.includes('image/');
          }
          // Check if it's a valid HTTP/HTTPS URL
          if (url.startsWith('http://') || url.startsWith('https://')) {
            new URL(url);
            return true;
          }
          return false;
        } catch {
          return false;
        }
      };

      if (!isValidUrl(dao.background)) {
        console.warn(`⚠️ Invalid background URL for ${dao.name}:`, dao.background);
        setBackgroundError(true);
        return;
      }

      setBackgroundLoaded(false);
      setBackgroundError(false);

      const bgImg = new Image();
      bgImg.decoding = 'async' as any;
      bgImg.crossOrigin = 'anonymous'; // Add CORS support
      bgImg.loading = 'eager';
      bgImg.fetchPriority = 'high';

      // Add a timeout to detect hanging requests
      const timeoutId = setTimeout(() => {
        console.warn(`⏰ Background loading timeout for ${dao.name} after 5 seconds`);
        setBackgroundError(true);
      }, 5000); // Reduced timeout

      bgImg.onload = () => {
        clearTimeout(timeoutId);
        setBackgroundLoaded(true);
      };

      bgImg.onerror = () => {
        clearTimeout(timeoutId);
        console.log(`❌ Background failed to load for ${dao.name} - using gradient fallback`);
        setBackgroundError(true);
      };

      bgImg.src = dao.background;
    } else {
      console.log(`⚠️ No background data for ${dao.name} - using gradient`);
      setBackgroundError(true);
    }
  }, [dao.background]);

  return (
    <div 
      onClick={onClick}
      className="professional-card rounded-xl overflow-hidden cursor-pointer group animate-fade-in relative"
    >
      {/* Twitter-like banner (top strip, not covering entire card) */}
      {dao.background && !backgroundError && (
        <div 
          className={`absolute left-0 right-0 top-0 h-20 bg-cover bg-center pointer-events-none transition-opacity duration-300 ${
            backgroundLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ backgroundImage: `url(${dao.background})` }}
        >
          {/* Debug indicator */}
          {!backgroundLoaded && (
            <div className="absolute top-1 left-1 bg-black/50 text-white text-xs px-2 py-1 rounded">
              Loading...
            </div>
          )}
        </div>
      )}
      
      {/* Loading background with animated shimmer */}
      {dao.background && !backgroundLoaded && !backgroundError && (
        <div className="absolute left-0 right-0 top-0 h-20 bg-gradient-to-r from-purple-500/20 to-pink-500/20 pointer-events-none relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-pulse"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-xs text-white/60 font-medium">Loading image...</div>
          </div>
        </div>
      )}
      
      {/* Fallback gradient background if no background image or error */}
      {(!dao.background || backgroundError) && (
        <div className="absolute left-0 right-0 top-0 h-20 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 pointer-events-none">
          {/* Debug indicator */}
          {backgroundError && (
            <div className="absolute top-1 left-1 w-2 h-2 bg-red-500 rounded-full">
            </div>
          )}
        </div>
      )}
      
      {/* Content with overlay */}
      <div className="relative z-10 p-6">
        <div className="flex items-start justify-between mb-4 mt-4">
          <div className="relative">
            {/* Loading placeholder - show when image is loading */}
            {dao.image && !imageLoaded && !imageError && (
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-600/70 to-gray-700/70 animate-pulse border-2 border-white/30 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-pulse"></div>
              </div>
            )}
            
            {/* Show image if loaded successfully */}
            {dao.image && imageLoaded && !imageError && (
              <img 
                src={dao.image} 
                alt={dao.name}
                loading="eager"
                decoding="async"
                className="w-16 h-16 rounded-xl object-cover shadow-lg"
              />
            )}
            
            {/* Fallback to initials if no image or image failed to load */}
            {(!dao.image || imageError) && (
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 shadow-lg flex items-center justify-center">
                <span className="text-white text-xl font-bold">
                  {dao.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            
            {/* Subname Badge */}
            {dao.subname && dao.subname.trim() && (
              <div className="absolute -bottom-2 -right-2">
                <span className="px-2 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white dark:text-black text-xs rounded-lg font-medium shadow-lg">
                  {dao.subname}
                </span>
              </div>
            )}
            
          </div>
        
          {dao.category !== 'featured' && (
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-indigo-500/30 text-indigo-200 text-xs rounded-full border border-indigo-400/50 backdrop-blur-sm">
                {dao.chain}
              </span>
            </div>
          )}
        </div>
        
        <div className="mb-4 mt-6">
          <h3 className="text-white font-bold text-lg mb-2 transition-colors drop-shadow-sm">
            {dao.name}
          </h3>
          <p className="text-gray-300 text-sm line-clamp-2 leading-relaxed drop-shadow-sm">
            {dao.description}
          </p>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-white text-base font-bold drop-shadow-sm">
                {dao.proposals}
              </div>
              <div className="text-gray-300 text-xs drop-shadow-sm">
                Proposals
              </div>
            </div>
            <div>
              <div className="text-white text-base font-bold drop-shadow-sm">
                {dao.members}
              </div>
              <div className="text-gray-300 text-xs drop-shadow-sm">
                Members
              </div>
            </div>
          </div>
          
          <div className="flex items-center text-gray-300 text-xs drop-shadow-sm">
            <Calendar className="w-3 h-3 mr-2" />
            <span>{dao.established}</span>
          </div>
        </div>
        
        {dao.category !== 'featured' && (
          <div className="mt-4">
            <span className={`px-2 py-1 text-xs rounded-full backdrop-blur-sm ${
              dao.category === 'chain' ? 'bg-blue-500/30 text-blue-200 border border-blue-400/50' :
              'bg-purple-500/30 text-purple-200 border border-purple-400/50'
            }`}>
              {dao.category}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DAOCard;