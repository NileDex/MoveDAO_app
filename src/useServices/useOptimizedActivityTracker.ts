import { useState, useEffect, useCallback } from 'react';
import { aptosClient } from '../movement_service/movement-client';
import { MODULE_ADDRESS } from '../movement_service/constants';
import { ACTIVITY_TYPES, ACTIVITY_CONFIG, getActivityInfo, getActivityStyles } from '../constants/activityConstants';

export interface Activity {
  id: string;
  type: 'dao_created' | 'member_joined' | 'member_left' | 'proposal_created' | 'proposal_voted' | 'proposal_executed' | 'stake' | 'unstake' | 'treasury_deposit' | 'treasury_withdrawal' | 'reward_claimed' | 'launchpad_created' | 'launchpad_investment';
  title: string;
  description: string;
  amount?: number;
  user: string;
  userDisplayName?: string;
  dao: string;
  daoName?: string;
  timestamp: number;
  transactionHash: string;
  blockNumber?: number;
  status: 'success' | 'failed' | 'pending';
  metadata?: {
    proposalId?: number;
    voteChoice?: boolean;
    fromAddress?: string;
    toAddress?: string;
    tokenType?: string;
  };
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedActivities {
  activities: Activity[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    limit: number;
  };
}


export class OptimizedActivityTracker {
  /**
   * Check if activity tracker is initialized
   */
  static async isInitialized(): Promise<boolean> {
    try {
      // Check if GlobalActivityTracker exists at module address
      const resource = await aptosClient.getAccountResource({
        accountAddress: MODULE_ADDRESS,
        resourceType: `${MODULE_ADDRESS}::activity_tracker::GlobalActivityTracker`
      });
      
      return !!resource;
    } catch {
      // If resource doesn't exist, try to check via total activities
      try {
        await aptosClient.view({
          payload: {
            function: `${MODULE_ADDRESS}::activity_tracker::get_total_activities`,
            functionArguments: []
          }
        });
        return true;
      } catch {
        console.warn('Activity tracker not initialized - no activities available');
        return false;
      }
    }
  }

  /**
   * Get activities for a specific DAO using contract ABI
   */
  static async getDAOActivities(daoAddress: string, options: PaginationOptions = {}): Promise<PaginatedActivities> {
    const { page = 1, limit = 20 } = options;
    
    try {
      console.log(`🔍 Fetching DAO activities using contract ABI for: ${daoAddress}`);
      
      // Check if activity tracker is initialized first
      const isInitialized = await this.isInitialized();
      console.log('Activity tracker initialized:', isInitialized);
      
      if (!isInitialized) {
        console.log('⚠️ Activity tracker not initialized');
        return this.getEmptyResult(page, limit);
      }
      
      // Primary method: Use contract view function to get activity IDs
      try {
        const activityIdsResult = await aptosClient.view({
          payload: {
            function: `${MODULE_ADDRESS}::activity_tracker::get_dao_activities`,
            functionArguments: [daoAddress]
          }
        });

        const activityIds = activityIdsResult[0] as number[];
        console.log(`📊 Found ${activityIds.length} activity IDs for DAO ${daoAddress}`);

        if (activityIds.length === 0) {
          console.log('⚠️ No activities found for this DAO');
          return this.getEmptyResult(page, limit);
        }

        // Sort IDs in descending order (most recent first)
        const sortedIds = [...activityIds].sort((a, b) => b - a);

        // Apply pagination to activity IDs
        const startIndex = (page - 1) * limit;
        const endIndex = Math.min(startIndex + limit, sortedIds.length);
        const paginatedIds = sortedIds.slice(startIndex, endIndex);

        console.log(`📄 Fetching activities ${startIndex}-${endIndex} of ${sortedIds.length}`);

        // Fetch activity records by IDs
        const activities: Activity[] = [];
        const batchSize = 5;
        
        for (let i = 0; i < paginatedIds.length; i += batchSize) {
          const batch = paginatedIds.slice(i, i + batchSize);
          const batchPromises = batch.map(id => this.getActivityById(id));
          
          const batchResults = await Promise.allSettled(batchPromises);
          batchResults.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
              activities.push(result.value);
            }
          });
        }

        // Sort by timestamp descending (double-check sorting)
        activities.sort((a, b) => b.timestamp - a.timestamp);

        console.log(`✅ Successfully fetched ${activities.length} activities for DAO ${daoAddress}`);

