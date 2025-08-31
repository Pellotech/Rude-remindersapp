import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BannerAdPosition } from '@capacitor-community/admob';
import { useAdMob } from '@/hooks/useAdMob';
import { Gift, Eye, EyeOff, Clock, Zap } from 'lucide-react';

interface AdMobManagerProps {
  isPremium: boolean;
  onRewardEarned?: () => void;
  showInterstitialOnAction?: boolean; // Show interstitial ads on certain actions
  actionCount?: number; // Number of actions performed (for timing interstitials)
}

export function AdMobManager({ 
  isPremium, 
  onRewardEarned, 
  showInterstitialOnAction = false,
  actionCount = 0 
}: AdMobManagerProps) {
  const [lastInterstitialTime, setLastInterstitialTime] = useState(0);
  const [rewardCooldown, setRewardCooldown] = useState(0);
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

  // Show interstitial ad every 5 actions (respectfully)
  useEffect(() => {
    if (!isPremium && showInterstitialOnAction && actionCount > 0 && actionCount % 5 === 0) {
      const now = Date.now();
      const minIntervalMs = 5 * 60 * 1000; // 5 minutes minimum between interstitials
      
      if (now - lastInterstitialTime > minIntervalMs) {
        setTimeout(() => {
          showInterstitial();
          setLastInterstitialTime(now);
        }, 1000); // Small delay to not interrupt user flow
      }
    }
  }, [actionCount, isPremium, showInterstitialOnAction, lastInterstitialTime]);

  // Reward ad cooldown effect
  useEffect(() => {
    if (rewardCooldown > 0) {
      const timer = setTimeout(() => setRewardCooldown(rewardCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [rewardCooldown]);

  const handleRewardAd = useCallback(async () => {
    if (rewardCooldown > 0) return;
    
    const rewarded = await showRewardAd();
    if (rewarded) {
      setRewardCooldown(60); // 1 minute cooldown
      if (onRewardEarned) {
        onRewardEarned();
      }
    }
  }, [showRewardAd, onRewardEarned, rewardCooldown]);

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
                disabled={rewardCooldown > 0}
                data-testid="show-reward-ad"
              >
                {rewardCooldown > 0 ? (
                  <>
                    <Clock className="h-3 w-3 mr-1" />
                    Wait {rewardCooldown}s
                  </>
                ) : (
                  <>
                    <Gift className="h-3 w-3 mr-1" />
                    Watch Reward Ad
                  </>
                )}
              </Button>
            </div>
            
            <p className="text-xs text-yellow-700 mt-2">
              Status: {isInitialized ? 'Initialized' : 'Not initialized'} | 
              Banner: {isBannerVisible ? 'Visible' : 'Hidden'} |
              Reward Cooldown: {rewardCooldown}s
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}