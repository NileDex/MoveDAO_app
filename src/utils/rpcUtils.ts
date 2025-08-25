// Shared RPC utilities with retry logic and rate limiting
import { aptosClient } from '../movement_service/movement-client';

// Simple rate limiter to prevent overwhelming the RPC
let lastRequestTime = 0;
let requestQueue = Promise.resolve();

const throttledRequest = async <T>(fn: () => Promise<T>): Promise<T> => {
  // Queue requests to prevent parallel bombardment
  const currentRequest = requestQueue.then(async () => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    const minDelay = 1000; // 1 second minimum between requests (much more conservative for testnet)
    
    if (timeSinceLastRequest < minDelay) {
      await new Promise(resolve => setTimeout(resolve, minDelay - timeSinceLastRequest));
    }
    
    lastRequestTime = Date.now();
    return fn();
  });
  
  requestQueue = currentRequest.catch(() => {}); // Don't propagate errors to queue
  return currentRequest;
};

// Helper function for retrying failed requests with exponential backoff
export const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 3): Promise<any> => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await throttledRequest(fn);
    } catch (error: any) {
      const isRateLimit = error?.message?.includes('429') || error?.message?.includes('Too Many Requests');
      const isNetworkError = error?.message?.includes('Network Error') || error?.code === 'ERR_NETWORK';
      const isCorsError = error?.message?.includes('CORS') || error?.message?.includes('Access-Control-Allow-Origin');
      
      if ((isRateLimit || isNetworkError || isCorsError) && attempt < maxRetries - 1) {
        const delay = Math.min(2000 * Math.pow(2, attempt), 30000); // Start at 2s, max 30 second delay
        console.log(`RPC request failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
};

// Wrapper for view function calls with retry logic
export const safeView = async (payload: any): Promise<any> => {
  return retryWithBackoff(() => aptosClient.view({ payload }));
};

// Wrapper for resource calls with retry logic
export const safeGetAccountResource = async (params: any): Promise<any> => {
  return retryWithBackoff(() => aptosClient.getAccountResource(params));
};

// Wrapper for event calls with retry logic
export const safeGetModuleEventsByEventType = async (params: any): Promise<any> => {
  return retryWithBackoff(() => aptosClient.getModuleEventsByEventType(params));
};

// Wrapper for multiple calls with controlled concurrency
export const batchSafeView = async (payloads: any[], batchSize = 2): Promise<any[]> => {
  const results: any[] = [];
  
  for (let i = 0; i < payloads.length; i += batchSize) {
    const batch = payloads.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(payload => safeView(payload))
    );
    
    // Add longer delay between batches to prevent overwhelming testnet
    if (i + batchSize < payloads.length) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay between batches
    }
    
    results.push(...batchResults);
  }
  
  return results;
};