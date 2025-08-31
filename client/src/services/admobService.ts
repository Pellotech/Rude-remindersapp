import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition, RewardAdOptions } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

export class AdMobService {
  private static instance: AdMobService;
  private isInitialized = false;
  
  // Real Ad Unit IDs from environment variables
  private readonly adUnitIds = {
    banner: {
      android: import.meta.env.VITE_ADMOB_ANDROID_BANNER_ID || 'ca-app-pub-3940256099942544/6300978111',
      ios: import.meta.env.VITE_ADMOB_IOS_BANNER_ID || 'ca-app-pub-3940256099942544/2934735716'
    },
    interstitial: {
      android: import.meta.env.VITE_ADMOB_ANDROID_INTERSTITIAL_ID || 'ca-app-pub-3940256099942544/1033173712',
      ios: import.meta.env.VITE_ADMOB_IOS_INTERSTITIAL_ID || 'ca-app-pub-3940256099942544/4411468910'
    },
    reward: {
      android: import.meta.env.VITE_ADMOB_ANDROID_REWARD_ID || 'ca-app-pub-3940256099942544/5224354917',
      ios: import.meta.env.VITE_ADMOB_IOS_REWARD_ID || 'ca-app-pub-3940256099942544/1712485313'
    }
  };

  public static getInstance(): AdMobService {
    if (!AdMobService.instance) {
      AdMobService.instance = new AdMobService();
    }
    return AdMobService.instance;
  }

  async initialize(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.log('AdMob not available on web platform');
      return;
    }

    try {
      await AdMob.initialize({
        testingDevices: [], // Add your test device IDs here if needed
        initializeForTesting: false, // Production mode
      });
      
      this.isInitialized = true;
      console.log('AdMob initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AdMob:', error);
    }
  }

  private getAdUnitId(type: 'banner' | 'interstitial' | 'reward'): string {
    const platform = Capacitor.getPlatform();
    return this.adUnitIds[type][platform as 'android' | 'ios'] || this.adUnitIds[type].android;
  }

  async showBannerAd(position: BannerAdPosition = BannerAdPosition.BOTTOM_CENTER): Promise<void> {
    if (!this.isInitialized || !Capacitor.isNativePlatform()) {
      return;
    }

    try {
      const options: BannerAdOptions = {
        adId: this.getAdUnitId('banner'),
        adSize: BannerAdSize.BANNER,
        position: position,
        margin: 0,
        isTesting: false, // Production mode
      };

      await AdMob.showBanner(options);
      console.log('Banner ad shown successfully');
    } catch (error) {
      console.error('Failed to show banner ad:', error);
    }
  }

  async hideBannerAd(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      await AdMob.hideBanner();
      console.log('Banner ad hidden');
    } catch (error) {
      console.error('Failed to hide banner ad:', error);
    }
  }

  async showInterstitialAd(): Promise<void> {
    if (!this.isInitialized || !Capacitor.isNativePlatform()) {
      return;
    }

    try {
      const options = {
        adId: this.getAdUnitId('interstitial'),
        isTesting: false, // Production mode
      };

      await AdMob.prepareInterstitial(options);
      await AdMob.showInterstitial();
      console.log('Interstitial ad shown successfully');
    } catch (error) {
      console.error('Failed to show interstitial ad:', error);
    }
  }

  async showRewardAd(): Promise<boolean> {
    if (!this.isInitialized || !Capacitor.isNativePlatform()) {
      return false;
    }

    try {
      const options: RewardAdOptions = {
        adId: this.getAdUnitId('reward'),
        isTesting: false, // Production mode
      };

      await AdMob.prepareRewardVideoAd(options);
      const result = await AdMob.showRewardVideoAd();
      
      console.log('Reward ad shown successfully');
      return Boolean(result);
    } catch (error) {
      console.error('Failed to show reward ad:', error);
      return false;
    }
  }

  async removeBannerAd(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      await AdMob.removeBanner();
      console.log('Banner ad removed');
    } catch (error) {
      console.error('Failed to remove banner ad:', error);
    }
  }

  isAvailable(): boolean {
    return Capacitor.isNativePlatform() && this.isInitialized;
  }
}