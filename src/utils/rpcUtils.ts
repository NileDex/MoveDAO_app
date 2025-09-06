// Professional RPC utilities with advanced request management
import { aptosClient } from '../movement_service/movement-client';
import { managedApiCall } from '../services/apiRequestManager';

// Wrapper for view function calls with professional request management
export const safeView = async (payload: any, cacheKey?: string): Promise<any> => {
  return managedApiCall(
    () => aptosClient.view({ payload }),
    {
      cacheKey: cacheKey ? `view_${cacheKey}` : undefined,
      cacheTtl: 5000, // Cache for 5 seconds
      priority: 1
    }
  );
};

// Wrapper for resource calls with professional request management
export const safeGetAccountResource = async (params: any, cacheKey?: string): Promise<any> => {
  return managedApiCall(
    () => aptosClient.getAccountResource(params),
    {
      cacheKey: cacheKey ? `resource_${cacheKey}` : undefined,
      cacheTtl: 8000, // Cache for 8 seconds
      priority: 2 // Higher priority for resource calls
    }
  );
};

// Wrapper for event calls with professional request management
export const safeGetModuleEventsByEventType = async (params: any, cacheKey?: string): Promise<any> => {
  return managedApiCall(
    () => aptosClient.getModuleEventsByEventType(params),
    {
      cacheKey: cacheKey ? `events_${cacheKey}` : undefined,
      cacheTtl: 3000, // Cache for 3 seconds (events change frequently)
      priority: 0 // Lower priority for events
    }
  );
};

// Wrapper for multiple calls with controlled concurrency - now handled by request manager
export const batchSafeView = async (payloads: any[], options?: { cachePrefix?: string }): Promise<any[]> => {
  const promises = payloads.map((payload, index) => 
    safeView(payload, options?.cachePrefix ? `${options.cachePrefix}_${index}` : undefined)
  );
  
  // Request manager handles concurrency and rate limiting automatically
  const results = await Promise.allSettled(promises);
  return results;
};

// Legacy function kept for compatibility
export const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 3): Promise<any> => {
  console.warn('retryWithBackoff is deprecated, use safeView/safeGetAccountResource instead');
  return managedApiCall(fn);
};