import React, { useState, useEffect } from 'react';
import { Edit3, Settings, X, AlertCircle, Loader2, Users, FileText, Calendar, Check, Crown } from 'lucide-react';
import { useWallet } from '@razorlabs/razorkit';
import {
  useCreateProfile,
  useUpdateProfile,
  useGetProfile,
  useProfileExists,
  getDisplayNameOrAddress,
  getAvatarUrlOrDefault
} from '../../useServices/useProfile';
import { useUserDAOs } from '../../useServices/useUserDAOs';

interface UserProfileProps {
  className?: string;
}

const UserProfile: React.FC<UserProfileProps> = ({ className = '' }) => {
  const { account } = useWallet();

  // Helper function to convert binary data to image URL
  const getImageUrl = (logo: any) => {
    if (!logo) return null;
    
    if (logo.is_url && logo.url) {
      return logo.url;
    }
    
    if (!logo.is_url && logo.data && Array.isArray(logo.data) && logo.data.length > 0) {
      try {
        // Convert uint8 array to blob and create object URL
        const uint8Array = new Uint8Array(logo.data);
        const blob = new Blob([uint8Array], { type: 'image/jpeg' }); // Assume JPEG, could be PNG
        return URL.createObjectURL(blob);
      } catch (err) {
        console.error('Failed to convert binary logo data:', err);
      }
    }
    
    return null;
  };
  
  // Modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  // Form state for settings modal only
  const [formData, setFormData] = useState({
    displayName: '',
    avatar: ''
  });

  // Profile hooks
  const { data: profileData, isLoading: profileLoading, refetch: refetchProfile } = useGetProfile(account?.address || null);
  const { exists: profileExists, isLoading: existsLoading } = useProfileExists(account?.address || null);
  const { createProfile, isPending: isCreating, error: createError } = useCreateProfile();
  const { updateProfile, isPending: isUpdating, error: updateError } = useUpdateProfile();
  
  // DAO hooks using custom hook with direct contract calls
  const { userDAOs, isLoading: daosLoading, error: daosError } = useUserDAOs();

  // Loading and error states
  const isLoading = profileLoading || existsLoading;
  const isPending = isCreating || isUpdating;
  const error = createError || updateError;



  // Initialize form data only when opening modal (not on every data change)
  useEffect(() => {
    if (showSettingsModal) {
      if (profileData) {
        // Initialize with existing profile data
        setFormData({
          displayName: profileData.displayName || '',
          avatar: profileData.avatarUrl || ''
        });
      } else {
        // Initialize with empty data for new profile
        setFormData({
          displayName: '',
          avatar: ''
        });
      }
    }
    // Only run when modal opens, not when data changes
  }, [showSettingsModal]);

  // Handle form submit
  const handleSaveProfile = async () => {
    if (!formData.displayName.trim()) {
      alert('Please enter a display name');
      return;
    }

    try {
      if (profileExists) {
        // Update existing profile
        await updateProfile(formData.displayName, formData.avatar);
      } else {
        // Create new profile
        await createProfile(formData.displayName, formData.avatar);
      }
      
      // Refresh profile data and close modal
      await refetchProfile();
      setShowSettingsModal(false);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      // Error is already handled by the hooks
    }
  };

  // Get display data with fallbacks
  const getDisplayData = () => {
    if (profileData) {
      return {
        displayName: profileData.displayName || getDisplayNameOrAddress(null, account?.address || ''),
        avatar: profileData.avatarUrl || '',
        hasProfile: true
      };
    }
    
    return {
      displayName: account?.address ? getDisplayNameOrAddress(null, account.address) : 'Connect Wallet',
      avatar: '',
      hasProfile: false
    };
  };

  const displayData = getDisplayData();

  // Simple modal render without complex state dependencies
  const renderModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="professional-card rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Profile Settings
          </h2>
          <button
            onClick={() => setShowSettingsModal(false)}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Display Name Section */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Display Name *
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData(prev => ({...prev, displayName: e.target.value}))}
              className="professional-input w-full px-4 py-3 rounded-xl"
              placeholder="Enter your display name"
              maxLength={50}
            />
          </div>

          {/* Profile Picture Section */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Profile Picture URL
            </label>
            <input
              type="text"
              value={formData.avatar}
              onChange={(e) => setFormData(prev => ({...prev, avatar: e.target.value}))}
              className="professional-input w-full px-4 py-3 rounded-xl"
              placeholder="Enter profile image URL (optional)"
            />
            
            {/* Avatar Preview */}
            {(formData.avatar || formData.displayName) && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-sm text-gray-400">Preview:</span>
                <div className="relative">
                  {formData.avatar ? (
                    <>
                      <img 
                        src={formData.avatar} 
                        alt="Preview"
                        className="w-12 h-12 rounded-lg object-cover shadow-md"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.classList.remove('hidden');
                        }}
                      />
                      <div className="hidden w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white text-sm font-bold">
                        {formData.displayName.charAt(0).toUpperCase()}
                      </div>
                    </>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white text-sm font-bold">
                      {formData.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex gap-3 p-6 border-t border-white/10">
          <button
            onClick={() => setShowSettingsModal(false)}
            className="flex-1 px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 rounded-lg font-medium transition-colors border border-white/10"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveProfile}
            className="flex-1 btn-primary px-4 py-2 text-white rounded-lg font-medium flex items-center justify-center gap-2"
            disabled={!formData.displayName.trim()}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`mx-auto px-6 py-8 ${className}`} style={{ maxWidth: '80rem' }}>
      {/* Profile Header */}
      <div className="text-center mb-12">
        {/* Loading State */}
        {isLoading && account?.address && (
          <div className="flex items-center justify-center mb-4">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            <span className="ml-2 text-gray-400">Loading profile...</span>
          </div>
        )}

        {/* Profile Avatar and Edit Button */}
        <div className="relative inline-block mb-4">
          {displayData.avatar ? (
            <>
              <img 
                src={displayData.avatar} 
                alt={displayData.displayName}
                className="w-24 h-24 rounded-xl object-cover shadow-lg"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.classList.remove('hidden');
                }}
              />
              <div className="hidden w-24 h-24 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white text-2xl font-bold">
                {displayData.displayName.charAt(0).toUpperCase()}
              </div>
            </>
          ) : (
            <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white text-2xl font-bold">
              {displayData.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          
          {account?.address && (
            <button 
              onClick={() => setShowSettingsModal(true)}
              className="absolute -bottom-1 -right-1 bg-indigo-600 hover:bg-indigo-700 p-2 rounded-full shadow-lg transition-colors"
              disabled={isLoading}
            >
              <Edit3 className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
        
        {/* Profile Name and Status */}
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-white mb-1">{displayData.displayName}</h1>
          {account?.address && (
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="text-gray-400">{account.address.slice(0, 6)}...{account.address.slice(-4)}</span>
              {displayData.hasProfile && (
                <span className="text-green-400 text-xs bg-green-900/30 px-2 py-1 rounded-full">Profile Active</span>
              )}
            </div>
          )}
          
          {!account?.address && (
            <p className="text-gray-400 text-sm">Please connect your wallet to view profile</p>
          )}
        </div>
      </div>

      {/* Feed Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Feed</h2>
          <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        <p className="text-gray-400 text-sm">
          {account?.address 
            ? 'Open proposals in the DAOs you follow will show up here.'
            : 'Connect your wallet to see DAO activity.'}
        </p>
      </div>

      {/* Your DAOs Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Your DAOs</h2>
          {userDAOs.all.length > 0 && (
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                {userDAOs.created.length} Created
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                {userDAOs.joined.length} Joined
              </span>
            </div>
          )}
        </div>
        
        <p className="text-gray-400 text-sm mb-6">
          {account?.address 
            ? 'The DAOs you have created or joined are shown below.'
            : 'Connect your wallet to see your DAO memberships.'}
        </p>

        {/* Loading State */}
        {daosLoading && account?.address && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            <span className="ml-2 text-gray-400">Loading your DAOs...</span>
          </div>
        )}

        {/* Error State */}
        {daosError && (
          <div className="flex items-center gap-2 p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm mb-6">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{daosError}</span>
          </div>
        )}

        {/* DAOs Grid - Cube Cards */}
        {!daosLoading && userDAOs.all.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {userDAOs.all.map((dao) => {
              const isCreator = userDAOs.created.some(d => d.address === dao.address);
              
              return (
                <div key={dao.address} className="professional-card rounded-xl p-4 hover:bg-gray-800/50 transition-colors aspect-square flex flex-col">
                  {/* DAO Logo and Badge */}
                  <div className="relative mb-3 flex justify-center">
                    <div className="relative">
                      {/* Try to display actual logo (URL or binary data), otherwise use initial */}
                      {(() => {
                        const logoUrl = getImageUrl(dao.logo);
                        return logoUrl ? (
                          <>
                            <img 
                              src={logoUrl} 
                              alt={dao.name}
                              className="w-12 h-12 rounded-lg object-cover shadow-md"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                if (fallback) fallback.classList.remove('hidden');
                              }}
                            />
                            <div className="hidden w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white text-lg font-bold">
                              {dao.name.charAt(0).toUpperCase()}
                            </div>
                          </>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white text-lg font-bold">
                            {dao.name.charAt(0).toUpperCase()}
                          </div>
                        );
                      })()}
                      
                      {/* Role Badge */}
                      <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${
                        isCreator ? 'bg-indigo-500' : 'bg-green-500'
                      }`}>
                        {isCreator ? (
                          <Crown className="w-3 h-3 text-white" />
                        ) : (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* DAO Name */}
                  <div className="text-center mb-2 flex-1">
                    <h3 className="font-semibold text-white text-sm truncate">{dao.name}</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {isCreator ? 'Creator' : 'Member'}
                    </p>
                  </div>

                  {/* DAO Stats */}
                  <div className="text-center">
                    <div className="text-xs text-gray-500">
                      {new Date(dao.created_at * 1000).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!daosLoading && !daosError && userDAOs.all.length === 0 && account?.address && (
          <div className="p-12 text-center">
            <div className="mb-4">
              <svg className="w-16 h-16 text-gray-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No DAOs Found</h3>
            <p className="text-gray-400 text-sm">
              You haven't created or joined any DAOs yet.
            </p>
          </div>
        )}

        {/* No Wallet Connected State */}
        {!account?.address && (
          <div className="p-12 text-center">
            <div className="mb-4">
              <svg className="w-16 h-16 text-gray-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Connect Your Wallet</h3>
            <p className="text-gray-400 text-sm">
              Connect your wallet to see your DAO memberships and activity.
            </p>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettingsModal && renderModal()}
    </div>
  );
};

export default UserProfile;