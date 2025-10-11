import React from 'react';
import { Lock } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface LockedFeatureOverlayProps {
  title?: string;
  description?: string;
  buttonText?: string;
  onButtonClick?: () => void;
  icon?: React.ReactNode;
  showOverlay?: boolean;
}

const LockedFeatureOverlay: React.FC<LockedFeatureOverlayProps> = ({
  title = 'Locked Feature',
  description = 'You must hold a Holders Tab Key NFT to unlock + view the holders stats',
  buttonText = 'Connect Wallet',
  onButtonClick,
  icon,
  showOverlay = true
}) => {
  const { isDark } = useTheme();

  if (!showOverlay) return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center min-h-[400px]">
      {/* Backdrop with blur - adapts to theme */}
      <div
        className="absolute inset-0 backdrop-blur-md"
        style={{
          backgroundColor: isDark ? 'rgba(15, 15, 17, 0.5)' : 'rgba(255, 255, 255, 0.5)'
        }}
      />

      {/* Lock Modal Card - adapts to theme */}
      <div className={`relative z-40 rounded-xl shadow-2xl p-8 max-w-md mx-4 text-center ${
        isDark
          ? 'bg-white/5 border border-white/10'
          : 'bg-black/5 border border-black/10'
      }`}>
        {/* Icon */}
        <div className="flex justify-center mb-4">
          {icon || (
            <div className="w-16 h-16 bg-orange-600/20 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-orange-500" />
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className={`text-xl font-bold mb-3 ${isDark ? 'text-white' : 'text-black'}`}>
          {title}
        </h3>

        {/* Description */}
        <p className={`text-sm mb-6 leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          {description}
        </p>

        {/* Action Button - matches your app's orange button style */}
        {onButtonClick && (
          <button
            onClick={onButtonClick}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-all duration-200"
          >
            {buttonText}
          </button>
        )}
      </div>
    </div>
  );
};

export default LockedFeatureOverlay;
