import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Clock, AlertTriangle } from 'lucide-react';
import { aptosClient } from '../movement_service/movement-client';

type RPCStatus = 'online' | 'offline' | 'slow';

const NetworkStatus: React.FC = () => {
  const [rpcStatus, setRpcStatus] = useState<RPCStatus>('online');
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());
  const [responseTime, setResponseTime] = useState<number | null>(null);

  const checkRPCStatus = async (): Promise<void> => {
    const startTime = Date.now();
    const timeout = 5000; // 5 second timeout

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('RPC timeout')), timeout)
      );

      // Simple chain info call to check RPC health
      const rpcPromise = aptosClient.getLedgerInfo();

      await Promise.race([rpcPromise, timeoutPromise]);

      const endTime = Date.now();
      const duration = endTime - startTime;

      setResponseTime(duration);
      setRpcStatus(duration > 3000 ? 'slow' : 'online');
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.warn('RPC health check failed:', error);
      setRpcStatus('offline');
      setResponseTime(null);
    }
  };

  useEffect(() => {
    // Initial check
    checkRPCStatus();

    // Check RPC status every 30 seconds
    const healthCheckInterval = setInterval(() => {
      checkRPCStatus();
    }, 30000);

    return () => {
      clearInterval(healthCheckInterval);
    };
  }, []);

  const getStatusDisplay = () => {
    switch (rpcStatus) {
      case 'online':
        return {
          icon: <Wifi className="w-4 h-4 text-green-400" />,
          text: 'RPC Online',
          color: 'text-green-300'
        };
      case 'slow':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-yellow-400" />,
          text: 'RPC Slow',
          color: 'text-yellow-300'
        };
      case 'offline':
        return {
          icon: <WifiOff className="w-4 h-4 text-red-400" />,
          text: 'RPC Offline',
          color: 'text-red-300'
        };
    }
  };

  const status = getStatusDisplay();

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-input border border-input rounded-lg">
      <div className="flex items-center gap-2">
        {status.icon}
        <span className={`text-xs font-medium ${status.color}`}>
          {status.text}
        </span>
      </div>

      {rpcStatus !== 'offline' && (
        <div className="flex items-center gap-1 text-xs text-gray-400 border-l border-white/10 pl-2">
          <Clock className="w-3 h-3" />
          <span className="hidden sm:inline">
            {responseTime ? `${responseTime}ms • ` : ''}
            {lastUpdated}
          </span>
          <span className="sm:hidden">
            {responseTime ? `${responseTime}ms` : lastUpdated.split(':').slice(0, 2).join(':')}
          </span>
        </div>
      )}
    </div>
  );
};

export default NetworkStatus;