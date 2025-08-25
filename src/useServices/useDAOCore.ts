import { useState, useEffect } from 'react'
import { useWallet } from '@razorlabs/razorkit'
import { aptosClient } from '../movement_service/movement-client'
import { MODULE_ADDRESS } from '../movement_service/constants'

export interface CreateDAOParams {
  name: string
  subname: string
  description: string
  logo: Uint8Array
  background: Uint8Array
  initialCouncil: string[]
  minStakeToJoin: number
}

export interface CreateDAOWithUrlsParams {
  name: string
  subname: string
  description: string
  logoUrl: string
  backgroundUrl: string
  initialCouncil: string[]
  minStakeToJoin: number
}

export interface DAOInfo {
  name: string
  subname: string
  description: string
  logo: Uint8Array
  background: Uint8Array
  createdAt: number
}

export interface DAOCreationProposal {
  id: number
  proposer: string
  targetDaoAddress: string
  name: string
  subname: string
  description: string
  createdAt: number
  votingDeadline: number
  yesVotes: number
  noVotes: number
  executed: boolean
  approved: boolean
}

export function useCreateDAO() {
  const { account, signAndSubmitTransaction } = useWallet()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Test function to isolate serialization issues
  const testMinimalTransaction = async () => {
    if (!account || !signAndSubmitTransaction) {
      throw new Error('Wallet not connected')
    }

    console.log('🧪 Testing minimal transaction...')
    
    // Use RazorKit's expected format with payload wrapper (from vaccine example)
    const payload = {
      function: `${MODULE_ADDRESS}::dao_core_file::create_dao`,
      typeArguments: [],
      functionArguments: [
        "Test DAO",                      // name
        "test-dao",                      // subname  
        "A test DAO for debugging",      // description
        [1, 2, 3],                      // logo (minimal bytes)
        [4, 5, 6],                      // background (minimal bytes)
        [account.address],               // initial_council (just current user)
        6000000                         // min_stake_to_join (6 Move in octas)
      ],
    }
    
    console.log('🧪 RazorKit payload format:', payload)
    
    // Add gas configuration for test transaction (minimal images)    
    console.log('🧪 Test transaction request with gas options')
    
    try {
      const result = await signAndSubmitTransaction({ payload } as any)
      console.log('✅ Minimal transaction succeeded:', result)
      return result
    } catch (testError) {
      console.error('❌ Minimal transaction failed:', testError)
      throw testError
    }
  }

  const createDAO = async (params: CreateDAOParams) => {
    if (!account || !signAndSubmitTransaction) {
      throw new Error('Wallet not connected')
    }

    setIsPending(true)
    setError(null)

    try {
      console.log('🔄 Building transaction for DAO creation...')
      console.log('📋 Parameters:', params)
      console.log('👤 Account:', account.address)
      
      // With multi-DAO registry, multiple DAOs per address are now allowed
      console.log('✅ Multiple DAOs per address supported - proceeding with creation')
      
      // Validate parameters against contract requirements
      
      // Name validation (3-100 characters)
      if (!params.name || params.name.trim().length < 3) {
        throw new Error('DAO name must be at least 3 characters long')
      }
      if (params.name.length > 100) {
        throw new Error('DAO name must be less than 100 characters')
      }
      
      // Subname validation (treat as name for now)
      if (!params.subname || params.subname.trim().length < 3) {
        throw new Error('DAO subname must be at least 3 characters long')
      }
      if (params.subname.length > 100) {
        throw new Error('DAO subname must be less than 100 characters')
      }
      
      // Description validation (10-2000 characters)
      if (!params.description || params.description.trim().length < 10) {
        throw new Error('DAO description must be at least 10 characters long')
      }
      if (params.description.length > 2000) {
        throw new Error('DAO description must be less than 2000 characters')
      }
      
      // Logo size validation (contract allows up to 1MB)
      const maxLogoSize = 1_048_576 // 1MB
      if (params.logo.length > maxLogoSize) {
        throw new Error(`Logo must be ≤ ${Math.round(maxLogoSize/1024)}KB (contract limit). Current: ${Math.round(params.logo.length/1024)}KB`)
      }
      
      // Background size validation (contract allows up to 5MB)
      const maxBgSize = 5_242_880 // 5MB
      if (params.background.length > maxBgSize) {
        throw new Error(`Background must be ≤ ${Math.round(maxBgSize/1024)}KB (contract limit). Current: ${Math.round(params.background.length/1024)}KB`)
      }
      
      // Council validation (1-100 members, no duplicates)
      if (!Array.isArray(params.initialCouncil) || params.initialCouncil.length === 0) {
        throw new Error('At least one council member is required')
      }
      if (params.initialCouncil.length > 100) {
        throw new Error('Maximum 100 council members allowed')
      }
      
      // Check for duplicate council members
      const uniqueCouncil = new Set(params.initialCouncil)
      if (uniqueCouncil.size !== params.initialCouncil.length) {
        throw new Error('Council members must be unique (no duplicates allowed)')
      }
      
      // Normalize and validate address format for council members (0x + 64 hex)
      const normalizeAddr = (addr: string) => {
        const hex = addr?.toLowerCase().startsWith('0x') ? addr.slice(2) : addr
        const cleaned = (hex || '').replace(/[^a-f0-9]/g, '')
        return '0x' + cleaned.padStart(64, '0')
      }
      const normalizedCouncil = params.initialCouncil.map((a, i) => {
        if (!a || typeof a !== 'string') {
          throw new Error(`Council member ${i + 1} has invalid address format`)
        }
        const n = normalizeAddr(a)
        if (!/^0x[a-f0-9]{64}$/.test(n)) {
          throw new Error(`Council member ${i + 1} address must be 0x + 64 hex digits`)
        }
        return n
      })
      
      // Min stake validation (6,000,000-10,000,000,000 octas = 6-10,000 Move)
      if (params.minStakeToJoin < 6000000) {
        throw new Error('Minimum stake must be at least 6 Move tokens')
      }
      if (params.minStakeToJoin > 10000000000) {
        throw new Error('Minimum stake must be less than 10,000 Move tokens')
      }
      
      // Prepare arguments with detailed logging and proper type conversion
      // Convert bytes to number arrays (Aptos TS SDK expects number[] for vector<u8>)
      const logoBytes = Array.from(params.logo);
      const backgroundBytes = Array.from(params.background);
      
      const functionArgs = [
        params.name,                    // string::String
        params.subname,                 // string::String
        params.description,             // string::String
        logoBytes,                      // vector<u8> (compressed)
        backgroundBytes,                // vector<u8> (compressed)
        normalizedCouncil,              // vector<address>
        params.minStakeToJoin          // u64 as number
      ]
      
      console.log('📋 Function arguments details:')
      console.log('  - name:', params.name, '(length:', params.name.length, ')')
      console.log('  - subname:', params.subname, '(length:', params.subname.length, ')')
      console.log('  - description:', params.description, '(length:', params.description.length, ')')
      console.log('  - logo bytes (compressed):', params.logo.length, 'bytes')
      console.log('  - background bytes (compressed):', params.background.length, 'bytes')
      console.log('  - logo array length:', logoBytes.length)
      console.log('  - background array length:', backgroundBytes.length)
      console.log('  - initial council:', params.initialCouncil, '(count:', params.initialCouncil.length, ')')
      console.log('  - min stake:', params.minStakeToJoin)
      console.log('  - contract address:', MODULE_ADDRESS)
      console.log('  - sender address:', account.address)

      // Use RazorKit's expected format with payload wrapper (from vaccine example)
      const payload = {
        function: `${MODULE_ADDRESS}::dao_core_file::create_dao`,
        typeArguments: [],
        functionArguments: functionArgs,
      }
      
      // Calculate gas needed based on compressed image sizes
      const logoSize = params.logo.length
      const backgroundSize = params.background.length
      const totalImageSize = logoSize + backgroundSize
      
      // 2025 optimized gas calculation based on successful DAO creation (76,469 actual usage)
      const baseGas = 80000   // Based on actual successful transaction
      const gasPerByte = 2    // More accurate estimate for compressed images
      const estimatedGas = baseGas + (totalImageSize * gasPerByte)
      const maxGasAmount = Math.min(Math.max(estimatedGas, 150000), 500_000) // More precise gas limit
      
      console.log('⛽ 2025 optimized gas calculation:', {
        logoSize: `${logoSize} bytes (compressed)`,
        backgroundSize: `${backgroundSize} bytes (compressed)`, 
        totalImageSize: `${totalImageSize} bytes`,
        estimatedGas,
        maxGasAmount,
        efficiency: `${Math.round(100 - (maxGasAmount / 2000000 * 100))}% gas reduction`
      })
      
      console.log('🔧 Creating DAO with simplified approach (matching working treasury pattern)...')
      
      let resultTx; // Declare outside try block
      
      try {
        // Use optimized transaction submission with better error handling
        console.log('🚀 Submitting DAO creation transaction...')
        
        // Add retry mechanism for network failures
        let tx;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount <= maxRetries) {
          try {
            tx = await signAndSubmitTransaction({ 
              payload,
              options: {
                maxGasAmount: maxGasAmount,
                gasUnitPrice: 100  // Optimized gas price
              }
            } as any);
            break; // Success, exit retry loop
          } catch (retryError: any) {
            retryCount++;
            if (retryCount > maxRetries) {
              throw retryError; // Re-throw after max retries
            }
            
            // Only retry on network/timeout errors
            const isRetryableError = retryError.message?.includes('network') || 
                                    retryError.message?.includes('timeout') ||
                                    retryError.message?.includes('429') ||
                                    retryError.message?.includes('503');
            
            if (!isRetryableError) {
              throw retryError; // Don't retry user rejections or other non-network errors
            }
            
            console.log(`⚠️ Network error on attempt ${retryCount}, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
          }
        }
        
        resultTx = tx;
        
        const txHash = typeof tx === 'string' 
          ? tx 
          : ((tx as any)?.hash 
            || (tx as any)?.transactionHash 
            || (tx as any)?.txHash 
            || (tx as any)?.id 
            || (tx as any)?.result?.hash 
            || null);

        if (txHash) {
          console.log('✅ Transaction submitted successfully:', txHash)
          // Wait for transaction with improved feedback
          try {
            console.log('⏳ Waiting for transaction confirmation...')
            await aptosClient.waitForTransaction({ 
              transactionHash: txHash as string, 
              options: { 
                checkSuccess: true,
                timeoutSecs: 45
              } 
            });
            console.log('✅ DAO created successfully! Transaction confirmed on-chain.')
            console.log(`🔗 Transaction hash: ${txHash}`)
          } catch (waitError) {
            console.warn('⚠️ Transaction confirmation timeout. DAO creation likely succeeded but confirmation is pending.')
          }
        } else {
          console.warn('⚠️ Wallet did not return a transaction hash. Proceeding with on-chain verification...')
        }
        
      } catch (txError: any) {
        console.error('❌ Transaction failed:', txError)
        
        if (txError.message?.includes('User rejected') || txError.message?.includes('rejected')) {
          throw new Error('Transaction was rejected by the wallet. Please approve the transaction to create the DAO.')
        } else if (txError.message?.includes('insufficient') || txError.message?.includes('balance')) {
          throw new Error('Insufficient balance to pay for transaction fees. Please ensure you have enough MOVE tokens (need ~0.08 MOVE for gas).')
        } else if (txError.message?.includes('gas')) {
          throw new Error('Gas estimation failed. This might be a temporary network issue. Please try again.')
        } else if (txError.message?.includes('network') || txError.message?.includes('connection')) {
          throw new Error('Network connection issue. Please check your internet connection and try again.')
        } else {
          throw new Error(txError.message || 'DAO creation failed. Please try again or contact support.')
        }
      }
      
      // Refresh data to verify DAO creation
      try {
        console.log('🔍 Verifying DAO creation...')
        const daoResource = await aptosClient.getAccountResource({
          accountAddress: account.address,
          resourceType: `${MODULE_ADDRESS}::dao_core_file::DAOInfo`
        })
        console.log('✅ DAO verification successful - DAOInfo resource found:', daoResource)
      } catch (verifyError) {
        console.warn('⚠️ DAO verification failed - resource not found yet. This might be normal due to indexer delay.')
      }
      
      setIsPending(false)
      return resultTx
    } catch (err) {
      console.error('❌ Error in createDAO:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to create DAO'
      setError(errorMessage)
      setIsPending(false)
      throw new Error(errorMessage)
    }
  }

  const createDAOWithUrls = async (params: CreateDAOWithUrlsParams) => {
    if (!account || !signAndSubmitTransaction) {
      throw new Error('Wallet not connected')
    }

    setIsPending(true)
    setError(null)

    try {
      console.log('🔄 Building transaction for DAO creation with URLs...')
      console.log('📋 Parameters:', params)
      
      // Validate parameters
      if (!params.name || params.name.trim().length < 3) {
        throw new Error('DAO name must be at least 3 characters long')
      }
      if (!params.logoUrl || !params.backgroundUrl) {
        throw new Error('Logo and background URLs are required')
      }
      
      // Normalize council addresses
      const normalizedCouncil = params.initialCouncil.map((addr) => {
        const hex = addr?.toLowerCase().startsWith('0x') ? addr.slice(2) : addr
        const cleaned = (hex || '').replace(/[^a-f0-9]/g, '')
        return '0x' + cleaned.padStart(64, '0')
      })
      
      const functionArgs = [
        params.name,
        params.subname, 
        params.description,
        params.logoUrl,
        params.backgroundUrl,
        normalizedCouncil,
        params.minStakeToJoin
      ]

      const payload = {
        function: `${MODULE_ADDRESS}::dao_core_file::create_dao_with_urls`,
        typeArguments: [],
        functionArguments: functionArgs,
      }
      
      console.log('🚀 Submitting DAO creation with URLs...')
      
      const tx = await signAndSubmitTransaction({ 
        payload,
        options: {
          maxGasAmount: 200_000, // Much lower gas for URL-based creation
          gasUnitPrice: 100
        }
      } as any);
      
      if (tx && (tx as any).hash) {
        const txHash = (tx as any).hash;
        console.log('✅ DAO with URLs created successfully:', txHash)
        
        await aptosClient.waitForTransaction({ 
          transactionHash: txHash, 
          options: { checkSuccess: true, timeoutSecs: 30 } 
        });
      }
      
      setIsPending(false)
      return tx
    } catch (err) {
      console.error('❌ Error creating DAO with URLs:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to create DAO with URLs'
      setError(errorMessage)
      setIsPending(false)
      throw new Error(errorMessage)
    }
  }

  return {
    createDAO,
    createDAOWithUrls,
    testMinimalTransaction,
    isPending,
    error,
  }
}

export function useProposeDAOCreation() {
  const { account, signAndSubmitTransaction } = useWallet()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const proposeDAOCreation = async (
    councilAddress: string,
    targetDAOAddress: string,
    params: CreateDAOParams
  ) => {
    if (!account || !signAndSubmitTransaction) {
      throw new Error('Wallet not connected')
    }

    setIsPending(true)
    setError(null)

    try {
      const payload = {
        function: `${MODULE_ADDRESS}::dao_core_file::propose_dao_creation`,
        typeArguments: [],
        functionArguments: [
          councilAddress,
          targetDAOAddress,
          params.name,
          params.subname,
          params.description,
          Array.from(params.logo),
          Array.from(params.background),
          params.initialCouncil,
          params.minStakeToJoin.toString()
        ],
      }

      const result = await signAndSubmitTransaction({ payload } as any)
      setIsPending(false)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to propose DAO creation'
      setError(errorMessage)
      setIsPending(false)
      throw new Error(errorMessage)
    }
  }

  return {
    proposeDAOCreation,
    isPending,
    error,
  }
}

// Utility function to convert Uint8Array to data URL
const uint8ArrayToDataUrl = (uint8Array: Uint8Array, mimeType: string = 'image/jpeg'): string => {
  try {
    if (!uint8Array || uint8Array.length === 0) {
      return '';
    }
    
    // Convert Uint8Array to binary string
    const binary = Array.from(uint8Array)
      .map(byte => String.fromCharCode(byte))
      .join('');
    
    // Convert to base64
    const base64 = btoa(binary);
    
    // Create data URL
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('Error converting Uint8Array to data URL:', error);
    return '';
  }
};

// Enhanced interface that includes data URLs for display
export interface DAOInfoWithImages extends DAOInfo {
  logoDataUrl?: string;
  backgroundDataUrl?: string;
}

export function useGetDAOInfo(daoAddress: string | null) {
  const [data, setData] = useState<DAOInfoWithImages | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDAOInfo = async () => {
    if (!daoAddress) return

    setIsLoading(true)
    setError(null)

    try {
      console.log('🔍 Fetching DAO info for:', daoAddress);
      
      const result = await aptosClient.view({
        payload: {
          function: `${MODULE_ADDRESS}::dao_core_file::get_dao_info_with_subname`,
          functionArguments: [daoAddress],
        },
      })

      // Updated contract returns (with subname): (name, subname, description, logo_is_url, logo_url, logo_data, bg_is_url, bg_url, bg_data, created_at)
      const [name, subname, description, logoIsUrl, logoUrl, logoData, bgIsUrl, bgUrl, bgData, createdAt] = result
      
      console.log('📋 Raw DAO data received:', {
        name,
        description,
        logoIsUrl,
        logoUrl: logoIsUrl ? logoUrl : 'binary data',
        logoDataLength: Array.isArray(logoData) ? logoData.length : 'not array',
        bgIsUrl,
        bgUrl: bgIsUrl ? bgUrl : 'binary data',
        bgDataLength: Array.isArray(bgData) ? bgData.length : 'not array',
        createdAt
      });

      // Handle logo based on type
      let logoUint8: Uint8Array;
      let logoDataUrl: string;
      if (logoIsUrl) {
        logoDataUrl = logoUrl as string;
        logoUint8 = new Uint8Array(); // Empty for URL-based logos
      } else {
        logoUint8 = new Uint8Array(logoData as number[]);
        logoDataUrl = uint8ArrayToDataUrl(logoUint8);
      }
      
      // Handle background based on type
      let backgroundUint8: Uint8Array;
      let backgroundDataUrl: string;
      if (bgIsUrl) {
        backgroundDataUrl = bgUrl as string;
        backgroundUint8 = new Uint8Array(); // Empty for URL-based backgrounds
      } else {
        backgroundUint8 = new Uint8Array(bgData as number[]);
        backgroundDataUrl = uint8ArrayToDataUrl(backgroundUint8);
      }
      
      console.log('🖼️ Image conversion results:', {
        logoType: logoIsUrl ? 'URL' : 'binary',
        backgroundType: bgIsUrl ? 'URL' : 'binary',
        logoDataUrlLength: logoDataUrl.length,
        backgroundDataUrlLength: backgroundDataUrl.length,
        logoPreview: logoDataUrl.substring(0, 50) + '...',
        backgroundPreview: backgroundDataUrl.substring(0, 50) + '...'
      });

      setData({
        name: name as string,
        subname: (subname as string) || '',
        description: description as string,
        logo: logoUint8,
        background: backgroundUint8,
        logoDataUrl,
        backgroundDataUrl,
        createdAt: Number(createdAt),
      })
      
      console.log('✅ DAO info processed successfully');
    } catch (err) {
      console.error('❌ Failed to fetch DAO info:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch DAO info'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDAOInfo()
  }, [daoAddress])

  return {
    data,
    isLoading,
    error,
    refetch: fetchDAOInfo,
  }
}

export function useGetDAOCreationProposals(councilAddress: string | null) {
  const [data, setData] = useState<DAOCreationProposal[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProposals = async () => {
    if (!councilAddress) return

    setIsLoading(true)
    setError(null)

    try {
      // First get the proposal count
      const countResult = await aptosClient.view({
        payload: {
          function: `${MODULE_ADDRESS}::dao_core_file::get_dao_creation_proposal_count`,
          functionArguments: [councilAddress],
        },
      })

      const proposalCount = Number(countResult[0])
      const proposals: DAOCreationProposal[] = []

      // Fetch each proposal
      for (let i = 0; i < proposalCount; i++) {
        try {
          const proposalResult = await aptosClient.view({
            payload: {
              function: `${MODULE_ADDRESS}::dao_core_file::get_dao_creation_proposal`,
              functionArguments: [councilAddress, i],
            },
          })

          const [
            id,
            proposer,
            targetDaoAddress,
            name,
            subname,
            createdAt,
            votingDeadline,
            yesVotes,
            noVotes,
            executed,
            approved
          ] = proposalResult

          proposals.push({
            id: Number(id),
            proposer: proposer as string,
            targetDaoAddress: targetDaoAddress as string,
            name: name as string,
            subname: subname as string,
            description: '', // Might need to be fetched separately
            createdAt: Number(createdAt),
            votingDeadline: Number(votingDeadline),
            yesVotes: Number(yesVotes),
            noVotes: Number(noVotes),
            executed: Boolean(executed),
            approved: Boolean(approved),
          })
        } catch (proposalError) {
          console.warn(`Failed to fetch proposal ${i}:`, proposalError)
        }
      }

      setData(proposals)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch DAO creation proposals'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProposals()
  }, [councilAddress])

  return {
    data,
    isLoading,
    error,
    refetch: fetchProposals,
  }
}

export function useVoteOnDAOCreation() {
  const { account, signAndSubmitTransaction } = useWallet()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const voteOnDAOCreation = async (
    councilAddress: string,
    proposalId: number,
    approve: boolean
  ) => {
    if (!account || !signAndSubmitTransaction) {
      throw new Error('Wallet not connected')
    }

    setIsPending(true)
    setError(null)

    try {
      const payload = {
        function: `${MODULE_ADDRESS}::dao_core_file::vote_on_dao_creation`,
        typeArguments: [],
        functionArguments: [councilAddress, proposalId.toString(), approve],
      }

      const result = await signAndSubmitTransaction({ payload } as any)
      setIsPending(false)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to vote on DAO creation'
      setError(errorMessage)
      setIsPending(false)
      throw new Error(errorMessage)
    }
  }

  return {
    voteOnDAOCreation,
    isPending,
    error,
  }
}

export function useExecuteDAOCreation() {
  const { account, signAndSubmitTransaction } = useWallet()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const executeDAOCreation = async (councilAddress: string, proposalId: number) => {
    if (!account || !signAndSubmitTransaction) {
      throw new Error('Wallet not connected')
    }

    setIsPending(true)
    setError(null)

    try {
      const payload = {
        function: `${MODULE_ADDRESS}::dao_core_file::execute_dao_creation`,
        typeArguments: [],
        functionArguments: [councilAddress, proposalId.toString()],
      }

      const result = await signAndSubmitTransaction({ payload } as any)
      setIsPending(false)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute DAO creation'
      setError(errorMessage)
      setIsPending(false)
      throw new Error(errorMessage)
    }
  }

  return {
    executeDAOCreation,
    isPending,
    error,
  }
}

export function useCheckDAOCreationRegistry(councilAddress: string | null) {
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkRegistry = async () => {
    if (!councilAddress) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await aptosClient.view({
        payload: {
          function: `${MODULE_ADDRESS}::dao_core_file::is_dao_creation_registry_initialized`,
          functionArguments: [councilAddress],
        },
      })

      setIsInitialized(Boolean(result[0]))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check DAO creation registry'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkRegistry()
  }, [councilAddress])

  return {
    isInitialized,
    isLoading,
    error,
    refetch: checkRegistry,
  }
}

// Hook for checking subname availability
export function useCheckSubnameAvailability() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkSubname = async (subname: string): Promise<{ isAvailable: boolean, owner?: string }> => {
    if (!subname) {
      throw new Error('Subname is required')
    }

    setIsPending(true)
    setError(null)

    try {
      // Check if subname is taken
      const takenResult = await aptosClient.view({
        payload: {
          function: `${MODULE_ADDRESS}::dao_core_file::is_subname_taken`,
          functionArguments: [subname],
        },
      })

      const isTaken = Boolean(takenResult[0])
      
      if (isTaken) {
        // Get the owner if taken
        try {
          const ownerResult = await aptosClient.view({
            payload: {
              function: `${MODULE_ADDRESS}::dao_core_file::get_subname_owner`,
              functionArguments: [subname],
            },
          })
          
          return {
            isAvailable: false,
            owner: ownerResult[0] as string
          }
        } catch (ownerError) {
          console.warn('Failed to get subname owner:', ownerError)
          return {
            isAvailable: false
          }
        }
      }

      return {
        isAvailable: true
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check subname availability'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsPending(false)
    }
  }

  return {
    checkSubname,
    isPending,
    error,
  }
}