        return {
          activities,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(sortedIds.length / limit),
            totalItems: sortedIds.length,
            hasNextPage: endIndex < sortedIds.length,
            hasPreviousPage: page > 1,
            limit
          }
        };

      } catch (viewError) {
        console.warn('Contract view function failed, falling back to events:', viewError);
        
        // Fallback: Use events if view function fails
        const eventType = `${MODULE_ADDRESS}::activity_tracker::ActivityEvent` as `${string}::${string}::${string}`;
        const events = await aptosClient.getModuleEventsByEventType({
          eventType,
          options: { limit: limit * 2 } // Get more to filter by DAO
        });

        const activities: Activity[] = (events as any[])
          .filter((e: any) => e?.data?.dao_address === daoAddress)
          .map((e: any) => this.eventToActivity(e))
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, limit); // Apply limit after filtering

        console.log(`✅ Fallback: fetched ${activities.length} activities via events for DAO ${daoAddress}`);

        return {
          activities,
          pagination: {
            currentPage: page,
            totalPages: 1,
            totalItems: activities.length,
            hasNextPage: activities.length === limit,
            hasPreviousPage: page > 1,
            limit
          }
        };
      }

    } catch (error) {
      console.error(`❌ Error fetching DAO activities for ${daoAddress}:`, error);
      return this.getEmptyResult(page, limit);
    }
  }

  /**
   * Get activities for a specific user using contract ABI
   */
  static async getUserActivities(userAddress: string, options: PaginationOptions = {}): Promise<PaginatedActivities> {
    const { page = 1, limit = 20 } = options;
    
    try {
      console.log(`🔍 Fetching user activities using contract ABI for: ${userAddress}`);
      
      const initialized = await this.isInitialized();
      if (!initialized) {
        return this.getEmptyResult(page, limit);
      }

      // Get activity IDs for this user
      const activityIds = await aptosClient.view({
        payload: {
          function: `${MODULE_ADDRESS}::activity_tracker::get_user_activities`,
          functionArguments: [userAddress]
        }
      });

      const ids = activityIds[0] as number[];
      console.log(`📊 Found ${ids.length} activity IDs for user ${userAddress}`);

      if (ids.length === 0) {
        return this.getEmptyResult(page, limit);
      }

      // Paginate and fetch activities
      const startIndex = (page - 1) * limit;
      const endIndex = Math.min(startIndex + limit, ids.length);
      const paginatedIds = ids.slice(startIndex, endIndex);

      const activities: Activity[] = [];
      
      const batchSize = 5;
      for (let i = 0; i < paginatedIds.length; i += batchSize) {
        const batch = paginatedIds.slice(i, i + batchSize);
        const batchPromises = batch.map(id => this.getActivityById(id));
        
        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
            activities.push(result.value);
          }
        });
      }

      activities.sort((a, b) => b.timestamp - a.timestamp);

      return {
        activities,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(ids.length / limit),
          totalItems: ids.length,
          hasNextPage: endIndex < ids.length,
          hasPreviousPage: page > 1,
          limit
        }
      };

    } catch (error) {
      console.error(`❌ Error fetching user activities for ${userAddress}:`, error);
      return this.getEmptyResult(page, limit);
    }
  }

  /**
   * Get global activities (recent activities across all DAOs)
   */
  static async getGlobalActivities(options: PaginationOptions = {}): Promise<PaginatedActivities> {
    const { page = 1, limit = 50 } = options;
    
    try {
      console.log(`🔍 Fetching global activities using contract ABI`);
      
      const initialized = await this.isInitialized();
      if (!initialized) {
        return this.getEmptyResult(page, limit);
      }

      // Get total activities count
      const totalActivitiesResult = await aptosClient.view({
        payload: {
          function: `${MODULE_ADDRESS}::activity_tracker::get_total_activities`,
          functionArguments: []
        }
      });

      const totalActivities = Number(totalActivitiesResult[0]);
      console.log(`📊 Total activities in system: ${totalActivities}`);

      if (totalActivities === 0) {
        return this.getEmptyResult(page, limit);
      }

      // Calculate pagination for recent activities (reverse order)
      const startIndex = Math.max(0, totalActivities - (page * limit));
      const endIndex = Math.max(0, totalActivities - ((page - 1) * limit));
      
      console.log(`📄 Fetching recent activities from ${startIndex} to ${endIndex}`);

      const activities: Activity[] = [];
      
      // Fetch activities in reverse order (most recent first)
      const activityIds: number[] = [];
      for (let i = endIndex - 1; i >= startIndex; i--) {
        activityIds.push(i);
      }

      // Fetch activities in batches
      const batchSize = 10;
      for (let i = 0; i < activityIds.length; i += batchSize) {
        const batch = activityIds.slice(i, i + batchSize);
        const batchPromises = batch.map(id => this.getActivityById(id));
        
        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
            activities.push(result.value);
          }
        });
      }

      // Sort by timestamp descending
      activities.sort((a, b) => b.timestamp - a.timestamp);

      return {
        activities,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalActivities / limit),
          totalItems: totalActivities,
          hasNextPage: startIndex > 0,
          hasPreviousPage: page > 1,
          limit
        }
      };

    } catch (error) {
      console.error(`❌ Error fetching global activities:`, error);
      return this.getEmptyResult(page, limit);
    }
  }

  /**
   * Get activity by ID using contract ABI
   */
  private static async getActivityById(activityId: number): Promise<Activity | null> {
    try {
      const activityRecord = await aptosClient.view({
        payload: {
          function: `${MODULE_ADDRESS}::activity_tracker::get_activity_by_id`,
          functionArguments: [activityId]
        }
      });

      const record = activityRecord[0] as any;
      
      // Parse ActivityRecord struct fields according to ABI structure
      const activityType = Number(record.activity_type);
      const typeInfo = getActivityInfo(activityType);
      
      if (!typeInfo) {
        console.warn(`Unknown activity type: ${activityType}`);
        return null;
      }

      // Convert transaction hash from vector<u8> to hex string
      const transactionHash = Array.isArray(record.transaction_hash) 
        ? this.vectorToHex(record.transaction_hash)
        : record.transaction_hash || '';

      // Convert amount from octas to MOVE tokens if present
      const amount = record.amount ? Number(record.amount) / 100000000 : undefined; // Using 1e8 conversion

      // Convert timestamp (contract stores in seconds, UI expects milliseconds for some displays)
      const timestamp = Number(record.timestamp) * 1000;

      return {
        id: String(record.id),
        type: typeInfo.type as Activity['type'],
        title: record.title || typeInfo.title, // Use contract title if available
        description: record.description || typeInfo.title,
        amount,
        user: record.user_address as string,
        dao: record.dao_address as string,
        timestamp,
        transactionHash,
        blockNumber: Number(record.block_number),
        status: 'success' // Assume success if it's recorded
      };

    } catch (error) {
      console.warn(`Failed to fetch activity ${activityId}:`, error);
      return null;
    }
  }

  // Convert ActivityEvent into Activity
  private static eventToActivity(ev: any): Activity {
    const d = ev?.data || {};
    const t = Number(d.activity_type || 0);
    const typeInfo = getActivityInfo(t);
    const txHash = Array.isArray(d.transaction_hash) ? this.vectorToHex(d.transaction_hash) : (d.transaction_hash || ev?.version || '');
    
    // Convert amount from octas to MOVE tokens (using 1e8 conversion factor)
    const amount = d.amount ? Number(d.amount) / 100000000 : undefined;
    
    // Timestamp handling - events store in seconds, convert to milliseconds
    const timestamp = Number(d.timestamp || 0) * 1000;
    
    return {
      id: String(d.activity_id || ev?.sequence_number || ev?.version || Date.now()),
      type: typeInfo.type as Activity['type'],
      title: d.title || typeInfo.title, // Use event title if available
      description: (d.description as string) || typeInfo.title,
      amount,
      user: (d.user_address as string) || '',
      dao: (d.dao_address as string) || '',
      timestamp,
      transactionHash: txHash,
      blockNumber: Number(d.block_number || 0),
      status: 'success',
    };
  }

  /**
   * Convert vector<u8> to hex string
   */
  private static vectorToHex(vector: number[]): string {
    if (!Array.isArray(vector)) return '';
    return '0x' + vector.map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get empty result for error cases
   */
  private static getEmptyResult(page: number, limit: number): PaginatedActivities {
    return {
      activities: [],
      pagination: {
        currentPage: page,
        totalPages: 0,
        totalItems: 0,
        hasNextPage: false,
        hasPreviousPage: false,
        limit
      }
    };
  }

  /**
   * Get activity display information
   */
  static getActivityDisplay(activity: Activity) {
    const activityType = Object.values(ACTIVITY_TYPES).find(t => t.type === activity.type);
    
    // Use centralized activity styles

    return {
      icon: activityType?.icon || '',
      color: getActivityStyles(activity.type),
      displayType: activity.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    };
  }

  /**
   * Format time ago
   */
  static formatTimeAgo(timestamp: number): string {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMs < 60000) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString();
  }
}

