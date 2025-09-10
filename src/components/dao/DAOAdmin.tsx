import React, { useState, useEffect } from 'react';
import { Shield, Users, Clock, Plus, Trash2, Settings, AlertTriangle, XCircle, UserCheck, Crown, UserMinus, UserPlus, DollarSign, Edit, RefreshCw } from 'lucide-react';
import { FaCheckCircle } from 'react-icons/fa';
import { useWallet } from '@razorlabs/razorkit';
import { aptosClient } from '../../movement_service/movement-client';
import { MODULE_ADDRESS } from '../../movement_service/constants';
import { safeView } from '../../utils/rpcUtils';

interface AdminProps {
  dao: any;
}

interface Admin {
  address: string;
  role: 'super' | 'standard' | 'temporary';
  addedAt: string;
  expiresAt?: string;
  status: 'active' | 'expired';
}

interface CouncilMember {
  address: string;
  addedAt: string;
  status: 'active';
}

const DAOAdmin: React.FC<AdminProps> = ({ dao }) => {
  const [activeSection, setActiveSection] = useState('overview');
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [showAddCouncilMember, setShowAddCouncilMember] = useState(false);
  const [newAdminForm, setNewAdminForm] = useState({
    address: '',
    role: 'standard' as 'super' | 'standard' | 'temporary',
    expiresInDays: 0
  });
  const [newCouncilMemberForm, setNewCouncilMemberForm] = useState({
    address: ''
  });
  const [checkMemberForm, setCheckMemberForm] = useState({
    address: '',
    isChecking: false,
    result: null as boolean | null
  });
  const [stakeSettings, setStakeSettings] = useState({
    minStakeToJoin: 0,
    minStakeToPropose: 0,
    isLoading: false
  });
  const [showEditStake, setShowEditStake] = useState(false);
  const [newStakeForm, setNewStakeForm] = useState({
    minStakeToJoin: 0,
    minStakeToPropose: 0
  });
  const [newMinStake, setNewMinStake] = useState<string>('');
  const [newMinProposalStake, setNewMinProposalStake] = useState<string>('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const { account, signAndSubmitTransaction } = useWallet();
  // Membership and staking use 6 decimals (1e6), not 8 decimals (1e8) like Aptos coins
  const MEMBERSHIP_DECIMALS = 1e6;  // 6 decimals for membership stakes
  const APTOS_DECIMALS = 1e8;       // 8 decimals for treasury operations
  
  const toMOVE = (u64: number): number => {
    if (u64 === 0) return 0;
    return u64 / MEMBERSHIP_DECIMALS;  // Use 6 decimals for membership stakes
  };
  const fromMOVE = (move: number): number => Math.floor(move * MEMBERSHIP_DECIMALS);

  // On-chain admin state
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentRole, setCurrentRole] = useState<'super' | 'standard' | 'temporary' | 'none'>('none');
  const [isRefreshingAdmins, setIsRefreshingAdmins] = useState(false);

  // Council data state (was missing!)
  const [councilData, setCouncilData] = useState({
    totalMembers: 0,
    maxMembers: 10, // Default value
    minMembers: 3,  // Default value
    members: [] as CouncilMember[],
    daoCreator: null as string | null
  });

  // Role constants matching the admin.move contract
  const ROLE_SUPER_ADMIN = 255;  // ROLE_SUPER_ADMIN from contract
  const ROLE_STANDARD = 100;     // ROLE_STANDARD from contract
  const ROLE_TEMPORARY = 50;     // ROLE_TEMPORARY from contract

  const mapRole = (roleNum: number): 'super' | 'standard' | 'temporary' => {
    if (roleNum === ROLE_SUPER_ADMIN) return 'super';
    if (roleNum === ROLE_STANDARD) return 'standard';
    if (roleNum === ROLE_TEMPORARY) return 'temporary';
    // Default to temporary for any unrecognized role
    return 'temporary';
  };

  const shortAddr = (addr: string) => (addr?.length > 14 ? `${addr.slice(0, 10)}...${addr.slice(-4)}` : addr);

  // Helper to get DAO creator from DAOCreated event (ABI no longer exposes get_dao_creator)
  const getDaoCreatorFromEvents = async (daoAddress: string): Promise<string | null> => {
    try {
      const events = await aptosClient.getModuleEventsByEventType({
        eventType: `${MODULE_ADDRESS}::dao_core_file::DAOCreated`,
        minimumLedgerVersion: 0
      });
      const ev = (events as any[]).find((e: any) => e?.data?.movedaoaddrxess === daoAddress);
      return ev?.data?.creator || null;
    } catch {
      return null;
    }
  };

  const fetchCouncilData = async () => {
    if (!dao?.id) {
      console.error('No DAO ID provided for council data fetch');
      return;
    }
    try {
      console.log('Fetching council data for DAO:', dao.id);
      console.log('MODULE_ADDRESS:', MODULE_ADDRESS);
      
      // Get basic DAO existence
      const [daoExistsRes] = await Promise.allSettled([
        safeView({
          function: `${MODULE_ADDRESS}::dao_core_file::dao_exists`,
          functionArguments: [dao.id]
        })
      ]);
      
      console.log('DAO exists check:', daoExistsRes);
      
      if (daoExistsRes.status !== 'fulfilled' || !daoExistsRes.value?.[0]) {
        throw new Error(`DAO does not exist at address: ${dao.id}`);
      }
      
      let daoCreator: string | null = null;
      console.log('🔎 Looking up DAO creator from events...');
      
      const knownMembers: CouncilMember[] = [];
      
      // Try to get initial council members from DAO creation event
      try {
        console.log('🔍 Searching for initial council members from DAO creation event...');
        const daoCreatedEvents = await aptosClient.getModuleEventsByEventType({
          eventType: `${MODULE_ADDRESS}::dao_core_file::DAOCreated`,
          minimumLedgerVersion: 0
        });
        
        // Find the creation event for this specific DAO
        const creationEvent = daoCreatedEvents.find((event: any) => 
          event.data?.movedaoaddrxess === dao.id
        );
        
        if (creationEvent) {
          console.log('✅ Found DAO creation event:', creationEvent);
          // Set creator from event data when available
          daoCreator = creationEvent.data?.creator || null;
          
          // The DAO creation event should contain initial council info
          // Let's try to get the transaction details to extract council members
          try {
            // Use transaction_version from the event to get transaction details
            const txHash = creationEvent.transaction_version as string | undefined;
            if (txHash) {
              const txnDetails = await aptosClient.getTransactionByVersion({
                ledgerVersion: Number(txHash)
              });
              
              console.log('📋 Transaction details:', txnDetails);
              
              // Try to extract initial council from transaction payload if available
              const payload = (txnDetails as any)?.payload;
              if (payload?.function?.includes('create_dao') && payload.arguments) {
                const args = payload.arguments;
                // Initial council is typically the 6th argument (index 5) in create_dao
                if (args.length > 5 && Array.isArray(args[5])) {
                  const initialCouncil = args[5] as string[];
                  console.log('✅ Found initial council from transaction:', initialCouncil);
                  
                  initialCouncil.forEach((memberAddress, index) => {
                    if (memberAddress && memberAddress.startsWith('0x')) {
                      knownMembers.push({
                        address: memberAddress,
                        addedAt: `Initial Council Member #${index + 1}`,
                        status: 'active'
                      });
                    }
                  });
                } else {
                  console.log('⚠️ No initial council found in transaction arguments');
                }
              } else {
                console.log('⚠️ Transaction payload not in expected format');
              }
            } else {
              console.warn('⚠️ No transaction version found in creation event');
            }
          } catch (txnError) {
            console.warn('⚠️ Could not extract council from transaction details:', txnError);
          }
        } else {
          console.warn('⚠️ No DAO creation event found for this DAO');
        }
      } catch (eventError) {
        console.warn('⚠️ Could not fetch DAO creation events:', eventError);
      }
      
      // If creator still unknown, try events again directly
      if (!daoCreator) {
        daoCreator = await getDaoCreatorFromEvents(dao.id);
      }

      // Always add the DAO creator if not already in the list
      if (daoCreator) {
        const isCreatorInCouncil = knownMembers.some(member => 
          member.address.toLowerCase() === daoCreator.toLowerCase()
        );
        
        if (!isCreatorInCouncil) {
          knownMembers.unshift({
            address: daoCreator,
            addedAt: 'DAO Creator',
            status: 'active'
          });
        }
        console.log('✅ DAO creator included in council list');
      }
      
      // Set council data with discovered information
      setCouncilData({
        totalMembers: knownMembers.length,
        maxMembers: 10, // Default from contract
        minMembers: 3,  // Default from contract
        members: knownMembers,
        daoCreator
      });
      
      console.log('✅ Council data set successfully:', { 
        totalMembers: knownMembers.length, 
        daoId: dao.id,
        knownMembers: knownMembers.map(m => ({ address: m.address, role: m.addedAt })),
        daoCreator
      });
    } catch (error: any) {
      console.error('Failed to fetch council data:', error);
      console.error('Error details:', {
        message: (error && (error as any).message) ? (error as any).message : String(error),
        daoId: dao.id,
        moduleAddress: MODULE_ADDRESS
      });
      // Set safe defaults
      setCouncilData({
        totalMembers: 0,
        maxMembers: 10,
        minMembers: 3,
        members: [],
        daoCreator: null
      });
    }
  };

  const fetchAdminData = async () => {
    if (!dao?.id) return;
    try {
      setIsRefreshingAdmins(true);
      
      // First check if admin system is initialized
      const adminListExistsRes = await safeView({
        function: `${MODULE_ADDRESS}::admin::exists_admin_list`,
        functionArguments: [dao.id]
      });
      
      const adminListExists = adminListExistsRes?.[0] || false;
      
      if (!adminListExists) {
        // Admin system should be automatically initialized during DAO creation
        // If it's missing, this might be an older DAO or there was an issue during creation
        console.log('Admin system not initialized for DAO:', dao.id);
        console.warn('⚠️ Admin system missing - this should be automatically initialized during DAO creation');
        
        // Check if user is DAO creator - they should have automatic admin access
        const creator = await getDaoCreatorFromEvents(dao.id) || '';
        if (creator.toLowerCase() === account?.address?.toLowerCase()) {
          // DAO creator should automatically be admin, but system isn't initialized
          // This suggests the DAO was created with an older contract version
          console.log('🔧 DAO creator detected - admin system needs manual initialization');
          
          const shouldInitialize = confirm(
            'This DAO was created before automatic admin initialization was implemented. Would you like to initialize the admin system now? (This will make you the first admin)'
          );
          if (shouldInitialize && signAndSubmitTransaction) {
            try {
              const payload = {
                function: `${MODULE_ADDRESS}::admin::init_admin`,
                typeArguments: [],
                functionArguments: ['1'], // min_super_admins = 1
              };
              const tx = await signAndSubmitTransaction({ payload } as any);
              if (tx && (tx as any).hash) {
                await aptosClient.waitForTransaction({ 
                  transactionHash: (tx as any).hash, 
                  options: { checkSuccess: true } 
                });
                alert('✅ Admin system initialized successfully! You are now the first admin of this DAO.');
                // Retry fetching admin data
                return fetchAdminData();
              }
            } catch (error) {
              console.error('Failed to initialize admin system:', error);
              alert('❌ Failed to initialize admin system: ' + (error as any).message);
            }
          } else {
            // User declined to initialize
            setAdmins([]);
            setIsAdmin(false);
            setCurrentRole('none');
            return;
          }
        } else {
          // User is not creator and admin system isn't initialized
          console.log('❌ Not DAO creator and admin system not initialized');
          setAdmins([]);
          setIsAdmin(false);
          setCurrentRole('none');
          return;
        }
      }
      
      // Determine current user's admin status and role
      if (account?.address) {
        try {
          const [isAdmRes, roleRes] = await Promise.allSettled([
            aptosClient.view({ payload: { function: `${MODULE_ADDRESS}::admin::is_admin`, functionArguments: [dao.id, account.address] } }),
            aptosClient.view({ payload: { function: `${MODULE_ADDRESS}::admin::get_admin_role`, functionArguments: [dao.id, account.address] } })
          ]);
          let adminNow = isAdmRes.status === 'fulfilled' ? Boolean(isAdmRes.value?.[0]) : false;
          
          // Fallback: Check if user is DAO creator (should have admin privileges)
          if (!adminNow) {
            const creator = await getDaoCreatorFromEvents(dao.id) || '';
            if (creator.toLowerCase() === account.address.toLowerCase()) {
              adminNow = true;
              console.log('Admin access granted: User is DAO creator');
            }
          }
          
          setIsAdmin(adminNow);
          if (adminNow && roleRes.status === 'fulfilled') {
            setCurrentRole(mapRole(Number(roleRes.value?.[0] || ROLE_SUPER_ADMIN)));
          } else if (adminNow) {
            // DAO creator gets super admin role by default
            setCurrentRole('super');
          } else {
            setCurrentRole('none');
          }
        } catch (error) {
          console.warn('Admin detection failed, checking creator fallback:', error);
          // Even if admin check fails, try DAO creator as fallback
          try {
            const creator = await getDaoCreatorFromEvents(dao.id) || '';
            if (creator.toLowerCase() === account.address.toLowerCase()) {
              setIsAdmin(true);
              setCurrentRole('super');
              console.log('Admin access granted via fallback: User is DAO creator');
            } else {
              setIsAdmin(false);
              setCurrentRole('none');
            }
          } catch {
            setIsAdmin(false);
            setCurrentRole('none');
          }
        }
      } else {
        setIsAdmin(false);
        setCurrentRole('none');
      }

      // Fetch admin list
      const addrRes = await aptosClient.view({
        payload: { function: `${MODULE_ADDRESS}::admin::get_admins`, functionArguments: [dao.id] },
      });
      const addrs: string[] = Array.isArray(addrRes?.[0]) ? addrRes[0] : (addrRes as any) || [];

      const collected: Admin[] = [];
      const batchSize = 8;
      for (let i = 0; i < addrs.length; i += batchSize) {
        const slice = addrs.slice(i, i + batchSize);
        const batch = slice.map(async (a) => {
          try {
            const [roleR, activeR] = await Promise.allSettled([
              aptosClient.view({ payload: { function: `${MODULE_ADDRESS}::admin::get_admin_role`, functionArguments: [dao.id, a] } }),
              aptosClient.view({ payload: { function: `${MODULE_ADDRESS}::admin::is_admin`, functionArguments: [dao.id, a] } }),
            ]);
            const roleNum = roleR.status === 'fulfilled' ? Number(roleR.value?.[0] || ROLE_STANDARD) : ROLE_STANDARD;
            const role = mapRole(roleNum);
            const active = activeR.status === 'fulfilled' ? Boolean(activeR.value?.[0]) : true;
            const entry: Admin = {
              address: a,
              role,
              addedAt: new Date().toLocaleDateString(), // Set current date as fallback
              expiresAt: role === 'temporary' ? 'Varies' : undefined, // Temporary roles have expiration
              status: active ? 'active' : 'expired',
            };
            collected.push(entry);
          } catch {}
        });
        await Promise.allSettled(batch);
      }

      setAdmins(collected);
    } finally {
      setIsRefreshingAdmins(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    fetchCouncilData();
  }, [dao.id, account?.address]);

  const sections = [
    { id: 'overview', label: 'Overview', icon: Shield },
    { id: 'admins', label: 'Manage Admins', icon: Users },
    { id: 'council', label: 'Council Members', icon: Crown },
    { id: 'settings', label: 'Proposal Settings', icon: Settings }
  ];

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'standard': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'temporary': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const handleAddAdmin = async () => {
    try {
      if (!account || !signAndSubmitTransaction) throw new Error('Wallet not connected');
      const addr = newAdminForm.address.trim();
      if (!addr.startsWith('0x') || addr.length < 6) {
        alert('Enter a valid admin address');
        return;
      }
      const roleNum = newAdminForm.role === 'super' ? ROLE_SUPER_ADMIN : newAdminForm.role === 'temporary' ? ROLE_TEMPORARY : ROLE_STANDARD;
      const expires_in_secs = newAdminForm.role === 'temporary' ? Math.max(300, newAdminForm.expiresInDays * 24 * 60 * 60) : 0;
      const payload = {
        function: `${MODULE_ADDRESS}::admin::add_admin`,
        typeArguments: [],
        functionArguments: [dao.id, addr, roleNum.toString(), expires_in_secs.toString()],
      };
      const tx = await signAndSubmitTransaction({ payload } as any);
      if (tx && (tx as any).hash) {
        await aptosClient.waitForTransaction({ transactionHash: (tx as any).hash, options: { checkSuccess: true } });
      }
    setShowAddAdmin(false);
    setNewAdminForm({ address: '', role: 'standard', expiresInDays: 0 });
      await fetchAdminData();
      alert('Admin added');
    } catch (e: any) {
      console.error('Add admin failed:', e);
      let errorMessage = 'Failed to add admin.';
      
      if (e?.message || e?.toString()) {
        const errorString = e.message || e.toString();
        if (errorString.includes('not_admin') || errorString.includes('not_authorized') || errorString.includes('0x1')) {
          errorMessage = 'Only existing admins can add new admins.';
        } else if (errorString.includes('already_exists') || errorString.includes('0x8')) {
          errorMessage = 'This address is already an admin.';
        } else if (errorString.includes('invalid_role') || errorString.includes('0x4')) {
          errorMessage = 'Invalid admin role specified.';
        } else if (errorString.includes('insufficient_balance')) {
          errorMessage = 'Insufficient balance to complete transaction.';
        }
      }
      
      alert(errorMessage);
    }
  };

  const handleRemoveAdmin = async (adminAddress: string) => {
    if (!account || !signAndSubmitTransaction) return;
    try {
      const payload = {
        function: `${MODULE_ADDRESS}::admin::remove_admin`,
        typeArguments: [],
        functionArguments: [dao.id, adminAddress],
      };
      const tx = await signAndSubmitTransaction({ payload } as any);
      if (tx && (tx as any).hash) {
        await aptosClient.waitForTransaction({ transactionHash: (tx as any).hash, options: { checkSuccess: true } });
      }
      await fetchAdminData();
      alert('Admin removed');
    } catch (e: any) {
      console.error('Remove admin failed:', e);
      let errorMessage = 'Failed to remove admin.';
      
      if (e?.message || e?.toString()) {
        const errorString = e.message || e.toString();
        if (errorString.includes('not_admin') || errorString.includes('not_authorized') || errorString.includes('0x1')) {
          errorMessage = 'Only admins can remove other admins.';
        } else if (errorString.includes('not_found') || errorString.includes('0x3')) {
          errorMessage = 'Admin not found or already removed.';
        } else if (errorString.includes('cannot_remove_self')) {
          errorMessage = 'Cannot remove yourself as admin.';
        } else if (errorString.includes('min_admins') || errorString.includes('last_admin')) {
          errorMessage = 'Cannot remove the last admin. Add another admin first.';
        }
      }
      
      alert(errorMessage);
    }
  };

  // Debug function to check council system status
  const debugCouncilSystem = async () => {
    try {
      console.log('=== COUNCIL SYSTEM DEBUG ===');
      console.log('DAO ID:', dao.id);
      console.log('Your address:', account?.address);

      // Check if you're an admin first
      const adminResult = await safeView({
        function: `${MODULE_ADDRESS}::admin::is_admin`,
        functionArguments: [dao.id, account?.address]
      });
      console.log('Are you admin?', adminResult?.[0]);

      // Try to get council object
      try {
        const councilObjectResult = await safeView({
          function: `${MODULE_ADDRESS}::dao_core_file::get_council_object`,
          functionArguments: [dao.id]
        });
        console.log('Council object result:', councilObjectResult);
        
        if (councilObjectResult?.[0]) {
          console.log('Council object exists, council system is initialized');
          console.log('Raw council object:', JSON.stringify(councilObjectResult[0], null, 2));
          
          // Let's try to use the legacy council functions to test if member exists
          try {
            const isMemberResult = await safeView({
              function: `${MODULE_ADDRESS}::council::is_council_member`,
              functionArguments: [dao.id, account?.address]
            });
            console.log('Are you a council member (legacy)?', isMemberResult?.[0]);
          } catch (e) {
            console.log('Legacy council check failed:', e);
          }
        }
      } catch (e) {
        console.log('Failed to get council object:', e);
        alert('Council system is not initialized for this DAO. An admin needs to call init_council() first.');
        return;
      }
    } catch (error) {
      console.log('Debug failed:', error);
    }
  };

  const handleAddCouncilMember = async () => {
    if (!account || !signAndSubmitTransaction) {
      alert('Please connect your wallet first');
      return;
    }

    const memberAddress = newCouncilMemberForm.address.trim();
    
    if (!memberAddress) {
      alert('Please enter a valid address');
      return;
    }
    
    if (!memberAddress.startsWith('0x') || memberAddress.length < 10) {
      alert('Please enter a valid Aptos address (starts with 0x and is at least 10 characters long)');
      return;
    }
    
    if (memberAddress === dao.id) {
      alert('Cannot add the DAO itself as a council member');
      return;
    }
    
    if (memberAddress === account.address) {
      alert('Cannot add yourself to the council via this form');
      return;
    }

    // Run debug checks first
    await debugCouncilSystem();
    
    // Test different parameter formats to find the right one
    console.log('=== TESTING PARAMETER FORMATS ===');

    try {
      console.log('Adding council member:', memberAddress);

      // Get the council object first
      const councilObjectResult = await safeView({
        function: `${MODULE_ADDRESS}::dao_core_file::get_council_object`,
        functionArguments: [dao.id]
      });

      const rawCouncilObject = (councilObjectResult as any)?.[0];
      if (!rawCouncilObject) {
        alert('Council object not found.');
        return;
      }

      console.log('Using council object:', rawCouncilObject);
      
      // Test multiple parameter formats to see which one works
      console.log('=== TESTING DIFFERENT PARAMETER FORMATS ===');
      
      // Format 1: Pass the full object as received
      const format1Payload = {
        function: `${MODULE_ADDRESS}::council::add_council_member_to_object`,
        functionArguments: [dao.id, rawCouncilObject, memberAddress]
      };
      
      // Format 2: Pass the inner address as string
      const format2Payload = {
        function: `${MODULE_ADDRESS}::council::add_council_member_to_object`,
        functionArguments: [dao.id, rawCouncilObject.inner, memberAddress]
      };

      // Format 3: Try legacy method
      const format3Payload = {
        function: `${MODULE_ADDRESS}::council::add_council_member`,
        functionArguments: [memberAddress]
      };

      console.log('Format 1 (full object):', format1Payload);
      console.log('Format 2 (inner address):', format2Payload);
      console.log('Format 3 (legacy):', format3Payload);

      // Ask user which format to try
      const formatChoice = confirm(
        'Simulation might fail. Choose format to test:\n\n' +
        'OK = Try Format 1 (full object)\n' +
        'Cancel = Try Format 2 (inner address only)'
      );

      const payloadToUse = formatChoice ? format1Payload : format2Payload;
      
      console.log('Using payload format:', formatChoice ? 'Format 1' : 'Format 2');
      console.log('Final payload:', payloadToUse);

      // Show a warning before submitting
      const proceed = confirm(
        'About to submit transaction. This may show simulation error but could still work.\n\n' +
        'Parameters:\n' +
        `DAO: ${dao.id}\n` +
        `Council: ${formatChoice ? 'Full Object' : rawCouncilObject.inner}\n` +
        `Member: ${memberAddress}\n\n` +
        'Continue?'
      );

      if (!proceed) {
        console.log('User cancelled transaction');
        return;
      }

      const transaction = await signAndSubmitTransaction({ 
        payload: payloadToUse as any
      });
      
      console.log('Transaction submitted:', transaction);

      if (transaction && (transaction as any).hash) {
        console.log('Transaction hash:', (transaction as any).hash);
        
        // Wait for transaction but don't check success initially
        try {
          await aptosClient.waitForTransaction({
            transactionHash: (transaction as any).hash,
            options: { checkSuccess: true }
          });
          
          alert('Council member added successfully!');
          
          // Refresh council data
          await fetchCouncilData();
          
          // Close form and reset
          setShowAddCouncilMember(false);
          setNewCouncilMemberForm({ address: '' });
        } catch (waitError) {
          console.log('Transaction wait error:', waitError);
          alert('Transaction submitted but confirmation failed. Check the blockchain explorer to verify.');
        }
      }


    } catch (error: any) {
      console.error('Failed to add council member:', error);
      
      let errorMessage = 'Failed to add council member';
      if (error?.message) {
        if (error.message.includes('User rejected')) {
          errorMessage = 'Transaction cancelled by user';
        } else if (error.message.includes('MISSING_DATA') || error.message.includes('council_not_found')) {
          errorMessage = 'Council system not initialized. The DAO admin needs to initialize the council first using init_council().';
        } else if (error.message.includes('not_admin') || error.message.includes('unauthorized')) {
          errorMessage = 'Only DAO admins can add council members';
        } else if (error.message.includes('already_member')) {
          errorMessage = 'This address is already a council member';
        } else if (error.message.includes('max_members')) {
          errorMessage = 'Council has reached maximum member limit';
        } else if (error.message.includes('invalid_address')) {
          errorMessage = 'Invalid member address provided';
        } else if (error.message.includes('simulation')) {
          errorMessage = 'Transaction simulation failed. The council may not be initialized, or you may not have admin permissions.';
        } else {
          errorMessage = `Failed to add council member: ${error.message}`;
        }
      }
      
      alert(errorMessage);
    }
  };

  const handleRemoveCouncilMember = async (memberAddress: string) => {
    if (!account || !signAndSubmitTransaction) {
      alert('Please connect your wallet first');
      return;
    }

    if (!confirm(`Are you sure you want to remove ${shortAddr(memberAddress)} from the council?`)) {
      return;
    }

    try {
      console.log('Removing council member:', memberAddress);

      // Step 1: Get the council object for this DAO
      const councilObjectResult = await safeView({
        function: `${MODULE_ADDRESS}::dao_core_file::get_council_object`,
        functionArguments: [dao.id]
      });

      console.log('Council object result:', councilObjectResult);
      const rawCouncilObject = (councilObjectResult as any)?.[0];

      if (!rawCouncilObject) {
        alert('Council object not found. The council system may not be initialized for this DAO.');
        return;
      }

      // Step 2: Remove the council member using the object-based function
      // Note: Pass the full council object as received from the contract
      const payload = {
        function: `${MODULE_ADDRESS}::council::remove_council_member_from_object`,
        functionArguments: [dao.id, rawCouncilObject, memberAddress]
      };

      console.log('Submitting remove council member transaction with payload:', payload);

      const transaction = await signAndSubmitTransaction({ payload: payload as any });
      console.log('Transaction submitted:', transaction);

      if (transaction && (transaction as any).hash) {
        await aptosClient.waitForTransaction({
          transactionHash: (transaction as any).hash,
          options: { checkSuccess: true }
        });
        
        alert('Council member removed successfully!');
        
        // Refresh council data
        await fetchCouncilData();
      }

    } catch (error: any) {
      console.error('Failed to remove council member:', error);
      
      let errorMessage = 'Failed to remove council member';
      if (error?.message) {
        if (error.message.includes('User rejected')) {
          errorMessage = 'Transaction cancelled by user';
        } else if (error.message.includes('not_admin') || error.message.includes('unauthorized')) {
          errorMessage = 'Only DAO admins can remove council members';
        } else if (error.message.includes('not_member')) {
          errorMessage = 'This address is not a council member';
        } else if (error.message.includes('min_members')) {
          errorMessage = 'Cannot remove member: Council would have too few members';
        } else if (error.message.includes('cannot_remove_creator')) {
          errorMessage = 'Cannot remove the DAO creator from the council';
        } else {
          errorMessage = `Failed to remove council member: ${error.message}`;
        }
      }
      
      alert(errorMessage);
    }
  };

  const checkCouncilMembership = async () => {
    const address = checkMemberForm.address.trim();
    if (!address.startsWith('0x') || address.length < 6) {
      alert('Please enter a valid address');
      return;
    }

    setCheckMemberForm(prev => ({ ...prev, isChecking: true, result: null }));

    try {
      // Unfortunately, the contract's council functions are not marked as #[view] functions
      // So we can't directly query council membership from the frontend
      // This is a limitation that needs to be fixed in the smart contract
      
      alert('Council membership verification is currently unavailable due to contract limitations. The council functions are not marked as view functions in the smart contract.');
      setCheckMemberForm(prev => ({ ...prev, result: null }));

    } catch (error) {
      console.error('Council membership check failed:', error);
      alert('Failed to check membership: ' + (error as any).message);
    } finally {
      setCheckMemberForm(prev => ({ ...prev, isChecking: false }));
    }
  };

  // Fetch current stake settings
  const fetchStakeSettings = async () => {
    try {
      setStakeSettings(prev => ({ ...prev, isLoading: true }));
      
      console.log('🔄 Fetching stake settings for DAO:', dao.id);
      
      const [minStakeToJoinRes, minStakeToProposalRes] = await Promise.allSettled([
        aptosClient.view({ 
          payload: { 
            function: `${MODULE_ADDRESS}::membership::get_min_stake`, 
            functionArguments: [dao.id] 
          } 
        }),
        aptosClient.view({ 
          payload: { 
            function: `${MODULE_ADDRESS}::membership::get_min_proposal_stake`, 
            functionArguments: [dao.id] 
          } 
        })
      ]);

      // Debug the raw values
      const rawMinStakeToJoin = Number(minStakeToJoinRes.status === 'fulfilled' ? minStakeToJoinRes.value[0] || 0 : 0);
      const rawMinStakeToPropose = Number(minStakeToProposalRes.status === 'fulfilled' ? minStakeToProposalRes.value[0] || 0 : 0);
      
      console.log('📊 Raw stakes from contract:', { rawMinStakeToJoin, rawMinStakeToPropose });
      
      const minStakeToJoin = rawMinStakeToJoin > 0 ? toMOVE(rawMinStakeToJoin) : 0;
      const minStakeToPropose = rawMinStakeToPropose > 0 ? toMOVE(rawMinStakeToPropose) : 0;
      
      console.log('💰 Converted stakes:', { minStakeToJoin, minStakeToPropose, usingDecimals: MEMBERSHIP_DECIMALS });

      setStakeSettings({
        minStakeToJoin,
        minStakeToPropose,
        isLoading: false
      });

      setNewStakeForm({
        minStakeToJoin,
        minStakeToPropose
      });
      setNewMinStake(minStakeToJoin.toString());
      setNewMinProposalStake(minStakeToPropose.toString());

    } catch (error) {
      console.error('Failed to fetch stake settings:', error);
      setStakeSettings(prev => ({ ...prev, isLoading: false }));
    }
  };


  // Update minimum stake to join
  const handleUpdateMinStake = async () => {
    try {
      if (!account || !signAndSubmitTransaction) throw new Error('Wallet not connected');
      
      const raw = parseFloat(newMinStake);
      if (!Number.isFinite(raw) || raw < 0.1) {
        setErrors({ ...errors, minStake: 'Minimum stake must be at least 0.1 MOVE' });
        return;
      }
      if (raw > 10000) {
        setErrors({ ...errors, minStake: 'Maximum stake cannot exceed 10,000 MOVE' });
        return;
      }
      
      const amountOctas = fromMOVE(raw);
      if (amountOctas === 0) {
        setErrors({ ...errors, minStake: 'Amount too small' });
        return;
      }
      
      const payload = {
        function: `${MODULE_ADDRESS}::membership::update_min_stake`,
        typeArguments: [],
        functionArguments: [dao.id, amountOctas.toString()],
      };
      
      const tx = await signAndSubmitTransaction({ payload } as any);
      if (tx && (tx as any).hash) {
        await aptosClient.waitForTransaction({ 
          transactionHash: (tx as any).hash, 
          options: { checkSuccess: true } 
        });
      }
      
      await fetchStakeSettings();
      setErrors({ ...errors, minStake: '' });
    } catch (error: any) {
      console.error('Update min stake failed:', error);
      setErrors({ ...errors, minStake: 'Failed to update minimum stake' });
    }
  };

  // Update minimum proposal stake
  const handleUpdateMinProposalStake = async () => {
    try {
      if (!account || !signAndSubmitTransaction) throw new Error('Wallet not connected');
      
      const raw = parseFloat(newMinProposalStake);
      if (!Number.isFinite(raw) || raw < 0.1) {
        setErrors({ ...errors, minProposalStake: 'Minimum proposal stake must be at least 0.1 MOVE' });
        return;
      }
      if (raw > 10000) {
        setErrors({ ...errors, minProposalStake: 'Maximum proposal stake cannot exceed 10,000 MOVE' });
        return;
      }
      
      // CONTRACT CONSTRAINT: Proposal stake must be >= join stake
      if (raw < stakeSettings.minStakeToJoin) {
        setErrors({ 
          ...errors, 
          minProposalStake: `Proposal stake must be at least ${stakeSettings.minStakeToJoin} MOVE (equal to or greater than current join stake)` 
        });
        return;
      }
      
      const amountOctas = fromMOVE(raw);
      if (amountOctas === 0) {
        setErrors({ ...errors, minProposalStake: 'Amount too small' });
        return;
      }
      
      // Debug: Log all values before transaction
      console.log('🐛 DEBUG: About to update proposal stake');
      console.log('📊 Input value (MOVE):', raw);
      console.log('🔢 Converted value (contract format):', amountOctas);
      console.log('📍 DAO Address:', dao.id);
      console.log('🏛️ Current min stake to join:', stakeSettings.minStakeToJoin);
      console.log('💰 Current min stake to propose:', stakeSettings.minStakeToPropose);
      console.log('🔍 Is new value >= join stake?', amountOctas >= (stakeSettings.minStakeToJoin * MEMBERSHIP_DECIMALS));
      
      const payload = {
        function: `${MODULE_ADDRESS}::membership::update_min_proposal_stake`,
        typeArguments: [],
        functionArguments: [dao.id, amountOctas.toString()],
      };
      
      console.log('📦 Transaction payload:', JSON.stringify(payload, null, 2));
      
      const tx = await signAndSubmitTransaction({ payload } as any);
      if (tx && (tx as any).hash) {
        await aptosClient.waitForTransaction({ 
          transactionHash: (tx as any).hash, 
          options: { checkSuccess: true } 
        });
      }
      
      await fetchStakeSettings();
      setErrors({ ...errors, minProposalStake: '' });
    } catch (error: any) {
      console.error('Update min proposal stake failed:', error);
      let errorMessage = 'Failed to update minimum proposal stake';
      
      // Provide more specific error messages based on contract validation
      if (error?.message || error?.toString()) {
        const errorString = error.message || error.toString();
        if (errorString.includes('0x4') || errorString.includes('invalid_amount')) {
          errorMessage = 'Invalid amount. Proposal stake must be at least equal to current join stake.';
        } else if (errorString.includes('not_admin') || errorString.includes('0x1')) {
          errorMessage = 'Only DAO admins can update stake requirements.';
        }
      }
      
      setErrors({ ...errors, minProposalStake: errorMessage });
    }
  };

  // Update both stake requirements at once
  const handleUpdateBothStakes = async () => {
    if (!account || !signAndSubmitTransaction) {
      alert('Please connect your wallet');
      return;
    }

    // Validate inputs
    if (newStakeForm.minStakeToJoin < 6) {
      alert('Membership stake cannot be less than 6 MOVE (contract requirement)');
      return;
    }
    if (newStakeForm.minStakeToJoin > 10000) {
      alert('Membership stake cannot exceed 10,000 MOVE');
      return;
    }

    if (newStakeForm.minStakeToPropose < newStakeForm.minStakeToJoin) {
      alert(`Proposal stake cannot be less than ${newStakeForm.minStakeToJoin} MOVE (must be equal to or greater than membership stake)`);
      return;
    }
    if (newStakeForm.minStakeToPropose > 10000) {
      alert('Proposal stake cannot exceed 10,000 MOVE');
      return;
    }

    if (newStakeForm.minStakeToPropose < newStakeForm.minStakeToJoin) {
      alert('Proposal creation stake should be equal to or greater than membership stake');
      return;
    }

    try {
      // Update membership stake first
      const membershipStakeInOctas = fromMOVE(newStakeForm.minStakeToJoin);
      const membershipPayload = {
        function: `${MODULE_ADDRESS}::membership::update_min_stake`,
        typeArguments: [],
        functionArguments: [
          dao.id,
          membershipStakeInOctas.toString()
        ]
      };

      await signAndSubmitTransaction({ payload: membershipPayload } as any);
      console.log('Updated membership stake');

      // Update proposal stake
      const proposalStakeInOctas = fromMOVE(newStakeForm.minStakeToPropose);
      const proposalPayload = {
        function: `${MODULE_ADDRESS}::membership::update_min_proposal_stake`,
        typeArguments: [],
        functionArguments: [
          dao.id,
          proposalStakeInOctas.toString()
        ]
      };

      await signAndSubmitTransaction({ payload: proposalPayload } as any);
      console.log('Updated proposal stake');
      
      await fetchStakeSettings();
      setShowEditStake(false);
      alert('Stake requirements updated successfully!');
    } catch (error: any) {
      console.error('Failed to update stake requirements:', error);
      
      let errorMessage = 'Failed to update stake requirements.';
      if (error?.message || error?.toString()) {
        const errorString = error.message || error.toString();
        if (errorString.includes('not_admin') || errorString.includes('0x1')) {
          errorMessage = 'Only DAO admins can update stake requirements.';
        } else if (errorString.includes('invalid_amount') || errorString.includes('0x4')) {
          errorMessage = 'Invalid stake amount. Please check your values and try again.';
        }
      }
      
      alert(errorMessage);
    }
  };

  // useEffect to fetch stake settings on component mount
  useEffect(() => {
    fetchStakeSettings();
  }, [dao.id]);

  const renderOverview = () => {
    // Check if admin system is initialized
    if (admins.length === 0 && !isAdmin) {
      return (
        <div className="space-y-6">
          <div className="professional-card rounded-xl p-6 text-center">
            <div className="w-16 h-16 bg-yellow-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-yellow-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Admin System Not Initialized</h3>
            <p className="text-gray-400 mb-4">
              This DAO was created before automatic admin initialization was implemented. The admin system is required for proper DAO governance and management.
            </p>
            {account?.address && (
              <button
                onClick={fetchAdminData}
                className="btn-primary flex items-center justify-center space-x-2 mx-auto"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Check & Initialize Admin System</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
    <div className="space-y-6">
      {/* Admin Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="professional-card rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Admins</p>
              <p className="text-2xl font-bold text-white">{admins.length}</p>
            </div>
            <Shield className="w-8 h-8 text-purple-400" />
          </div>
        </div>
        
        <div className="professional-card rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Super Admins</p>
              <p className="text-2xl font-bold text-white">{admins.filter(a => a.role === 'super').length}</p>
            </div>
            <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-400" />
            </div>
          </div>
        </div>
        
        <div className="professional-card rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Standard</p>
              <p className="text-2xl font-bold text-white">{admins.filter(a => a.role === 'standard').length}</p>
            </div>
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
          </div>
        </div>
        
        <div className="professional-card rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Temporary</p>
              <p className="text-2xl font-bold text-white">{admins.filter(a => a.role === 'temporary').length}</p>
            </div>
            <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Current User Info */}
      <div className="professional-card rounded-xl p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <FaCheckCircle className="w-5 h-5 text-green-400" />
          <span>Your Admin Status</span>
        </h3>
        
        <div className="bg-white/5 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                {(account?.address || '0x').slice(2, 4).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-white break-all">{account?.address || '-'}</p>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoleColor(isAdmin ? (currentRole === 'none' ? 'standard' : currentRole) : 'temporary')}`}>
                  {isAdmin ? (currentRole === 'none' ? 'Admin' : `${currentRole.charAt(0).toUpperCase() + currentRole.slice(1)} Admin`) : 'Not Admin'}
                </span>
              </div>
            </div>
            <div className="text-green-400 self-start sm:self-center">
              <FaCheckCircle className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Admin Rules */}
      <div className="professional-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          <span>Admin Rules & Permissions</span>
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-start space-x-3 p-3 bg-white/5 rounded-lg">
            <Shield className="w-5 h-5 text-red-400 mt-0.5" />
            <div>
              <p className="text-white font-medium">Super Admins (Role 255)</p>
              <p className="text-sm text-gray-400">Can manage all admin roles, add/remove any admin, permanent access. DAO creators automatically become super admins.</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3 p-3 bg-white/5 rounded-lg">
            <Users className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <p className="text-white font-medium">Standard Admins (Role 100)</p>
              <p className="text-sm text-gray-400">Can perform most admin functions, cannot manage super admins. Can add standard/temporary admins.</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3 p-3 bg-white/5 rounded-lg">
            <Clock className="w-5 h-5 text-yellow-400 mt-0.5" />
            <div>
              <p className="text-white font-medium">Temporary Admins (Role 50)</p>
              <p className="text-sm text-gray-400">Limited time access with expiration date. Automatically expires after set duration (minimum 5 minutes).</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    );
  };

  const renderAdminManagement = () => (
    <div className="space-y-6">
      {/* Add Admin Button */}
      {isAdmin && (
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <h3 className="text-lg font-semibold text-white">Admin Management</h3>
          <button onClick={() => setShowAddAdmin(true)} className="btn-primary flex items-center justify-center space-x-2 w-full sm:w-auto">
            <Plus className="w-4 h-4" />
            <span>Add Admin</span>
          </button>
        </div>
      )}
      {/* Add Admin Form */}
      {showAddAdmin && (
        <div className="professional-card rounded-xl p-4 sm:p-6">
          <h4 className="text-lg font-semibold text-white mb-4">Add New Admin</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Admin Address</label>
              <input type="text" value={newAdminForm.address} onChange={(e) => setNewAdminForm({ ...newAdminForm, address: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="0x..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Admin Role</label>
              <select value={newAdminForm.role} onChange={(e) => setNewAdminForm({ ...newAdminForm, role: e.target.value as any })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="standard">Standard Admin</option>
                <option value="temporary">Temporary Admin</option>
                {currentRole === 'super' && <option value="super">Super Admin</option>}
              </select>
            </div>
            {newAdminForm.role === 'temporary' && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Expires in (days)</label>
                <input type="number" value={newAdminForm.expiresInDays} onChange={(e) => setNewAdminForm({ ...newAdminForm, expiresInDays: parseInt(e.target.value) })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="7" min="1" />
                <p className="text-xs text-gray-500 mt-1">Minimum 5 minutes required by contract</p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
              <button onClick={handleAddAdmin} className="btn-primary flex-1 w-full sm:w-auto">Add Admin</button>
              <button onClick={() => setShowAddAdmin(false)} className="px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl transition-all w-full sm:w-auto">Cancel</button>
            </div>
          </div>
        </div>
      )}
      {/* Admins List */}
      <div className="professional-card rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-lg font-semibold text-white">Current Admins</h4>
          <div className="text-sm text-gray-400">{admins.length} admins</div>
          <button onClick={fetchAdminData} title="Refresh" className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg">
            <RefreshCw className={`w-4 h-4 ${isRefreshingAdmins ? 'animate-spin' : ''}`} />
          </button>
          </div>
        {/* Admin Table - Desktop */}
        <div className="hidden sm:block w-full min-w-0 p-0 m-0">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-4 px-4 font-medium text-gray-300">Admin</th>
                <th className="text-left py-4 px-4 font-medium text-gray-300">Role</th>
                <th className="text-left py-4 px-4 font-medium text-gray-300">Status</th>
                <th className="text-left py-4 px-4 font-medium text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin, index) => (
                <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-all">
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">{admin.address.slice(2, 4).toUpperCase()}</div>
                      <div>
                        <p className="font-medium text-white">{shortAddr(admin.address)}</p>
                        <p className="text-sm text-gray-400">Admin #{index + 1}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoleColor(admin.role)}`}>{admin.role.charAt(0).toUpperCase() + admin.role.slice(1)}</span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${admin.status === 'active' ? 'bg-green-400' : 'bg-red-400'}`} />
                      <span className={`text-sm ${admin.status === 'active' ? 'text-green-400' : 'text-red-400'}`}>{admin.status.charAt(0).toUpperCase() + admin.status.slice(1)}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    {isAdmin && admin.address !== account?.address && (
                      <button onClick={() => handleRemoveAdmin(admin.address)} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all" title="Remove Admin">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Card layout for mobile */}
        <div className="sm:hidden space-y-4">
          {admins.map((admin, index) => (
            <div key={index} className="bg-white/5 rounded-xl p-4 flex flex-col space-y-3 shadow border border-white/10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">{admin.address.slice(2, 4).toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white break-all">{admin.address}</p>
                  <p className="text-xs text-gray-400">Admin #{index + 1}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${admin.status === 'active' ? 'bg-green-400' : 'bg-red-400'}`} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">Role:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(admin.role)}`}>{admin.role.charAt(0).toUpperCase() + admin.role.slice(1)}</span>
                </div>
                </div>
              <div className="flex justify-end">
                {isAdmin && admin.address !== account?.address && (
                  <button onClick={() => handleRemoveAdmin(admin.address)} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    );
  

  const renderCouncilManagement = () => {
    return (
    <div className="space-y-6">
      {/* Add Council Member Button */}
      {/* This section is not directly tied to the admin::add_admin functionality,
          so it remains as is, but the add/remove logic for council members
          is still using object-based functions, which are not directly
          tied to the admin::add_admin. This might need further refinement
          depending on the exact council management flow. */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h3 className="text-lg font-semibold text-white">Council Management</h3>
          <p className="text-sm text-gray-400">Manage trusted DAO members with special governance roles</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={debugCouncilSystem}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl transition-all flex items-center space-x-2"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Debug</span>
          </button>
          <button
            onClick={() => setShowAddCouncilMember(true)}
            className="flex items-center justify-center space-x-2 w-full sm:w-auto"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '2px',
              border: 'none',
              background: 'linear-gradient(45deg, #ffc30d, #b80af7)',
              borderRadius: '16px',
              height: '36px',
              minWidth: '0',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              color: '#fff',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#121212',
                borderRadius: '14px',
                padding: '0 10px',
                height: '32px',
                minWidth: '0',
                overflow: 'hidden',
                width: '100%',
              }}
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Council Member</span>
            </div>
          </button>
        </div>
        </div>

      {/* Council Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="professional-card rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Members</p>
              <p className="text-2xl font-bold text-white">{councilData.totalMembers}</p>
            </div>
            <Crown className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
        
        <div className="professional-card rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Available Slots</p>
              <p className="text-2xl font-bold text-white">{councilData.maxMembers - councilData.totalMembers}</p>
            </div>
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Plus className="w-5 h-5 text-green-400" />
            </div>
          </div>
        </div>
        
        <div className="professional-card rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Min Required</p>
              <p className="text-2xl font-bold text-white">{councilData.minMembers}</p>
            </div>
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Add Council Member Form */}
      {showAddCouncilMember && (
        <div className="professional-card rounded-xl p-4 sm:p-6">
          <h4 className="text-lg font-semibold text-white mb-4">Add New Council Member</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Member Address</label>
              <input
                type="text"
                value={newCouncilMemberForm.address}
                onChange={(e) => setNewCouncilMemberForm({ ...newCouncilMemberForm, address: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="0x..."
              />
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
              <button
                onClick={handleAddCouncilMember}
                className="btn-primary flex-1 w-full sm:w-auto"
              >
                Add Council Member
              </button>
              <button
                onClick={() => setShowAddCouncilMember(false)}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl transition-all w-full sm:w-auto"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Council Members List */}
      <div className="professional-card rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-lg font-semibold text-white">Council Members</h4>
          <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-400">
              {councilData.totalMembers} members
            </div>
            <button 
              onClick={fetchCouncilData} 
              title="Refresh Council Data" 
              className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {councilData.totalMembers > 0 ? (
          <div className="space-y-6">
            {/* Known Members List */}
            {councilData.members.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-white">Known Council Members</h4>
                <div className="space-y-2">
              {councilData.members.map((member, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-yellow-500/20 to-orange-600/20 rounded-full flex items-center justify-center">
                          <Crown className="w-4 h-4 text-yellow-400" />
                      </div>
                      <div>
                          <p className="text-white font-mono text-sm">{shortAddr(member.address)}</p>
                          <p className="text-xs text-gray-400">{member.addedAt}</p>
                          {member.address.toLowerCase() === councilData.daoCreator?.toLowerCase() && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 mt-1">
                              <Crown className="w-3 h-3 mr-1" />
                              Creator
                            </span>
                          )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-lg border border-green-500/30">
                          Active
                      </span>
                        {isAdmin && member.address !== councilData.daoCreator && (
                      <button
                        onClick={() => handleRemoveCouncilMember(member.address)}
                            className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded"
                        title="Remove Council Member"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}
                      </div>
                    </div>
              ))}
        </div>
              </div>
            )}
            
            {/* Stats and Check Tool */}
            <div className="bg-gradient-to-br from-blue-500/10 to-purple-600/10 rounded-xl p-6 border border-blue-500/20">
              <div className="flex items-center space-x-2 mb-4">
                <Crown className="w-6 h-6 text-yellow-400" />
                <h4 className="text-lg font-semibold text-white">Council Overview</h4>
                </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{councilData.totalMembers}</p>
                  <p className="text-sm text-gray-400">Total Members</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{councilData.members.length}</p>
                  <p className="text-sm text-gray-400">Known Members</p>
                </div>
              </div>
              
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-blue-400" />
                  <span className="text-blue-400 font-medium">Council Information Discovery</span>
                </div>
                <p className="text-blue-200 text-sm">
                  The system automatically discovers initial council members from the DAO creation transaction. 
                  Council members displayed above were specified during DAO creation and are active in governance.
                </p>
                {councilData.members.length > 1 && (
                  <p className="text-green-200 text-sm mt-2">
                    ✅ Found {councilData.members.length} council members from DAO creation records.
                  </p>
                )}
                </div>
              </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-500/20 to-gray-600/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Council Members</h3>
            <p className="text-gray-400 mb-4">
              This DAO currently has no council members. Add trusted members to help with governance decisions.
            </p>
                  <button
              onClick={() => setShowAddCouncilMember(true)}
              className="btn-primary flex items-center justify-center space-x-2 mx-auto"
                  >
              <UserPlus className="w-4 h-4" />
              <span>Add First Council Member</span>
                  </button>
          </div>
                )}
      </div>

      {/* Council Info */}
      <div className="professional-card rounded-xl p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          <span>Council Information</span>
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-start space-x-3 p-3 bg-white/5 rounded-lg">
            <Crown className="w-5 h-5 text-yellow-400 mt-0.5" />
            <div>
              <p className="text-white font-medium">Object-Based System</p>
              <p className="text-sm text-gray-400">Council management uses Aptos Objects for enhanced security and efficiency</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3 p-3 bg-white/5 rounded-lg">
            <UserCheck className="w-5 h-5 text-green-400 mt-0.5" />
            <div>
              <p className="text-white font-medium">Initialization Required</p>
              <p className="text-sm text-gray-400">Council must be initialized with init_council() before members can be added</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3 p-3 bg-white/5 rounded-lg">
            <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <p className="text-white font-medium">Admin Required</p>
              <p className="text-sm text-gray-400">Only admins can add or remove council members using object-based functions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Council Information & Contract Limitations */}
      <div className="professional-card rounded-xl p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          <span>Council System Information</span>
        </h3>
        
        <div className="space-y-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <XCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-400 font-medium">Contract Limitation</span>
            </div>
            <p className="text-red-200 text-sm mb-3">
              The smart contract's council functions (<code>get_member_count_from_object</code> and <code>is_council_member_in_object</code>) 
              are not marked as <code>#[view]</code> functions, making them inaccessible from the frontend.
            </p>
            <p className="text-red-200 text-sm">
              <strong>Impact:</strong> We can only display the DAO creator as a known initial council member. 
              Additional council members exist but cannot be enumerated or verified through the UI.
            </p>
          </div>
          
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <UserCheck className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-400 font-medium">Recommended Solution</span>
            </div>
            <p className="text-yellow-200 text-sm">
              To fix this, the smart contract needs to be updated to add <code>#[view]</code> attributes to the 
              council functions. This would allow the frontend to properly query council membership and display 
              all members.
            </p>
          </div>
          
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <FaCheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-medium">What Still Works</span>
            </div>
            <ul className="text-green-200 text-sm space-y-1">
              <li>• DAO creator is automatically shown as initial council member</li>
              <li>• Admin functions for adding/removing council members work via transactions</li>
              <li>• Council system operates correctly on-chain</li>
              <li>• Object-based council storage provides security and efficiency benefits</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    );
  };

  const renderProposalSettings = () => {
    return (
      <div className="space-y-6">
      {/* Current Stake Settings */}
      <div className="professional-card rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            <span>Current Stake Requirements</span>
          </h3>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchStakeSettings}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setShowEditStake(true)}
              className="flex items-center space-x-2"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '2px',
                border: 'none',
                background: 'linear-gradient(45deg, #ffc30d, #b80af7)',
                borderRadius: '16px',
                height: '36px',
                minWidth: '0',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                color: '#fff',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#121212',
                  borderRadius: '14px',
                  padding: '0 10px',
                  height: '32px',
                  minWidth: '0',
                  overflow: 'hidden',
                  width: '100%',
                }}
              >
                <Edit className="w-4 h-4" />
                <span>Edit Settings</span>
              </div>
            </button>
          </div>
        </div>

        {stakeSettings.isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading stake requirements...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="text-white font-medium text-sm">Membership</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-300">
                    {stakeSettings.minStakeToJoin} MOVE
                  </div>
                  <div className="text-xs text-gray-400">Required to join</div>
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Settings className="w-4 h-4 text-green-400" />
                  <span className="text-white font-medium text-sm">Proposals</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-300">
                    {stakeSettings.minStakeToPropose} MOVE
                  </div>
                  <div className="text-xs text-gray-400">Required to propose</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Stake Settings Form */}
      {showEditStake && (
        <div className="professional-card rounded-xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white flex items-center space-x-2">
              <Edit className="w-5 h-5 text-purple-400" />
              <span>Update Stake Requirements</span>
            </h4>
            <button
              onClick={() => {
                setShowEditStake(false);
                setNewStakeForm({
                  minStakeToJoin: stakeSettings.minStakeToJoin,
                  minStakeToPropose: stakeSettings.minStakeToPropose
                });
                setNewMinStake(stakeSettings.minStakeToJoin.toString());
                setNewMinProposalStake(stakeSettings.minStakeToPropose.toString());
                setErrors({});
              }}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Membership Stake */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Membership Stake (MOVE)
                </label>
                <input
                  type="text"
                  value={newMinStake}
                  onChange={(e) => setNewMinStake(e.target.value)}
                  className="professional-input w-full px-3 py-2 rounded-lg text-sm"
                  placeholder="0.1 - 10,000 MOVE"
                />
                {errors.minStake && <p className="text-red-400 text-xs">{errors.minStake}</p>}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Current: {stakeSettings.minStakeToJoin} MOVE</span>
                  <span>Required to join DAO</span>
                </div>
              </div>

              {/* Proposal Stake */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Proposal Stake (MOVE)
                </label>
                <input
                  type="text"
                  value={newMinProposalStake}
                  onChange={(e) => setNewMinProposalStake(e.target.value)}
                  className="professional-input w-full px-3 py-2 rounded-lg text-sm"
                  placeholder={`Min ${stakeSettings.minStakeToJoin} MOVE`}
                />
                {errors.minProposalStake && <p className="text-red-400 text-xs">{errors.minProposalStake}</p>}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Current: {stakeSettings.minStakeToPropose} MOVE</span>
                  <span>Required to create proposals</span>
                </div>
              </div>
            </div>

            {/* Validation Warning */}
            {newStakeForm.minStakeToPropose < newStakeForm.minStakeToJoin && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400 text-sm font-medium">Proposal stake must be ≥ membership stake</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleUpdateBothStakes}
                className="flex-1 flex items-center justify-center space-x-2"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '2px',
                  border: 'none',
                  background: 'linear-gradient(45deg, #ffc30d, #b80af7)',
                  borderRadius: '16px',
                  height: '36px',
                  minWidth: '0',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px',
                  color: '#fff',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#121212',
                    borderRadius: '14px',
                    padding: '0 10px',
                    height: '32px',
                    minWidth: '0',
                    overflow: 'hidden',
                    width: '100%',
                  }}
                >
                  <Settings className="w-4 h-4" />
                  <span>Update Both</span>
                </div>
              </button>
              <button
                onClick={handleUpdateMinStake}
                disabled={!newMinStake}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all"
              >
                Update Join
              </button>
              <button
                onClick={handleUpdateMinProposalStake}
                disabled={!newMinProposalStake}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all"
              >
                Update Proposals
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white/5 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-white text-sm font-medium">Membership</span>
          </div>
          <p className="text-xs text-gray-400">Required to join DAO and vote</p>
        </div>
        
        <div className="bg-white/5 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <Settings className="w-4 h-4 text-green-400" />
            <span className="text-white text-sm font-medium">Proposals</span>
          </div>
          <p className="text-xs text-gray-400">Required to create governance proposals</p>
        </div>
        
        <div className="bg-white/5 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <Shield className="w-4 h-4 text-purple-400" />
            <span className="text-white text-sm font-medium">Admins</span>
          </div>
          <p className="text-xs text-gray-400">Can create proposals regardless of stake</p>
        </div>
        
        <div className="bg-white/5 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <DollarSign className="w-4 h-4 text-yellow-400" />
            <span className="text-white text-sm font-medium">Dynamic</span>
          </div>
          <p className="text-xs text-gray-400">Requirements can be updated anytime</p>
        </div>
      </div>
    </div>
    );
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return renderOverview();
      case 'admins':
        return renderAdminManagement();
      case 'council':
        return renderCouncilManagement();
      case 'settings':
        return renderProposalSettings();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="w-full px-3 sm:px-6 space-y-4 sm:space-y-6">
      {/* Navigation */}
      <div className="flex flex-wrap gap-1 bg-white/5 rounded-lg p-1">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md font-medium transition-all text-sm ${
                isActive
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : ''}`} />
              <span className="hidden sm:inline">{section.label}</span>
              <span className="sm:hidden">{section.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
};

export default DAOAdmin;