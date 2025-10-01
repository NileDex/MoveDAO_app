import React, { useState } from 'react';
import { ArrowLeft, Upload, Plus, X, Sparkles, Shield, Settings, DollarSign, Clock, Users } from 'lucide-react';
import { useWallet } from '@razorlabs/razorkit';
import { useCreateDAO, useCheckSubnameAvailability } from '../useServices/useDAOCore';
import { useAlert } from './alert/AlertContext';

interface CreateDAOProps {
  onBack: () => void;
}

const CreateDAO: React.FC<CreateDAOProps> = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    subname: '',
    description: '',
    chain: 'movement',
    minimumStake: '6',
    logo: null as File | null,
    background: null as File | null,
    logoUrl: '',
    backgroundUrl: '',
    useUrls: false
  });

  const [councils, setCouncils] = useState<string[]>(['']);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionHash, setTransactionHash] = useState('');
  const { showAlert } = useAlert();

  // Wallet and blockchain integration
  const { account } = useWallet();
  const { createDAO, createDAOWithUrls, testMinimalTransaction, isPending: isDAOPending, error: daoError } = useCreateDAO();
  const { checkSubname, isPending: isCheckingSubname } = useCheckSubnameAvailability();

  const steps = [
    { id: 1, title: 'Basic Info', icon: Sparkles },
    { id: 2, title: 'Council Members', icon: Users },
    { id: 3, title: 'Governance', icon: Settings },
    { id: 4, title: 'Review', icon: Shield },
  ];

  const addCouncilMember = () => {
    setCouncils([...councils, '']);
  };

  const removeCouncilMember = (index: number) => {
    if (councils.length > 1) {
      setCouncils(councils.filter((_, i) => i !== index));
    }
  };

  // Validate subname availability
  const validateSubname = async (subname: string): Promise<string | null> => {
    if (!subname.trim()) return 'Subname is required';
    if (subname.length < 3) return 'Subname must be at least 3 characters';
    if (subname.length > 50) return 'Subname must be less than 50 characters';
    
    // Check if subname contains only allowed characters (letters, numbers, hyphens)
    if (!/^[a-zA-Z0-9-]+$/.test(subname)) {
      return 'Subname can only contain letters, numbers, and hyphens';
    }
    
    try {
      const result = await checkSubname(subname);
      if (!result.isAvailable) {
        return `Subname "${subname}" is already taken. Please choose another one.`;
      }
      return null;
    } catch (error) {
      console.warn('Failed to check subname availability:', error);
      return 'Unable to verify subname availability. Please try again.';
    }
  };

  const updateCouncilMember = (index: number, value: string) => {
    const newCouncils = [...councils];
    newCouncils[index] = value;
    setCouncils(newCouncils);
  };

  // Normalize Aptos address to 0x + 64 hex (pads leading zeros)
  const normalizeAptosAddress = (addr: string): string => {
    if (!addr) return addr;
    const hex = addr.toLowerCase().startsWith('0x') ? addr.slice(2) : addr;
    const cleaned = hex.replace(/[^a-f0-9]/g, '');
    return '0x' + cleaned.padStart(64, '0');
  };

  // Aggressive but quality-preserving compression for blockchain storage
  const compressImage = (file: File, maxSizeKB: number, quality: number = 0.9, mimeOverride?: string): Promise<File> => {
    return new Promise((resolve) => {
      const img = new Image();
      (img as any).decoding = 'async';
      
      img.onload = async () => {
        const isLogoGuess = maxSizeKB <= 100; // More aggressive detection
        
        // Original dimensions for good quality
        // Logos: crisp for UI display
        // Backgrounds: high quality for visual impact
        const targetMaxWidth = isLogoGuess ? 512 : 1400;
        const targetMaxHeight = isLogoGuess ? 512 : 900;

        const scale = Math.min(
          targetMaxWidth / img.width,
          targetMaxHeight / img.height,
          1
        );

        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        
        // Enhanced rendering for better quality at smaller sizes
        ctx.imageSmoothingEnabled = true;
        // @ts-ignore: browser-specific property
        ctx.imageSmoothingQuality = 'high';
        
        // Apply sharpening filter for logos to maintain crispness
        if (isLogoGuess && scale < 0.8) {
          ctx.filter = 'contrast(1.1) brightness(1.02)';
        }
        
        // Pre-filter for crisp downscaling
        if (scale < 0.5) {
          // Two-pass downscaling for better quality
          const tempCanvas = document.createElement('canvas');
          const tempScale = Math.max(scale * 2, 0.5);
          tempCanvas.width = Math.round(img.width * tempScale);
          tempCanvas.height = Math.round(img.height * tempScale);
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCtx.imageSmoothingEnabled = true;
            // @ts-ignore
            tempCtx.imageSmoothingQuality = 'high';
            tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
            ctx.drawImage(tempCanvas, 0, 0, width, height);
          } else {
            ctx.drawImage(img, 0, 0, width, height);
          }
        } else {
          ctx.drawImage(img, 0, 0, width, height);
        }

        const targetBytes = maxSizeKB * 1024;
        // Original quality steps for good compression
        const qualities = [quality, 0.95, 0.92, 0.9, 0.88, 0.86, 0.84, 0.8];

        const nativeType = (file.type || '').toLowerCase();
        // Smart format selection: JPEG for photos, PNG for graphics with transparency
        const hasTransparency = nativeType.includes('png') && isLogoGuess;
        const outputMime = mimeOverride || (hasTransparency ? 'image/png' : 'image/jpeg');

        const toBlobWithQuality = (q: number) => new Promise<Blob | null>((res) => {
          canvas.toBlob(res, outputMime, outputMime === 'image/png' ? undefined : q);
        });

        for (let i = 0; i < qualities.length; i++) {
          const q = qualities[i];
          const blob = await toBlobWithQuality(q);
          if (blob) {
            if (blob.size <= targetBytes || i === qualities.length - 1) {
              const compressedFile = new File(
                [blob],
                outputMime === 'image/png'
                  ? file.name.replace(/\.(png|jpg|jpeg|webp|gif)$/i, '.png')
                  : file.name.replace(/\.(png|jpg|jpeg|webp|gif)$/i, '.jpg'),
                { type: outputMime, lastModified: Date.now() }
              );

              console.log(`🗜️ High-efficiency compression ${file.name}:`, {
                original: `${(file.size / 1024).toFixed(1)}KB`,
                compressed: `${(compressedFile.size / 1024).toFixed(1)}KB`,
                savings: `${(((file.size - compressedFile.size) / file.size) * 100).toFixed(1)}%`,
                dimensions: `${canvas.width}x${canvas.height}`,
                quality: q,
                format: outputMime,
                compressionRatio: `${(file.size / compressedFile.size).toFixed(1)}x`
              });

              resolve(compressedFile);
              return;
            }
          }
        }

        // Fallback to original if something went wrong
        resolve(file);
      };
      
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  };

  // Light compression for good quality (original working settings)
  const shouldCompress = (file: File, type: 'logo' | 'background'): boolean => {
    const sizeKB = file.size / 1024;
    if (type === 'logo') {
      return sizeKB > 300; // only compress logos >300KB
    }
    return sizeKB > 800; // only compress backgrounds >800KB
  };

  const optimizeImage = async (file: File, type: 'logo' | 'background'): Promise<File> => {
    if (!shouldCompress(file, type)) {
      return file;
    }
    // Original working compression targets
    const targetKB = type === 'logo' ? 400 : 600; // Higher quality targets
    const outputMime = type === 'logo' && (file.type.includes('png') || file.type.includes('webp'))
      ? 'image/png'
      : 'image/jpeg';
    return compressImage(file, targetKB, 0.9, outputMime); // Higher starting quality
  };

  const handleFileUpload = async (file: File, type: 'logo' | 'background') => {
    console.log(`📁 File upload - ${type}:`, {
      name: file.name,
      size: file.size,
      type: file.type,
      sizeInMB: (file.size / (1024 * 1024)).toFixed(2)
    });

    if (file.size > 10 * 1024 * 1024) { // 10MB absolute limit
      setErrors({...errors, [type]: 'File size must be less than 10MB'});
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      setErrors({...errors, [type]: 'File must be an image'});
      return;
    }

    // Lightly optimize images while preserving quality (skip if already small)
    try {
      const optimized = await optimizeImage(file, type);
      
      setFormData({...formData, [type]: optimized});
      setErrors({...errors, [type]: ''});
    } catch (error) {
      setErrors({...errors, [type]: 'Failed to compress image. Please try a different file.'});
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: {[key: string]: string} = {};
    
    switch (step) {
      case 1:
        if (!formData.name.trim()) newErrors.name = 'DAO name is required';
        if (formData.name.trim().length < 3) newErrors.name = 'DAO name must be at least 3 characters';
        if (formData.name.length > 50) newErrors.name = 'DAO name must be less than 50 characters';
        if (!formData.subname.trim()) newErrors.subname = 'DAO subname is required';
        if (formData.subname.length > 20) newErrors.subname = 'DAO subname must be less than 20 characters';
        if (!formData.description.trim()) newErrors.description = 'Description is required';
        if (formData.description.trim().length < 10) newErrors.description = 'Description must be at least 10 characters';
        if (formData.description.length > 500) newErrors.description = 'Description must be less than 500 characters';
        
        // Validate images based on mode
        if (formData.useUrls) {
          if (!formData.logoUrl.trim()) newErrors.logoUrl = 'Logo URL is required';
          if (!formData.backgroundUrl.trim()) newErrors.backgroundUrl = 'Background URL is required';
          // Basic URL validation
          try {
            if (formData.logoUrl) new URL(formData.logoUrl);
          } catch { newErrors.logoUrl = 'Invalid logo URL format'; }
          try {
            if (formData.backgroundUrl) new URL(formData.backgroundUrl);
          } catch { newErrors.backgroundUrl = 'Invalid background URL format'; }
        }
        break;
        
      case 2:
        const validCouncils = councils.filter(c => c.trim());
        if (validCouncils.length === 0) newErrors.councils = 'At least one council member is required';
        if (validCouncils.length > 10) newErrors.councils = 'Maximum 10 council members allowed';
        
        // Validate address format and duplicates
        const normalized = validCouncils.map(normalizeAptosAddress);
        const dupCheck = new Set<string>();
        normalized.forEach((addr, i) => {
          if (dupCheck.has(addr)) {
            newErrors.councils = 'Duplicate council addresses are not allowed';
          }
          dupCheck.add(addr);
        });
        councils.forEach((council, index) => {
          if (council.trim() && !council.match(/^0x[a-fA-F0-9]{64}$/)) {
            newErrors[`council_${index}`] = 'Invalid address format';
          }
        });
        break;
        
      case 3:
        const minStake = parseFloat(formData.minimumStake || '6');
        if (isNaN(minStake) || minStake < 6 || minStake > 10000) {
          newErrors.minimumStake = 'Minimum stake must be between 6 and 10,000 Move tokens';
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Test function for debugging serialization issues
  const handleTestTransaction = async () => {
    if (!account) {
      showAlert('Please connect your wallet to test transaction', 'error');
      setErrors({...errors, submit: 'Please connect your wallet to test transaction'});
      return;
    }
    
    setIsSubmitting(true);
    setErrors({});
    setTransactionHash('');
    
    try {
      console.log('🧪 Testing minimal transaction...');
      const result = await testMinimalTransaction();
      
      showAlert('✅ Test transaction successful! Serialization is working.', 'success');
    } catch (error) {
      console.error('❌ Test transaction failed:', error);
      showAlert(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      setErrors({
        ...errors, 
        submit: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(4)) return;
    
    if (!account) {
      showAlert('Please connect your wallet to create a DAO', 'error');
      setErrors({...errors, submit: 'Please connect your wallet to create a DAO'});
      return;
    }
    
    setIsSubmitting(true);
    setErrors({});
    setTransactionHash('');
    
    try {
      // Check if using URL mode or binary mode
      if (formData.useUrls) {
        // URL-based creation - much faster!
        console.log('🔄 Creating DAO with URLs (fast mode)...');
        
        const validCouncils = councils.filter(c => c.trim());
        const normalizedCouncils = validCouncils.map(normalizeAptosAddress);
        
        const createDAOParams = {
          name: formData.name.trim(),
          subname: formData.subname.trim(),
          description: formData.description.trim(),
          logoUrl: formData.logoUrl.trim(),
          backgroundUrl: formData.backgroundUrl.trim(),
          initialCouncil: normalizedCouncils,
          minStakeToJoin: Math.round(parseFloat(formData.minimumStake || '6') * 1000000)
        };
        
        console.log('🔄 Creating DAO with URLs:', createDAOParams);
        
        const result = await createDAOWithUrls(createDAOParams);
        
        // Extract transaction hash
        let txHash = ''
        if (result && typeof result === 'object') {
          if ('hash' in result) {
            txHash = String(result.hash)
          }
        }
        
        if (txHash) {
          setTransactionHash(txHash)
        }
        
        showAlert(
          `✅ DAO "${formData.name}" created successfully with URLs! 🏛️ Your DAO is now live with ${validCouncils.length} council members. 💰 Minimum stake: ${parseFloat(formData.minimumStake || '6').toFixed(1)} Move tokens ⚡ Created using URL mode for optimal speed!`,
          'success'
        );

        // Optimistically broadcast a lightweight DAO object so list updates instantly
        try {
          const optimisticDao = {
            id: account.address,
            name: formData.name.trim(),
            description: formData.description.trim(),
            image: formData.logoUrl.trim(),
            background: formData.backgroundUrl.trim(),
            subname: formData.subname.trim(),
            chain: formData.subname.trim() || 'Movement',
            tokenName: formData.subname.trim() || 'DAO',
            tokenSymbol: formData.subname.trim() || 'DAO',
            tvl: '0',
            proposals: 0,
            members: 0,
            established: new Date().toLocaleString(),
            category: 'featured',
            isFollowing: false,
          } as any
          window.dispatchEvent(new CustomEvent('dao:created', { detail: optimisticDao }))
        } catch {}
        
      } else {
        // Binary creation mode
        console.log('🔄 Converting compressed images to bytes...');
        console.log('📁 Logo file:', formData.logo?.name || 'No logo file');
        console.log('📁 Background file:', formData.background?.name || 'No background file');
      
      // Ensure images are under on-chain limits (logo ≤ 1MB, background ≤ 5MB)
      const ensureImageLimit = async (file: File | null, limitBytes: number, type: 'logo' | 'background'): Promise<number[]> => {
        if (!file) return [];
        let current = file;
        let bytes = await fileToBytes(current);
        if (bytes.length <= limitBytes) return bytes;
        // Retry with much stronger optimization if over limit
        const fallback = await compressImage(current, type === 'logo' ? 60 : 80, 0.7);
        bytes = await fileToBytes(fallback);
        if (bytes.length <= limitBytes) return bytes;
        // Last resort: ultra compression
        const ultraFallback = await compressImage(current, type === 'logo' ? 40 : 60, 0.5);
        bytes = await fileToBytes(ultraFallback);
        if (bytes.length <= limitBytes) return bytes;
        throw new Error(`${type} image is too large after maximum compression (${(bytes.length/1024).toFixed(0)}KB). Please use a smaller or simpler image.`);
      };

      const logoBytes = await ensureImageLimit(formData.logo, 1_048_576, 'logo');
      const backgroundBytes = await ensureImageLimit(formData.background, 5_242_880, 'background');
      
      console.log('📊 Compressed bytes:', {
        logoBytes: logoBytes.length,
        backgroundBytes: backgroundBytes.length,
        totalSize: logoBytes.length + backgroundBytes.length,
        gasSavings: 'Major savings from compression!'
      });
      
      const validCouncils = councils.filter(c => c.trim());
      const normalizedCouncils = validCouncils.map(normalizeAptosAddress);
      // Final duplicate guard
      const unique = new Set(normalizedCouncils.map(a => a.toLowerCase()));
      if (unique.size !== normalizedCouncils.length) {
        throw new Error('Duplicate council addresses detected. Please ensure each council member address is unique.');
      }
      
      const createDAOParams = {
        name: formData.name.trim(),
        subname: formData.subname.trim(),
        description: formData.description.trim(),
        logo: new Uint8Array(logoBytes),
        background: new Uint8Array(backgroundBytes),
        initialCouncil: normalizedCouncils,
        minStakeToJoin: Math.round(parseFloat(formData.minimumStake || '6') * 1000000)
      };
      
      console.log('📋 Final DAO params with compressed images:', {
        ...createDAOParams,
        logo: `Uint8Array(${createDAOParams.logo.length} bytes compressed)`,
        background: `Uint8Array(${createDAOParams.background.length} bytes compressed)`
      });
      
        console.log('🔄 Creating DAO with binary data:', createDAOParams);
        console.log('👤 Creator address:', account.address);
        
        const result = await createDAO(createDAOParams);
      
      
      // Extract transaction hash from different wallet response formats
      let txHash = ''
      if (result && typeof result === 'object') {
        if ('hash' in result) {
          txHash = String(result.hash)
        } else if ('args' in result && result.args && typeof result.args === 'object' && 'hash' in result.args) {
          txHash = String(result.args.hash)
        } else if ('data' in result && result.data && typeof result.data === 'object' && 'hash' in result.data) {
          txHash = String(result.data.hash)
        }
      }
      
      if (txHash) {
        setTransactionHash(txHash)
        console.log('📋 Transaction hash extracted:', txHash)
      }
      
        showAlert(
          `✅ DAO "${formData.name}" created successfully on Movement Network! 🏛️ Your DAO is now live with ${validCouncils.length} council members. 💰 Minimum stake: ${parseFloat(formData.minimumStake || '6').toFixed(1)} Move tokens`,
          'success'
        );

        // Optimistic broadcast for binary mode as well (no URLs available; images will resolve after refetch)
        try {
          const optimisticDao = {
            id: account.address,
            name: formData.name.trim(),
            description: formData.description.trim(),
            image: '',
            background: '',
            subname: formData.subname.trim(),
            chain: formData.subname.trim() || 'Movement',
            tokenName: formData.subname.trim() || 'DAO',
            tokenSymbol: formData.subname.trim() || 'DAO',
            tvl: '0',
            proposals: 0,
            members: 0,
            established: new Date().toLocaleString(),
            category: 'featured',
            isFollowing: false,
          } as any
          window.dispatchEvent(new CustomEvent('dao:created', { detail: optimisticDao }))
        } catch {}
      }
      
      // Reset form after successful creation
      setTimeout(() => {
        setFormData({
          name: '',
          subname: '',
          description: '',
          chain: 'movement',
          minimumStake: '6',
          logo: null,
          background: null,
          logoUrl: '',
          backgroundUrl: '',
          useUrls: false
        });
        setCouncils(['']);
        setCurrentStep(1);
      }, 3000);
      
    } catch (error) {
      console.error('❌ Failed to create DAO:', error);
      const errorMsg = `Failed to create DAO: ${error instanceof Error ? error.message : 'Unknown error'}`;
      showAlert(errorMsg, 'error');
      setErrors({
        ...errors, 
        submit: errorMsg
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const fileToBytes = (file: File): Promise<number[]> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        const bytes = Array.from(new Uint8Array(arrayBuffer));
        resolve(bytes);
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="professional-card rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <span>DAO Identity</span>
              </h3>
              
              <div className="grid grid-cols-1 gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      DAO Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className={`professional-input w-full px-4 py-3 rounded-xl ${errors.name ? 'border-red-500' : ''}`}
                      placeholder="Enter your DAO name (max 50 characters)"
                      maxLength={50}
                    />
                    {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      DAO Subname *
                    </label>
                    <input
                      type="text"
                      value={formData.subname}
                      onChange={(e) => setFormData({...formData, subname: e.target.value})}
                      className={`professional-input w-full px-4 py-3 rounded-xl ${errors.subname ? 'border-red-500' : ''}`}
                      placeholder="Short identifier (max 20 characters)"
                      maxLength={20}
                    />
                    {errors.subname && <p className="text-red-400 text-sm mt-1">{errors.subname}</p>}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={4}
                    maxLength={500}
                    className={`professional-input w-full px-4 py-3 rounded-xl ${errors.description ? 'border-red-500' : ''}`}
                    placeholder="Describe your DAO's mission, goals, and community focus (max 500 characters)"
                  />
                  <div className="flex justify-between mt-1">
                    {errors.description && <p className="text-red-400 text-sm">{errors.description}</p>}
                    <p className="text-gray-500 text-sm ml-auto">{formData.description.length}/500</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                  {/* Image Mode Toggle */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Image Mode
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={!formData.useUrls}
                          onChange={() => setFormData({...formData, useUrls: false})}
                          className="text-indigo-500"
                        />
                        <span className="text-gray-300">Upload Files (Compressed)</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.useUrls}
                          onChange={() => setFormData({...formData, useUrls: true})}
                          className="text-indigo-500"
                        />
                        <span className="text-gray-300">Use URLs (Faster)</span>
                      </label>
                    </div>
                    <p className="text-gray-500 text-sm mt-1">
                      {formData.useUrls ? 'Use image URLs for faster creation with lower gas costs' : 'Upload files for on-chain storage (higher gas costs)'}
                    </p>
                  </div>
                  
                  {formData.useUrls ? (
                    // URL input mode
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Logo URL *
                        </label>
                        <input
                          type="url"
                          value={formData.logoUrl}
                          onChange={(e) => setFormData({...formData, logoUrl: e.target.value})}
                          className={`professional-input w-full px-4 py-3 rounded-xl ${errors.logoUrl ? 'border-red-500' : ''}`}
                          placeholder="https://example.com/logo.png"
                        />
                        {errors.logoUrl && <p className="text-red-400 text-sm mt-1">{errors.logoUrl}</p>}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Background URL *
                        </label>
                        <input
                          type="url"
                          value={formData.backgroundUrl}
                          onChange={(e) => setFormData({...formData, backgroundUrl: e.target.value})}
                          className={`professional-input w-full px-4 py-3 rounded-xl ${errors.backgroundUrl ? 'border-red-500' : ''}`}
                          placeholder="https://example.com/background.jpg"
                        />
                        {errors.backgroundUrl && <p className="text-red-400 text-sm mt-1">{errors.backgroundUrl}</p>}
                      </div>
                    </>
                  ) : (
                    // File upload mode
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          DAO Logo
                        </label>
                    <div 
                      className={`border-2 border-dashed rounded-xl p-4 sm:p-6 text-center hover:border-indigo-500/50 transition-colors cursor-pointer ${formData.logo ? 'border-green-500/50 bg-green-500/10' : 'border-white/20'}`}
                      onClick={() => document.getElementById('logo-upload')?.click()}
                    >
                      <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-300 text-xs sm:text-sm mb-1">
                        {formData.logo ? `✅ ${formData.logo.name}` : 'Upload DAO logo'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formData.logo ? `${(formData.logo.size / 1024).toFixed(1)}KB (compressed)` : 'Auto-compressed to ~400KB'}
                      </p>
                    </div>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'logo');
                      }}
                    />
                    {errors.logo && <p className="text-red-400 text-sm mt-1">{errors.logo}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Background Image
                    </label>
                    <div 
                      className={`border-2 border-dashed rounded-xl p-4 sm:p-6 text-center hover:border-indigo-500/50 transition-colors cursor-pointer ${formData.background ? 'border-green-500/50 bg-green-500/10' : 'border-white/20'}`}
                      onClick={() => document.getElementById('background-upload')?.click()}
                    >
                      <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-300 text-xs sm:text-sm mb-1">
                        {formData.background ? `✅ ${formData.background.name}` : 'Upload background'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formData.background ? `${(formData.background.size / 1024).toFixed(1)}KB (compressed)` : 'Auto-compressed to ~600KB'}
                      </p>
                    </div>
                    <input
                      id="background-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'background');
                      }}
                    />
                        {errors.background && <p className="text-red-400 text-sm mt-1">{errors.background}</p>}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-6">
            <div className="professional-card rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-400" />
                <span>Council Members</span>
              </h3>
              <p className="text-gray-400 mb-6">
                Add Aptos addresses for your initial council members. They will have governance rights in your DAO.
              </p>
              
              <div className="space-y-4">
                {councils.map((council, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={council}
                        onChange={(e) => updateCouncilMember(index, e.target.value)}
                        className={`professional-input w-full px-4 py-3 rounded-xl ${errors[`council_${index}`] ? 'border-red-500' : ''}`}
                        placeholder="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
                      />
                      {errors[`council_${index}`] && (
                        <p className="text-red-400 text-sm mt-1">{errors[`council_${index}`]}</p>
                      )}
                    </div>
                    {councils.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCouncilMember(index)}
                        className="p-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              {errors.councils && <p className="text-red-400 text-sm mt-4">{errors.councils}</p>}
              
              {councils.length < 10 && (
                <button
                  type="button"
                  onClick={addCouncilMember}
                  className="flex items-center space-x-2 px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded-xl text-sm font-medium border border-indigo-500/30 transition-all mt-6"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Council Member</span>
                </button>
              )}
              
              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <p className="text-blue-300 text-sm">
                  <strong>Tip:</strong> Council members will be able to create proposals and vote on governance decisions. 
                  You can have 1-10 council members. Consider starting with trusted community members.
                </p>
              </div>
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="space-y-6">
            <div className="professional-card rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                <Settings className="w-5 h-5 text-purple-400" />
                <span>Governance Settings</span>
              </h3>
              
              <div className="max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Minimum Stake to Join (Move tokens) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="6"
                      max="10000"
                      step="1"
                      value={formData.minimumStake}
                      onChange={(e) => setFormData({...formData, minimumStake: e.target.value})}
                      className={`professional-input w-full px-4 py-3 rounded-xl ${errors.minimumStake ? 'border-red-500' : ''}`}
                      placeholder="6"
                    />
                  </div>
                  {errors.minimumStake && <p className="text-red-400 text-sm mt-1">{errors.minimumStake}</p>}
                  <p className="text-gray-500 text-sm mt-1">Members must stake at least 6 Move tokens to join the DAO</p>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                <p className="text-purple-300 text-sm">
                  <strong>Governance Overview:</strong> The minimum stake requirement helps prevent spam and ensures committed members. 
                  6 Move tokens is the minimum required by the protocol. Additional governance settings like voting periods 
                  will be configured automatically with sensible defaults. You can modify these later through governance proposals.
                </p>
              </div>
            </div>
          </div>
        );
        
      case 4:
        const validCouncils = councils.filter(c => c.trim());
        return (
          <div className="space-y-6">
            <div className="professional-card rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                <Shield className="w-5 h-5 text-green-400" />
                <span>Review & Create DAO</span>
              </h3>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">Basic Information</h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-gray-400">Name:</span> <span className="text-white">{formData.name}</span></p>
                        <p><span className="text-gray-400">Subname:</span> <span className="text-white">{formData.subname}</span></p>
                        <p><span className="text-gray-400">Description:</span> <span className="text-white">{formData.description.substring(0, 100)}{formData.description.length > 100 ? '...' : ''}</span></p>
                        <p><span className="text-gray-400">Image Mode:</span> <span className="text-white">{formData.useUrls ? 'URLs (Fast)' : 'Uploaded Files'}</span></p>
                        {formData.useUrls ? (
                          <>
                            <p><span className="text-gray-400">Logo URL:</span> <span className="text-white text-sm">{formData.logoUrl || 'Not provided'}</span></p>
                            <p><span className="text-gray-400">Background URL:</span> <span className="text-white text-sm">{formData.backgroundUrl || 'Not provided'}</span></p>
                          </>
                        ) : (
                          <>
                            <p><span className="text-gray-400">Logo:</span> <span className="text-white">{formData.logo ? formData.logo.name : 'Not uploaded'}</span></p>
                            <p><span className="text-gray-400">Background:</span> <span className="text-white">{formData.background ? formData.background.name : 'Not uploaded'}</span></p>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">Governance</h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-gray-400">Minimum Stake:</span> <span className="text-white">{parseFloat(formData.minimumStake || '6').toFixed(1)} Move tokens</span></p>
                        <p><span className="text-gray-400">Voting Periods:</span> <span className="text-white">Configured automatically</span></p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-2">Council Members ({validCouncils.length})</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {validCouncils.map((council, index) => (
                        <div key={index} className="text-sm font-mono text-gray-300 bg-white/5 p-2 rounded">
                          {council.length > 20 ? `${council.substring(0, 20)}...${council.substring(council.length - 20)}` : council}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                  <p className="text-yellow-300 text-sm">
                    <strong>Important:</strong> Once created, your DAO will be deployed to the Aptos blockchain. 
                    Make sure all information is correct as some settings can only be changed through governance proposals.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="relative mb-8">
        {/* Mobile: Back button absolute positioned, content centered */}
        <div className="sm:hidden">
          <button
            onClick={onBack}
            className="absolute left-0 top-0 p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center pt-2">
            <h1 className="text-2xl font-bold text-white">Create New DAO</h1>
            <p className="text-gray-400 mt-1 text-sm">Build your decentralized community in minutes</p>
          </div>
        </div>
        
        {/* Desktop: Back button inline with content */}
        <div className="hidden sm:flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white">Create New DAO</h1>
            <p className="text-gray-400 mt-1 text-base">Build your decentralized community in minutes</p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      {/* Mobile: One step at a time */}
      <div className="sm:hidden mb-8">
        <div className="space-y-3">
          {/* Progress indicator */}
          <div className="text-center">
            <span className="text-xs text-gray-400">Step {currentStep} of {steps.length}</span>
          </div>
          
          {/* Current step only */}
          {steps
            .filter(step => step.id === currentStep)
            .map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.id} className="flex justify-center">
                  <div className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-4 py-3 rounded-xl flex items-center space-x-3">
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{step.title}</span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Desktop: Original horizontal layout */}
      <div className="hidden sm:flex items-center justify-center mb-8 space-x-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          
          return (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center space-x-3 px-4 py-2 rounded-xl transition-all ${
                isActive ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                isCompleted ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                'bg-white/5 text-gray-400'
              }`}>
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{step.title}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-8 h-0.5 mx-2 ${
                  isCompleted ? 'bg-green-500' : 'bg-white/20'
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Wallet Connection Status */}
      {!account && (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <div className="flex items-center space-x-2">
            <div className="text-yellow-400">⚠️</div>
            <div>
              <h4 className="text-yellow-300 font-medium">Wallet Not Connected</h4>
              <p className="text-yellow-200 text-sm">Please connect your wallet to create a DAO on Movement Network.</p>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Hash (if available) */}
      {transactionHash && (
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <p className="text-blue-300 text-sm font-medium mb-2">Transaction Hash:</p>
          <code className="text-blue-200 text-xs break-all block bg-blue-500/10 p-2 rounded">
            {transactionHash}
          </code>
          <a 
            href={`https://explorer.movementnetwork.xyz/?network=bardock+testnet/txn/${transactionHash}`}
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 text-sm underline mt-2 inline-block"
          >
            View on Movement Explorer →
          </a>
        </div>
      )}

      {/* Mode-specific Info */}
      {formData.useUrls ? (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
          <div className="text-green-300">
            <div className="text-green-400">⚡</div>
            <h4 className="font-medium mb-2">Fast URL Mode Active</h4>
            <p className="text-sm">
              You're using URL mode for lightning-fast DAO creation with minimal gas costs!
              <br />• ~70% lower gas usage compared to file uploads
              <br />• Instant deployment without file compression
              <br />• Images hosted externally for better performance
            </p>
          </div>
        </div>
      ) : (formData.logo || formData.background) ? (
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <div className="text-blue-300">
            <div className="text-blue-400">🗜️</div>
            <h4 className="font-medium mb-2">Smart Image Compression</h4>
            <p className="text-sm">
              Your images have been automatically compressed for optimal gas efficiency:
              {formData.logo && <br />}• Logo: {formData.logo ? `${(formData.logo.size / 1024).toFixed(1)}KB` : 'Not uploaded'}
              {formData.background && <br />}• Background: {formData.background ? `${(formData.background.size / 1024).toFixed(1)}KB` : 'Not uploaded'}
            </p>
          </div>
        </div>
      ) : null}

      {/* Error Message */}
      {errors.submit && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <div className="text-red-300">
            <div className="text-red-400">❌</div>
            <p className="text-sm">{errors.submit}</p>
            {errors.submit.includes('Out of gas') && (
              <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <h5 className="text-blue-300 font-medium mb-2">💡 Gas Limit Solution:</h5>
                <p className="text-blue-200 text-sm">
                  This error occurs when storing large images on-chain. Try:
                  <br />• Use smaller images (under 500KB each)
                  <br />• Compress your images before upload
                  <br />• Use basic DAO creation without images first
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {renderStepContent()}

        <div className="flex flex-col sm:flex-row justify-between gap-4 mt-8">
          <button
            type="button"
            onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : onBack()}
            className="px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-medium transition-all order-2 sm:order-1"
            disabled={isSubmitting}
          >
            {currentStep === 1 ? 'Cancel' : 'Previous'}
          </button>
          
          {currentStep < 4 ? (
            <button
              type="button"
              onClick={() => {
                if (validateStep(currentStep)) {
                  setCurrentStep(currentStep + 1);
                }
              }}
              disabled={isSubmitting}
              className="px-6 py-3 font-medium disabled:opacity-50 order-1 sm:order-2"
              style={{
                background: '#1e1e20',
                borderRadius: '12px',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.background = '#2a2a2c';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.background = '#1e1e20';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              Continue
            </button>
          ) : (
            <div className="flex gap-3 order-1 sm:order-2">
              {/* Test button for debugging serialization */}
              <button
                type="button"
                onClick={handleTestTransaction}
                disabled={isSubmitting}
                className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl font-medium disabled:opacity-50 flex items-center space-x-2"
              >
                🧪 Test Transaction
              </button>
              
              {/* Main Create DAO button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 font-medium disabled:opacity-50 flex items-center space-x-2"
                style={{
                  background: '#1e1e20',
                  borderRadius: '12px',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.background = '#2a2a2c';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.background = '#1e1e20';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creating DAO...</span>
                  </>
                ) : (
                  <span>Create DAO</span>
                )}
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default CreateDAO;