/**
 * React hook for DAO activities using optimized contract calls
 */
export const useDAOActivities = (daoAddress: string, options: PaginationOptions = {}) => {
  const [result, setResult] = useState<PaginatedActivities>({
    activities: [],
    pagination: {
      currentPage: 1,
      totalPages: 0,
      totalItems: 0,
      hasNextPage: false,
      hasPreviousPage: false,
      limit: options.limit || 20
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    if (!daoAddress) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const activities = await OptimizedActivityTracker.getDAOActivities(daoAddress, options);
      setResult(activities);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch activities';
      setError(errorMessage);
      console.error('Error in useDAOActivities:', err);
    } finally {
      setIsLoading(false);
    }
  }, [daoAddress, JSON.stringify(options)]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return {
    ...result,
    isLoading,
    error,
    refetch: fetchActivities
  };
};

/**
 * React hook for global activities using optimized contract calls
 */
export const useGlobalActivities = (options: PaginationOptions = {}) => {
  const [result, setResult] = useState<PaginatedActivities>({
    activities: [],
    pagination: {
      currentPage: 1,
      totalPages: 0,
      totalItems: 0,
      hasNextPage: false,
      hasPreviousPage: false,
      limit: options.limit || 50
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const activities = await OptimizedActivityTracker.getGlobalActivities(options);
      setResult(activities);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch activities';
      setError(errorMessage);
      console.error('Error in useGlobalActivities:', err);
    } finally {
      setIsLoading(false);
    }
  }, [JSON.stringify(options)]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return {
    ...result,
    isLoading,
    error,
    refetch: fetchActivities
  };
};