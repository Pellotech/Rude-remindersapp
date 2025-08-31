import { useEffect, useState } from 'react';
import { BannerAdPosition } from '@capacitor-community/admob';
import { AdMobService } from '@/services/admobService';

export function useAdMob() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const adMobService = AdMobService.getInstance();

  useEffect(() => {
    const initializeAdMob = async () => {
      await adMobService.initialize();
      setIsInitialized(adMobService.isAvailable());
    };

    initializeAdMob();
  }, []);

  const showBanner = async (position?: BannerAdPosition) => {
    if (!isInitialized) return;
    
    try {
      await adMobService.showBannerAd(position);
      setIsBannerVisible(true);
    } catch (error) {
      console.error('Failed to show banner:', error);
    }
  };

  const hideBanner = async () => {
    if (!isInitialized) return;
    
    try {
      await adMobService.hideBannerAd();
      setIsBannerVisible(false);
    } catch (error) {
      console.error('Failed to hide banner:', error);
    }
  };

  const removeBanner = async () => {
    if (!isInitialized) return;
    
    try {
      await adMobService.removeBannerAd();
      setIsBannerVisible(false);
    } catch (error) {
      console.error('Failed to remove banner:', error);
    }
  };

  const showInterstitial = async () => {
    if (!isInitialized) return;
    
    try {
      await adMobService.showInterstitialAd();
    } catch (error) {
      console.error('Failed to show interstitial:', error);
    }
  };

  const showRewardAd = async (): Promise<boolean> => {
    if (!isInitialized) return false;
    
    try {
      return await adMobService.showRewardAd();
    } catch (error) {
      console.error('Failed to show reward ad:', error);
      return false;
    }
  };

  return {
    isInitialized,
    isBannerVisible,
    showBanner,
    hideBanner,
    removeBanner,
    showInterstitial,
    showRewardAd,
    isAvailable: adMobService.isAvailable()
  };
}