import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Clock } from 'lucide-react';

const NetworkStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastUpdated(new Date().toLocaleTimeString());
    };
    
    const handleOffline = () => setIsOnline(false);

    // Update time every 30 seconds
    const timeInterval = setInterval(() => {
      if (isOnline) {
        setLastUpdated(new Date().toLocaleTimeString());
      }
    }, 30000);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(timeInterval);
    };
  }, [isOnline]);

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-input border border-input rounded-lg">
      <div className="flex items-center gap-2">
        {isOnline ? (
          <Wifi className="w-4 h-4 text-green-400" />
        ) : (
          <WifiOff className="w-4 h-4 text-red-400" />
        )}
        <span className={`text-xs font-medium ${isOnline ? 'text-green-300' : 'text-red-300'}`}>
          {isOnline ? 'online' : 'offline'}
        </span>
      </div>
      
      {isOnline && (
        <div className="flex items-center gap-1 text-xs text-gray-400 border-l border-white/10 pl-2">
          <Clock className="w-3 h-3" />
          <span className="hidden sm:inline">Updated: {lastUpdated}</span>
          <span className="sm:hidden">{lastUpdated.split(':').slice(0, 2).join(':')}</span>
        </div>
      )}
    </div>
  );
};

export default NetworkStatus;