import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BannerAdPosition } from '@capacitor-community/admob';
import { useAdMob } from '@/hooks/useAdMob';
import { Gift, Eye, EyeOff } from 'lucide-react';

interface AdMobManagerProps {
  isPremium: boolean;
  onRewardEarned?: () => void;
}

export function AdMobManager({ isPremium, onRewardEarned }: AdMobManagerProps) {
  const {
    isInitialized,
    isBannerVisible,
    showBanner,
    hideBanner,
    removeBanner,
    showInterstitial,
    showRewardAd,
    isAvailable
  } = useAdMob();

  // Auto-show banner for free users when component mounts
  useEffect(() => {
    if (!isPremium && isInitialized && isAvailable) {
      showBanner(BannerAdPosition.BOTTOM_CENTER);
    }

    // Cleanup: remove banner when component unmounts or user becomes premium
    return () => {
      if (isBannerVisible) {
        removeBanner();
      }
    };
  }, [isPremium, isInitialized, isAvailable]);

  // Hide ads for premium users
  useEffect(() => {
    if (isPremium && isBannerVisible) {
      removeBanner();
    }
  }, [isPremium, isBannerVisible]);

  const handleRewardAd = async () => {
    const rewarded = await showRewardAd();
    if (rewarded && onRewardEarned) {
      onRewardEarned();
    }
  };

  // Don't render anything if AdMob is not available or user is premium
  if (!isAvailable || isPremium) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Banner Ad Controls (for testing) */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-yellow-800 mb-2">
              AdMob Controls (Development Only)
            </h3>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => showBanner(BannerAdPosition.BOTTOM_CENTER)}
                disabled={isBannerVisible}
                data-testid="show-banner-ad"
              >
                <Eye className="h-3 w-3 mr-1" />
                Show Banner
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={hideBanner}
                disabled={!isBannerVisible}
                data-testid="hide-banner-ad"
              >
                <EyeOff className="h-3 w-3 mr-1" />
                Hide Banner
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={showInterstitial}
                data-testid="show-interstitial-ad"
              >
                Show Interstitial
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={handleRewardAd}
                data-testid="show-reward-ad"
              >
                <Gift className="h-3 w-3 mr-1" />
                Watch Reward Ad
              </Button>
            </div>
            
            <p className="text-xs text-yellow-700 mt-2">
              Status: {isInitialized ? 'Initialized' : 'Not initialized'} | 
              Banner: {isBannerVisible ? 'Visible' : 'Hidden'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}