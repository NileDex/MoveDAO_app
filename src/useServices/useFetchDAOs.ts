import { useState, useEffect } from 'react'
import { aptosClient } from '../movement_service/movement-client'
import { MODULE_ADDRESS } from '../movement_service/constants'
import { DAO } from '../types/dao'

// Utility function to add delays for rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

interface DAOCreatedEvent {
  movedaoaddrxess: string
  creator: string
  name: string
  subname: string
  description: string
  created_at: string
  initial_council_size: string
}


export function useFetchCreatedDAOs() {
  // Load cache immediately on mount for instant display
  const cachedData = (() => {
    try {
      const cached = typeof window !== 'undefined' ? window.localStorage.getItem('daos_cache_v4_stable_count') : null;
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed?.daos || [];
      }
    } catch {}
    return [];
  })();

  const [daos, setDAOs] = useState<DAO[]>(cachedData)
  const [isLoading, setIsLoading] = useState(cachedData.length === 0) // Only show loading if no cache
  const [error, setError] = useState<string | null>(null)

  // Enhanced caching with stale-while-revalidate - updated cache key for new deployment
  const CACHE_KEY = 'daos_cache_v4_stable_count'
  const FRESH_TTL_MS = 60 * 1000 // 60s fresh window - increased for better performance
  const STALE_TTL_MS = 5 * 60 * 1000 // 5 minutes stale-while-revalidate - increased

  // Contract verification helper with retry logic
  const verifyContractDeployment = async (): Promise<boolean> => {
    try {
      // Try with a simple view call first (less likely to be rate limited)
      await aptosClient.view({
        payload: {
          function: `${MODULE_ADDRESS}::dao_core_file::get_total_dao_count`,
          functionArguments: []
        }
      });
      return true;
    } catch (error: any) {
      if (error?.message?.includes('CORS') || error?.message?.includes('429') || error?.message?.includes('Too Many Requests')) {
        console.log('⚠️ Network issues detected, but contract may still be deployed. Proceeding...');
        return true; // Assume deployed when network issues occur
      }
      console.log('ℹ️ Contract not yet deployed at address:', MODULE_ADDRESS);
      return false;
    }
  };

  // Helpers for image decoding
  const hexToBytes = (hexLike: string): Uint8Array => {
    try {
      const hex = hexLike.startsWith('0x') ? hexLike.slice(2) : hexLike
      if (hex.length === 0) return new Uint8Array([])
      const out = new Uint8Array(Math.floor(hex.length / 2))
      for (let i = 0; i < out.length; i++) {
        out[i] = parseInt(hex.substr(i * 2, 2), 16)
      }
      return out
    } catch {
      return new Uint8Array([])
    }
  }

  // Enhanced image optimization and preloading functions
  const optimizeImageUrl = (url: string): string => {
    if (!url) return ''
    
    console.log('🖼️ Optimizing image URL:', url)
    
    try {
      // For Twitter images, use minimal optimization for maximum clarity
      if (url.includes('pbs.twimg.com')) {
        let optimizedUrl = url
        
        // Profile images: use original size for maximum clarity
        if (url.includes('profile_images')) {
          optimizedUrl = url.replace('_400x400', '_400x400') // Keep original size (400x400)
        }
        
        // Banner images: use original size for maximum clarity
        if (url.includes('profile_banners')) {
          optimizedUrl = url.replace('/1500x500', '/1500x500') // Keep original size for clarity
        }
        
        console.log('✅ Twitter image optimized for clarity:', optimizedUrl)
        return optimizedUrl
      }
      
      // For other URLs, use minimal optimization for clarity
      const urlObj = new URL(url)
      urlObj.searchParams.set('w', '800') // Much larger max width for clarity
      urlObj.searchParams.set('q', '95')  // Very high quality for clear images
      const optimized = urlObj.toString()
      console.log('✅ Generic URL optimized for clarity:', optimized)
      return optimized
    } catch (error) {
      console.warn('⚠️ URL optimization failed:', error)
      return url // Return original if URL parsing fails
    }
  }

  const preloadImage = (url: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!url || !url.startsWith('http')) {
        resolve()
        return
      }
      
      const img = new Image()
      
      img.onload = () => {
        resolve()
      }
      
      img.onerror = () => {
        resolve() // Don't fail on image errors
      }
      
      // Add performance hints
      img.loading = 'eager'
      img.fetchPriority = 'high'
      img.src = url
      
      // Quick timeout - don't wait too long for external images
      setTimeout(() => {
        resolve()
      }, 1000) // Reduced to 1 second, no logging
    })
  }

  const preloadImagesBatch = async (urls: string[]): Promise<void> => {
    const validUrls = urls.filter(url => url && url.startsWith('http'))
    if (validUrls.length === 0) return
    
    // Preload in batches of 3 for better performance
    const batchSize = 3
    const batches = []
    for (let i = 0; i < validUrls.length; i += batchSize) {
      batches.push(validUrls.slice(i, i + batchSize))
    }
    
    for (const batch of batches) {
      await Promise.allSettled(batch.map(preloadImage))
    }
  }

  // Image cache to avoid reprocessing
  const imageCache = new Map<string, string>();

  // Optimistic add: allow other parts of app to inject a just-created DAO for instant UI update
  // Usage: window.dispatchEvent(new CustomEvent('dao:created', { detail: dao }))
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as Partial<DAO> | undefined
      if (!detail || !detail.id) return
      setDAOs(prev => {
        if (prev.some(d => d.id === detail.id)) return prev
        const optimistic: DAO = {
          id: detail.id as string,
          name: detail.name || 'New DAO',
          description: detail.description || '',
          image: detail.image || '',
          background: detail.background || '',
          subname: detail.subname,
          chain: detail.subname ?? 'Movement',
          tokenName: detail.tokenName ?? 'DAO',
          tokenSymbol: detail.tokenSymbol ?? 'DAO',
          tvl: '0',
          proposals: 0,
          members: 0,
          established: new Date().toLocaleString(),
          category: 'featured',
          isFollowing: false,
        }
        // Put at the top for immediate visibility
        const next = [optimistic, ...prev]
        // cache immediately
        try {
          const cacheData = { daos: next, updatedAt: Date.now(), version: 2, count: next.length }
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
            window.localStorage.setItem(`${CACHE_KEY}_backup`, JSON.stringify(cacheData))
          }
        } catch {}
        // kick a silent background refetch to reconcile details
        setTimeout(() => { fetchDAOs(true).catch(() => {}) }, 500)
        return next
      })
    }
    window.addEventListener('dao:created', handler as EventListener)
    return () => window.removeEventListener('dao:created', handler as EventListener)
  }, [])

  const toImageUrl = (maybeBytes: unknown): string => {
    try {
      // Create cache key from the data
      const cacheKey = Array.isArray(maybeBytes) ? 
        `bytes_${maybeBytes.length}_${maybeBytes.slice(0, 10).join('')}` : 
        `str_${String(maybeBytes).substring(0, 50)}`;
      
      // Check cache first
      if (imageCache.has(cacheKey)) {
        return imageCache.get(cacheKey)!;
      }

      let bytes: Uint8Array | null = null
      if (Array.isArray(maybeBytes)) {
        console.log(`🔄 Converting array of ${maybeBytes.length} bytes to image...`);
        bytes = new Uint8Array(maybeBytes as number[])
      } else if (typeof maybeBytes === 'string' && maybeBytes.length > 0) {
        console.log(`🔄 Converting hex string (${maybeBytes.length} chars) to image...`);
        if (maybeBytes.startsWith('0x')) {
          console.log(`📝 Hex string starts with 0x, length: ${maybeBytes.length}`);
        }
        bytes = hexToBytes(maybeBytes)
        console.log(`🔄 Hex conversion result: ${bytes.length} bytes`);
      } else {
        console.log(`⚠️ Unrecognized data type:`, typeof maybeBytes, maybeBytes);
      }
      
      if (bytes && bytes.length > 0) {
        console.log(`📸 Processing binary image data: ${bytes.length} bytes`);
        
        try {
          // Detect image format from magic bytes
          let mimeType = 'image/jpeg'; // default
          if (bytes.length >= 4) {
            const header = Array.from(bytes.slice(0, 4));
            if (header[0] === 0xFF && header[1] === 0xD8) {
              mimeType = 'image/jpeg';
            } else if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
              mimeType = 'image/png';
            } else if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46) {
              mimeType = 'image/gif';
            } else if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46) {
              mimeType = 'image/webp';
            }
          }
          
          // Use more efficient conversion for large images
          let dataUrl: string;
          if (bytes.length > 100000) { // > 100KB - use chunked processing
            console.log(`⚡ Using chunked processing for large ${mimeType} image`);
            const chunkSize = 8192;
            let binary = '';
            for (let i = 0; i < bytes.length; i += chunkSize) {
              const chunk = bytes.slice(i, i + chunkSize);
              binary += String.fromCharCode.apply(null, Array.from(chunk));
            }
            const base64 = btoa(binary);
            dataUrl = `data:${mimeType};base64,${base64}`;
          } else {
            // Standard conversion for smaller images
            console.log(`✅ Converting ${mimeType} image (${(bytes.length/1024).toFixed(1)}KB)`);
            const binary = String.fromCharCode.apply(null, Array.from(bytes));
            const base64 = btoa(binary);
            dataUrl = `data:${mimeType};base64,${base64}`;
          }
          
          // Cache the result
          imageCache.set(cacheKey, dataUrl);
          console.log(`✅ Successfully converted binary to ${mimeType} data URL`);
          return dataUrl;
        } catch (conversionError) {
          console.error('❌ Image conversion failed:', conversionError);
          const fallback = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iOCIgZmlsbD0iIzM3NDE1MSIvPgo8L3N2Zz4K';
          imageCache.set(cacheKey, fallback);
          return fallback;
        }
      } else {
        console.log('⚠️ No valid bytes found for image conversion');
      }
      
      // Cache empty result too
      imageCache.set(cacheKey, '');
      return ''
    } catch (error) {
      console.error('❌ Error converting bytes to image URL:', error);
      return ''
    }
  }

  // Batch processing configuration - Optimized for faster loading
  const BATCH_SIZE = 3 // Process 3 DAOs at a time for faster loading
  const BATCH_DELAY = 1000 // 1s delay between batches - reduced for speed
  const REQUEST_DELAY = 200 // 200ms delay between individual requests - reduced for speed

  // Helper function to process a single DAO address
  const processSingleDAO = async (address: string): Promise<DAO | null> => {
    try {
      // Add small delay before each DAO processing to avoid overwhelming the RPC
      await delay(REQUEST_DELAY)
      
      const daoInfo = await aptosClient.view({
        payload: {
          function: `${MODULE_ADDRESS}::dao_core_file::get_dao_info_with_subname`,
          functionArguments: [address],
        },
      })
      
      // Handle different DAO info formats - according to ABI: (name, subname, description, logo_is_url, logo_url, logo_data, bg_is_url, bg_url, bg_data, created_at)
      let name, subname, description, logoIsUrl, logoUrl, logoData, bgIsUrl, bgUrl, bgData, createdAt;
      if (daoInfo.length >= 10) {
        // New format with subname: (name, subname, description, logoIsUrl, logoUrl, logoData, bgIsUrl, bgUrl, bgData, createdAt)
        [name, subname, description, logoIsUrl, logoUrl, logoData, bgIsUrl, bgUrl, bgData, createdAt] = daoInfo;
      } else if (daoInfo.length >= 9) {
        // Format without subname: (name, description, logoIsUrl, logoUrl, logoData, bgIsUrl, bgUrl, bgData, createdAt)
        [name, description, logoIsUrl, logoUrl, logoData, bgIsUrl, bgUrl, bgData, createdAt] = daoInfo;
        subname = undefined;
      } else {
        // Legacy format: (name, description, logo, background, createdAt)
        [name, description, logoData, bgData, createdAt] = daoInfo;
        logoIsUrl = false;
        bgIsUrl = false;
        logoUrl = '';
        bgUrl = '';
        subname = undefined;
      }
      
      // Handle images using the working pattern with optimization
      let logoUrl_final: string;
      if (logoIsUrl) {
        logoUrl_final = optimizeImageUrl(logoUrl as string);
      } else {
        console.log('🔍 Processing logo data:', typeof logoData, Array.isArray(logoData) ? `array[${logoData.length}]` : 'not array');
        logoUrl_final = toImageUrl(logoData);
      }
      
      let backgroundUrl_final: string;
      if (bgIsUrl) {
        backgroundUrl_final = optimizeImageUrl(bgUrl as string);
      } else {
        console.log('🔍 Processing background data:', typeof bgData, Array.isArray(bgData) ? `array[${bgData.length}]` : 'not array');
        backgroundUrl_final = toImageUrl(bgData);
      }
      
      // Fetch real DAO statistics with a small delay
      await delay(REQUEST_DELAY)
      const stats = await fetchDAOStats(address)
      
      const subnameStr = typeof subname === 'string' ? (subname as string) : undefined;
      const dao: DAO = {
        id: address,
        name: name as string,
        description: description as string,
        image: logoUrl_final,
        background: backgroundUrl_final,
        subname: subnameStr,
        chain: subnameStr || 'Movement',
        tokenName: subnameStr || 'DAO',
        tokenSymbol: subnameStr || 'DAO',
        tvl: '0',
        proposals: stats.proposals,
        members: stats.members,
        established: new Date(parseInt(createdAt as string) * 1000).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }) + ' at ' + new Date(parseInt(createdAt as string) * 1000).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        category: 'featured' as const,
        isFollowing: false
      }
      
      console.log('🏷️ Registry DAO subname:', subname, 'for', address.slice(0,8))
      return dao
    } catch (error) {
      console.warn('Failed to process DAO address:', address, error)
      return null
    }
  }

  // Helper function to process DAOs in batches
  const processDAOsInBatches = async (addresses: string[]): Promise<DAO[]> => {
    const foundDAOs: DAO[] = []
    
    console.log(`🔄 Processing ${addresses.length} DAOs in batches of ${BATCH_SIZE}...`)
    
    for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
      const batch = addresses.slice(i, i + BATCH_SIZE)
      console.log(`📦 Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(addresses.length/BATCH_SIZE)}: ${batch.length} DAOs`)
      
      // Process batch concurrently
      const batchPromises = batch.map(address => processSingleDAO(address))
      const batchResults = await Promise.allSettled(batchPromises)
      
      // Add successful results to foundDAOs
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value !== null) {
          foundDAOs.push(result.value)
        }
      })
      
      // Wait between batches (except for the last batch)
      if (i + BATCH_SIZE < addresses.length) {
        console.log(`⏱️ Waiting ${BATCH_DELAY}ms before next batch...`)
        await delay(BATCH_DELAY)
      }
    }
    
    console.log(`✅ Successfully processed ${foundDAOs.length}/${addresses.length} DAOs`)
    return foundDAOs
  }

  // Helper function to fetch real DAO statistics (members and proposals)
  const fetchDAOStats = async (daoAddress: string): Promise<{ members: number; proposals: number }> => {
    try {
      console.log('📊 Fetching real stats for DAO:', daoAddress)
      
      // Small delay to reduce RPC pressure when called in batches
      await delay(100)
      
      const [membersRes, proposalsRes] = await Promise.allSettled([
        aptosClient.view({
          payload: {
            function: `${MODULE_ADDRESS}::membership::total_members`,
            functionArguments: [daoAddress]
          }
        }),
        aptosClient.view({
          payload: {
            function: `${MODULE_ADDRESS}::proposal::get_proposals_count`,
            functionArguments: [daoAddress]
          }
        })
      ])
      
      const memberCount = membersRes.status === 'fulfilled' && Array.isArray(membersRes.value) 
        ? Number(membersRes.value[0] || 0) 
        : 0
      const proposalCount = proposalsRes.status === 'fulfilled' && Array.isArray(proposalsRes.value) 
        ? Number(proposalsRes.value[0] || 0) 
        : 0
      
      console.log(`✅ DAO ${daoAddress.slice(0, 8)}... - Members: ${memberCount}, Proposals: ${proposalCount}`)
      
      return { members: memberCount, proposals: proposalCount }
    } catch (error) {
      console.warn(`Failed to fetch stats for DAO ${daoAddress}:`, error)
      return { members: 0, proposals: 0 }
    }
  }

  // Helper function to check if an address has a DAO resource
  const checkDAOAtAddress = async (_address: string): Promise<DAO | null> => {
    try {
      console.log('🔍 Checking for DAO resource at address:', _address)
      
      // Get the DAOInfo resource directly (similar to vaccine attestation approach)
      const resource = await aptosClient.getAccountResource({
        accountAddress: _address,
        resourceType: `${MODULE_ADDRESS}::dao_core_file::DAOInfo`
      })
      
      console.log('✅ Found DAO resource:', resource)
      
      if (resource) {
        // Get detailed DAO info using the view function with subname support
        const daoInfo = await aptosClient.view({
          payload: {
            function: `${MODULE_ADDRESS}::dao_core_file::get_dao_info_with_subname`,
            functionArguments: [_address],
          },
        })
        
        // Handle different DAO info formats - according to ABI: (name, subname, description, logo_is_url, logo_url, logo_data, bg_is_url, bg_url, bg_data, created_at)
        console.log('🔍 Raw daoInfo array:', daoInfo, 'length:', daoInfo.length)
        let name, subname, description, logoIsUrl, logoUrl, logoData, bgIsUrl, bgUrl, bgData, createdAt;
        if (daoInfo.length >= 10) {
          // New format with subname: (name, subname, description, logoIsUrl, logoUrl, logoData, bgIsUrl, bgUrl, bgData, createdAt)
          [name, subname, description, logoIsUrl, logoUrl, logoData, bgIsUrl, bgUrl, bgData, createdAt] = daoInfo;
          const subLen = typeof subname === 'string' ? (subname as string).length : 0
          console.log('🏷️ Extracted subname from position 1:', subname, typeof subname, 'len:', subLen)
        } else if (daoInfo.length >= 9) {
          // Format without subname: (name, description, logoIsUrl, logoUrl, logoData, bgIsUrl, bgUrl, bgData, createdAt)
          [name, description, logoIsUrl, logoUrl, logoData, bgIsUrl, bgUrl, bgData, createdAt] = daoInfo;
          subname = undefined;
          console.log('🏷️ No subname in 9-field format')
        } else {
          // Legacy format: (name, description, logo, background, createdAt)
          [name, description, logoData, bgData, createdAt] = daoInfo;
          logoIsUrl = false;
          bgIsUrl = false;
          logoUrl = '';
          bgUrl = '';
          subname = undefined;
          console.log('🏷️ No subname in legacy format')
        }

        // Convert possible bytes (vector<u8> or 0x-hex) to URLs
        let logoUrl_final: string;
        if (logoIsUrl) {
          logoUrl_final = optimizeImageUrl(logoUrl as string);
        } else {
          logoUrl_final = toImageUrl(logoData);
        }
        
        let backgroundUrl_final: string;
        if (bgIsUrl) {
          backgroundUrl_final = optimizeImageUrl(bgUrl as string);
        } else {
          backgroundUrl_final = toImageUrl(bgData);
        }

        // Fetch real DAO statistics
        const stats = await fetchDAOStats(_address)
        
        const subnameStr = typeof subname === 'string' ? (subname as string) : undefined;
        const dao: DAO = {
          id: _address,
          name: name as string,
          description: description as string,
          image: logoUrl_final, // Only use actual compressed logo, no fallback
          background: backgroundUrl_final,
          subname: subnameStr,
          chain: subnameStr || 'Movement',
          tokenName: subnameStr || 'DAO',
          tokenSymbol: subnameStr || 'DAO',
          tvl: '0',
          proposals: stats.proposals,
          members: stats.members,
          established: new Date(parseInt(createdAt as string) * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }) + ' at ' + new Date(parseInt(createdAt as string) * 1000).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          category: 'featured',
          isFollowing: false
        }
        
        console.log('✅ Successfully created DAO object:', dao)
        console.log('🏷️ DAO subname value:', subname, typeof subname)
        return dao
      }
    } catch (error) {
      console.log('ℹ️ No DAO found at address', _address, '(this is normal if no DAO exists)')
      return null
    }
    
    return null
  }

  const fetchDAOs = async (forceRefresh = false) => {
    // Enhanced caching with stale-while-revalidate pattern
    let usedStaleCache = false
    
    try {
      const cachedRaw = typeof window !== 'undefined' ? window.localStorage.getItem(CACHE_KEY) : null
      if (cachedRaw && !forceRefresh) {
        const cached = JSON.parse(cachedRaw) as { daos: DAO[]; updatedAt: number; count: number }
        if (cached?.daos?.length && cached?.count) {
          const age = Date.now() - (cached.updatedAt || 0)
          
          if (age < FRESH_TTL_MS) {
            // Fresh cache - use immediately and don't fetch
            console.log(`✅ Using fresh cache: ${cached.count} DAOs (age: ${Math.round(age/1000)}s)`)
            setDAOs(cached.daos)
            setIsLoading(false)
            return cached.daos
          } else if (age < STALE_TTL_MS) {
            // Stale but valid - show immediately and fetch in background
            console.log(`⚡ Using stale cache: ${cached.count} DAOs (age: ${Math.round(age/1000)}s), refreshing...`)
            setDAOs(cached.daos)
            setIsLoading(false)
            usedStaleCache = true
          }
        }
      }
    } catch {}

    // Only show loading if we don't have stale cache
    if (!usedStaleCache) {
      setIsLoading(true)
    }
    setError(null)

    try {
      console.log('🔍 Fetching DAOs using Aptos TS SDK...')
      console.log('🔎 Module address:', MODULE_ADDRESS)
      
      // First verify contract deployment (but proceed even if network issues)
      const isContractDeployed = await verifyContractDeployment();
      if (!isContractDeployed) {
        console.log('ℹ️ Contract verification failed - trying cache or fallback data');
        // Don't return empty - try to use cached data or continue with other methods
      }
      
      console.log('🔎 Expected event type:', `${MODULE_ADDRESS}::dao_core_file::DAOCreated`)

      let foundDAOs: DAO[] = []

      // Primary Strategy: Use registry-based method (most reliable)
      try {
        console.log('🔍 Checking DAO registry for canonical count...')
        
        const totalDAOs = await aptosClient.view({
          payload: {
            function: `${MODULE_ADDRESS}::dao_core_file::get_total_dao_count`,
            functionArguments: [],
          },
        })
        console.log('📊 Registry DAO count:', totalDAOs[0])
        
        if (Number(totalDAOs[0]) > 0) {
          console.log('✅ Registry has DAOs, fetching all addresses...')
          
          const allAddresses = await aptosClient.view({
            payload: {
              function: `${MODULE_ADDRESS}::dao_core_file::get_all_dao_addresses`,
              functionArguments: [],
            },
          })
          
          if (Array.isArray(allAddresses[0]) && allAddresses[0].length > 0) {
            const addresses = allAddresses[0] as string[]
            console.log(`🎯 Registry returned ${addresses.length} DAO addresses - this is the canonical count`)
            
            // Process DAOs in batches to avoid rate limiting
            foundDAOs = await processDAOsInBatches(addresses)
            console.log(`✅ Successfully processed ${foundDAOs.length}/${addresses.length} DAOs from registry`)
            
            // Use registry data as the definitive source
            setDAOs(foundDAOs)
            
            // Cache with registry count for consistency
            const cacheData = {
              daos: foundDAOs,
              updatedAt: Date.now(),
              version: 4,
              count: foundDAOs.length,
              registryCount: Number(totalDAOs[0])
            }
            
            try {
              if (typeof window !== 'undefined') {
                window.localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
                window.localStorage.setItem(`${CACHE_KEY}_backup`, JSON.stringify(cacheData))
              }
            } catch (error) {
              console.warn('Failed to cache DAOs:', error)
            }
            
            setIsLoading(false)
            return foundDAOs
          }
        } else {
          console.log('ℹ️ Registry shows 0 DAOs - no DAOs exist yet')
        }
      } catch (registryError) {
        console.warn('⚠️ Registry method failed, falling back to event discovery:', registryError)
      }

      // Fallback: Event-based discovery if registry fails
      if (foundDAOs.length === 0) {
        console.log('⚡ Registry method failed or returned no DAOs, trying event discovery...')
        
        try {
          const indexerEvents = await Promise.race([
            aptosClient.getModuleEventsByEventType({
              eventType: `${MODULE_ADDRESS}::dao_core_file::DAOCreated`,
              options: { limit: 50 }
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Event timeout')), 5000))
          ]) as any[]

          if (Array.isArray(indexerEvents) && indexerEvents.length > 0) {
            console.log(`🎯 Event discovery found ${indexerEvents.length} DAO creation events`)
            
            // Process events sequentially to avoid overwhelming RPC
            for (const ev of indexerEvents) {
              try {
                const eventData = ev.data as DAOCreatedEvent
                if (!eventData?.movedaoaddrxess) continue
                
                const dao = await processSingleDAO(eventData.movedaoaddrxess)
                if (dao && !foundDAOs.some(d => d.id === dao.id)) {
                  foundDAOs.push(dao)
                }
                
                // Add delay between processing
                await delay(REQUEST_DELAY)
              } catch (error) {
                console.warn('Failed to process DAO event:', error)
              }
            }
            console.log(`✅ Event discovery processed ${foundDAOs.length} DAOs`)
          } else {
            console.log('ℹ️ No DAO creation events found')
          }
        } catch (eventError) {
          console.warn('⚠️ Event discovery failed:', eventError)
        }
      }
      
      console.log(`🎯 FINAL RESULT: Found exactly ${foundDAOs.length} DAOs`)
      console.log('📝 DAO IDs:', foundDAOs.map(dao => dao.id.slice(0,8) + '...'))
      
      // Always set the found DAOs (even if empty)
      setDAOs(foundDAOs)
      
      // Cache the final results for consistency
      try {
        const cacheData = {
          daos: foundDAOs,
          updatedAt: Date.now(),
          version: 4,
          count: foundDAOs.length
        }
        
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
          window.localStorage.setItem(`${CACHE_KEY}_backup`, JSON.stringify(cacheData))
        }
        console.log(`💾 Cached ${foundDAOs.length} DAOs for future requests`)
      } catch (error) {
        console.warn('Failed to cache DAOs:', error)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch DAOs via SDK'
      setError(errorMessage)
      console.error('❌ Error fetching DAOs:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDAOs()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    daos,
    isLoading,
    error,
    refetch: () => fetchDAOs(true), // Force refresh when manually triggered
  }
}

// Hook to get DAO count for stats
export function useDAOStats() {
  const [stats, setStats] = useState({
    totalDAOs: 0,
    totalMembers: 0,
    totalProposals: 0,
    activeProposals: 0,
    totalVotes: 0
  })
  const [isLoading, setIsLoading] = useState(false)
  
  // Use the main DAO fetcher to get the same DAOs
  const { daos: fetchedDAOs } = useFetchCreatedDAOs()

  const fetchStats = async () => {
    setIsLoading(true)
    try {
      console.log('🔍 Fetching real DAO stats from blockchain...')
      console.log('🔎 Available DAOs from main fetcher:', fetchedDAOs.length)
      console.log('🔎 Fetched DAOs details:', fetchedDAOs.map(dao => ({ id: dao.id, name: dao.name })))
      
      // Debug: If no DAOs found, try to check if the problem is with DAO discovery
      if (fetchedDAOs.length === 0) {
        console.warn('⚠️ No DAOs found by main fetcher. This could mean:')
        console.warn('   1. No DAOs have been created yet')
        console.warn('   2. Event indexing is not working')
        console.warn('   3. There is an issue with the MODULE_ADDRESS or event types')
        console.log('🔎 MODULE_ADDRESS being used:', MODULE_ADDRESS)
        console.log('🔎 Expected event type:', `${MODULE_ADDRESS}::dao_core_file::DAOCreated`)
        
        // Try to test if view functions work by testing against MODULE_ADDRESS itself
        try {
          console.log('🔍 Testing view function access with MODULE_ADDRESS as test DAO...')
          const testMembersRes = await aptosClient.view({
            payload: {
              function: `${MODULE_ADDRESS}::membership::total_members`,
              functionArguments: [MODULE_ADDRESS]
            }
          })
          console.log('✅ View function test successful:', testMembersRes)
        } catch (e) {
          console.warn('❌ View function test failed:', e)
          console.warn('   This suggests either:')
          console.warn('   • No DAO exists at MODULE_ADDRESS (expected)')
          console.warn('   • Contract is not deployed properly')
          console.warn('   • Network/RPC issues')
        }
      }
      
      // Use the DAOs that were already fetched by the main DAO fetcher
      const daoAddresses = fetchedDAOs.map(dao => dao.id)
      console.log('📋 Using DAO addresses:', daoAddresses)

      // Calculate real stats using blockchain view functions
      const totalDAOs = daoAddresses.length
      let totalMembers = 0
      let totalProposals = 0
      let activeProposals = 0
      let totalVotes = 0

      // Fetch data for each DAO in parallel batches
      const daoBatchSize = 3
      const daoBatches = []
      for (let i = 0; i < daoAddresses.length; i += daoBatchSize) {
        daoBatches.push(daoAddresses.slice(i, i + daoBatchSize))
      }

      // Get active status value once (it's constant)
      const activeStatusRes = await aptosClient.view({
        payload: {
          function: `${MODULE_ADDRESS}::proposal::get_status_active`,
          functionArguments: []
        }
      }).catch(() => [1])
      const activeStatusValue = Number(activeStatusRes[0] || 1)

      for (const batch of daoBatches) {
        const batchPromises = batch.map(async (daoAddr) => {
          try {
            // Parallel fetch basic DAO stats
            const [membersRes, proposalCountRes] = await Promise.allSettled([
              aptosClient.view({
                payload: {
                  function: `${MODULE_ADDRESS}::membership::total_members`,
                  functionArguments: [daoAddr]
                }
              }),
              aptosClient.view({
                payload: {
                  function: `${MODULE_ADDRESS}::proposal::get_proposals_count`,
                  functionArguments: [daoAddr]
                }
              })
            ])
            
            const memberCount = membersRes.status === 'fulfilled' ? Number(membersRes.value[0] || 0) : 0
            const proposalCount = proposalCountRes.status === 'fulfilled' ? Number(proposalCountRes.value[0] || 0) : 0
            
            let activeCount = 0
            let voteCount = 0
            
            // Fetch proposal data in smaller batches if there are many proposals
            if (proposalCount > 0) {
              const proposalBatchSize = 5
              const proposalBatches = []
              for (let i = 0; i < proposalCount; i += proposalBatchSize) {
                proposalBatches.push(Array.from({ length: Math.min(proposalBatchSize, proposalCount - i) }, (_, idx) => i + idx))
              }
              
              for (const propBatch of proposalBatches) {
                const propPromises = propBatch.map(async (i) => {
                  try {
                    const [statusRes, proposalRes] = await Promise.allSettled([
                      aptosClient.view({
                        payload: {
                          function: `${MODULE_ADDRESS}::proposal::get_proposal_status`,
                          functionArguments: [daoAddr, i]
                        }
                      }),
                      aptosClient.view({
                        payload: {
                          function: `${MODULE_ADDRESS}::proposal::get_proposal`,
                          functionArguments: [daoAddr, i]
                        }
                      })
                    ])
                    
                    const status = statusRes.status === 'fulfilled' ? Number(statusRes.value[0] || 0) : 0
                    const isActive = status === activeStatusValue ? 1 : 0
                    
                    let votes = 0
                    if (proposalRes.status === 'fulfilled' && proposalRes.value?.[0]) {
                      const proposalData = proposalRes.value[0] as any
                      votes = Number(proposalData.yes_votes || 0) + Number(proposalData.no_votes || 0) + Number(proposalData.abstain_votes || 0)
                    }
                    
                    return { isActive, votes }
                  } catch {
                    return { isActive: 0, votes: 0 }
                  }
                })
                
                const propResults = await Promise.allSettled(propPromises)
                propResults.forEach(result => {
                  if (result.status === 'fulfilled') {
                    activeCount += result.value.isActive
                    voteCount += result.value.votes
                  }
                })
              }
            }
            
            return { memberCount, proposalCount, activeCount, voteCount }
          } catch (error) {
            console.warn(`Failed to fetch stats for DAO ${daoAddr}:`, error)
            return { memberCount: 0, proposalCount: 0, activeCount: 0, voteCount: 0 }
          }
        })
        
        const batchResults = await Promise.allSettled(batchPromises)
        batchResults.forEach(result => {
          if (result.status === 'fulfilled') {
            totalMembers += result.value.memberCount
            totalProposals += result.value.proposalCount
            activeProposals += result.value.activeCount
            totalVotes += result.value.voteCount
          }
        })
      }

      console.log('📊 Real stats calculated:', {
        totalDAOs,
        totalMembers,
        totalProposals,
        activeProposals,
        totalVotes
      })

      setStats({
        totalDAOs,
        totalMembers,
        totalProposals,
        activeProposals,
        totalVotes
      })
    } catch (error) {
      console.error('Error fetching DAO stats:', error)
      // Fallback to basic counting
      setStats({
        totalDAOs: 0,
        totalMembers: 0,
        totalProposals: 0,
        activeProposals: 0,
        totalVotes: 0
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Only fetch stats if we have DAOs available
    if (fetchedDAOs.length > 0) {
      fetchStats()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchedDAOs.length]) // Re-run when DAO count changes

  return {
    stats,
    isLoading,
    refetch: fetchStats
  }
}