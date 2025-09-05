import { useState, useEffect } from 'react';
import { useWallet } from '@razorlabs/razorkit';
import { ABI } from '../services_abi/dao_core';

interface DAOInfo {
  address: string;
  name: string;
  subname?: string;
  description: string;
  created_at: number;
  logo?: {
    is_url: boolean;
    url: string;
    data: number[];
  };
  background?: {
    is_url: boolean;
    url: string;
    data: number[];
  };
}

interface UseUserDAOsReturn {
  userDAOs: {
    created: DAOInfo[];
    joined: DAOInfo[];
    all: DAOInfo[];
  };
  isLoading: boolean;
  error: string | null;
}

export function useUserDAOs(): UseUserDAOsReturn {
  const { account } = useWallet();
  const [userDAOs, setUserDAOs] = useState<{
    created: DAOInfo[];
    joined: DAOInfo[];
    all: DAOInfo[];
  }>({
    created: [],
    joined: [],
    all: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!account?.address) {
      console.log('No wallet connected for DAO fetch');
      setUserDAOs({ created: [], joined: [], all: [] });
      return;
    }

    const fetchUserDAOs = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('🚀 Starting DAO fetch for address:', account.address);
        
        // Use the Movement testnet endpoint directly
        const endpoint = 'https://full.testnet.movementinfra.xyz/v1';
        
        // Fetch user's DAOs
        console.log('📞 Calling get_user_daos...');
        const userDAOsResponse = await fetch(`${endpoint}/view`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            function: `${ABI.address}::${ABI.name}::get_user_daos`,
            type_arguments: [],
            arguments: [account.address]
          })
        });
        
        if (!userDAOsResponse.ok) {
          const errorText = await userDAOsResponse.text();
          console.error('❌ get_user_daos failed:', errorText);
          throw new Error(`Failed to fetch user DAOs: ${errorText}`);
        }
        
        const userDAOsResult = await userDAOsResponse.json();
        console.log('✅ get_user_daos result:', userDAOsResult);
        
        // Fetch all DAOs
        console.log('📞 Calling get_all_daos...');
        const allDAOsResponse = await fetch(`${endpoint}/view`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            function: `${ABI.address}::${ABI.name}::get_all_daos`,
            type_arguments: [],
            arguments: []
          })
        });
        
        if (!allDAOsResponse.ok) {
          const errorText = await allDAOsResponse.text();
          console.error('❌ get_all_daos failed:', errorText);
          throw new Error(`Failed to fetch all DAOs: ${errorText}`);
        }
        
        const allDAOsResult = await allDAOsResponse.json();
        console.log('✅ get_all_daos result:', allDAOsResult);
        
        // Process the data - handle nested array structure
        const [createdAddresses, joinedAddresses] = userDAOsResult as [string[], string[]];
        // The allDAOsResult is wrapped in an array, so extract the first element
        const allDAOs = Array.isArray(allDAOsResult) && allDAOsResult.length > 0 ? allDAOsResult[0] : [];
        
        console.log('📊 Processing data:');
        console.log('- Created addresses:', createdAddresses);
        console.log('- Joined addresses:', joinedAddresses);
        console.log('- All DAOs:', allDAOs);
        console.log('- All DAOs length:', allDAOs.length);
        
        // Debug: Check the structure of the first DAO to understand logo format
        if (allDAOs.length > 0) {
          console.log('🖼️ First DAO structure:', allDAOs[0]);
          console.log('🖼️ First DAO logo:', allDAOs[0]?.logo || 'No logo field');
        }
        
        // Map addresses to DAO objects and fetch detailed info including logos
        const fetchDAODetails = async (address: string): Promise<DAOInfo | undefined> => {
          try {
            const response = await fetch(`${endpoint}/view`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                function: `${ABI.address}::${ABI.name}::get_dao_info_with_subname`,
                type_arguments: [],
                arguments: [address]
              })
            });
            
            if (response.ok) {
              const [name, subname, description, logo_is_url, logo_url, logo_data, bg_is_url, bg_url, bg_data, created_at] = await response.json();
              console.log(`🖼️ DAO ${address} logo:`, { is_url: logo_is_url, url: logo_url, data: logo_data });
              return {
                address,
                name: name || '',
                subname: subname || undefined,
                description: description || '',
                created_at: created_at || 0,
                logo: {
                  is_url: logo_is_url || false,
                  url: logo_url || '',
                  data: Array.isArray(logo_data) ? logo_data : []
                },
                background: {
                  is_url: bg_is_url || false,
                  url: bg_url || '',
                  data: Array.isArray(bg_data) ? bg_data : []
                }
              };
            }
          } catch (err) {
            console.error(`Failed to fetch details for DAO ${address}:`, err);
          }
          
          // Fallback to summary data if detailed fetch fails
          const summaryDAO = allDAOs.find((dao: any) => dao.address === address);
          if (summaryDAO) {
            return {
              address: summaryDAO.address || address,
              name: summaryDAO.name || '',
              description: summaryDAO.description || '',
              created_at: summaryDAO.created_at || 0
            };
          }
          
          return undefined;
        };

        const createdDAOsRaw = await Promise.all(
          createdAddresses.map(address => fetchDAODetails(address))
        );

        const joinedDAOsRaw = await Promise.all(
          joinedAddresses.map(address => fetchDAODetails(address))
        );
        
        // Filter out undefined results
        const createdDAOs = createdDAOsRaw.filter((dao): dao is DAOInfo => dao !== undefined);
        const joinedDAOs = joinedDAOsRaw.filter((dao): dao is DAOInfo => dao !== undefined);
        
        // Remove duplicates
        const allUserDAOs = [...createdDAOs];
        joinedDAOs.forEach(dao => {
          if (!createdDAOs.find(created => created.address === dao.address)) {
            allUserDAOs.push(dao);
          }
        });
        
        console.log('🎯 Final result:', {
          created: createdDAOs,
          joined: joinedDAOs,
          all: allUserDAOs
        });
        
        setUserDAOs({
          created: createdDAOs,
          joined: joinedDAOs,
          all: allUserDAOs
        });
        
      } catch (err: any) {
        console.error('💥 Error fetching user DAOs:', err);
        setError(err.message || 'Failed to fetch DAOs');
        setUserDAOs({ created: [], joined: [], all: [] });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserDAOs();
  }, [account?.address]);

  return { userDAOs, isLoading, error };
}