import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BannerAdPosition } from '@capacitor-community/admob';
import { useAdMob } from '@/hooks/useAdMob';
import { Eye, EyeOff } from 'lucide-react';

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

  // Auto-show banner for all users (free and premium) when component mounts
  useEffect(() => {
    if (isInitialized && isAvailable) {
      showBanner(BannerAdPosition.BOTTOM_CENTER);
    }

    // Cleanup: remove banner when component unmounts (navigating away from Home).
    // Always attempt removal here — don't gate on `isBannerVisible`, since that state
    // is captured in this effect's closure at mount time and never updates before
    // unmount, so the guard was always stale-false and removeBanner() never ran.
    // That's why the native banner kept floating over other screens (e.g. covering
    // the Save button on Settings) after navigating away from Home. removeBannerAd()
    // already safely no-ops (with a caught error) if there's nothing to remove.
    return () => {
      removeBanner();
    };
  }, [isInitialized, isAvailable]);

  // FREE users: a full-screen ad after every reminder they create (normal or Quick).
  // It waits until Reem's button-shove animation has finished (~2.5s) so the two
  // never overlap. A short 30s guard stops back-to-back ads if someone fires
  // several Quick Reminders in a row (keeps us inside Google's ad-frequency rules).
  useEffect(() => {
    if (isPremium || !showInterstitialOnAction || actionCount <= 0) return;
    const now = Date.now();
    if (now - lastInterstitialTime < 30 * 1000) {
      console.log('[AdMob] Interstitial skipped — one was shown less than 30s ago');
      return;
    }
    const t = setTimeout(() => {
      showInterstitial();
      setLastInterstitialTime(Date.now());
    }, 2800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionCount]);

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

  // Don't render anything if AdMob is not available
  if (!isAvailable) {
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
              
              {!isPremium && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={showInterstitial}
                  data-testid="show-interstitial-ad"
                >
                  Show Interstitial
                </Button>
              )}
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