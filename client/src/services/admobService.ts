import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition, RewardAdOptions } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';
import { SafeArea } from 'capacitor-plugin-safe-area';

export class AdMobService {
  private static instance: AdMobService;
  private isInitialized = false;

  // Ad Unit IDs are loaded from the server at initialize() so we can keep them
  // in server-side secrets (ADMOB_IOS_BANNER_ID, ADMOB_ANDROID_BANNER_ID, etc.)
  // without requiring VITE_ env vars baked into the bundle. Fallbacks are
  // Google's official test IDs in case the fetch fails — never real revenue.
  private adUnitIds = {
    banner: {
      android: 'ca-app-pub-3940256099942544/6300978111',
      ios: 'ca-app-pub-3940256099942544/2934735716',
    },
    interstitial: {
      android: 'ca-app-pub-3940256099942544/1033173712',
      ios: 'ca-app-pub-3940256099942544/4411468910',
    },
    reward: {
      android: 'ca-app-pub-3940256099942544/5224354917',
      ios: 'ca-app-pub-3940256099942544/1712485313',
    },
  };

  public static getInstance(): AdMobService {
    if (!AdMobService.instance) {
      AdMobService.instance = new AdMobService();
    }
    return AdMobService.instance;
  }

  private async loadAdUnitIds(): Promise<void> {
    try {
      const res = await fetch('/api/config/admob');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const cfg = await res.json() as {
        ios: { banner: string; interstitial: string; reward: string };
        android: { banner: string; interstitial: string; reward: string };
      };
      // Only overwrite when server returned a non-empty value; otherwise keep test fallback.
      if (cfg.ios?.banner)        this.adUnitIds.banner.ios = cfg.ios.banner;
      if (cfg.ios?.interstitial)  this.adUnitIds.interstitial.ios = cfg.ios.interstitial;
      if (cfg.ios?.reward)        this.adUnitIds.reward.ios = cfg.ios.reward;
      if (cfg.android?.banner)        this.adUnitIds.banner.android = cfg.android.banner;
      if (cfg.android?.interstitial)  this.adUnitIds.interstitial.android = cfg.android.interstitial;
      if (cfg.android?.reward)        this.adUnitIds.reward.android = cfg.android.reward;
      const platform = Capacitor.getPlatform() as 'ios' | 'android';
      const usingReal = !this.adUnitIds.banner[platform].startsWith('ca-app-pub-3940256099942544');
      console.log(`[AdMob] Loaded ad unit IDs from server (${platform}, real=${usingReal})`);
    } catch (err) {
      console.warn('[AdMob] Failed to load ad unit IDs from server, falling back to test IDs:', err);
    }
  }

  async initialize(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      await this.loadAdUnitIds();

      await AdMob.initialize({
        testingDevices: [],
        initializeForTesting: false,
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

  private async getAndroidBottomMargin(): Promise<number> {
    if (Capacitor.getPlatform() !== 'android') return 0;
    try {
      const { insets } = await SafeArea.getSafeAreaInsets();
      console.log(`[AdMob] raw safe-area inset.bottom: ${insets.bottom}px`);
      // Clamp between a 48px floor (clears a standard 3-button nav bar — don't go
      // lower, or the banner risks sitting under/behind the nav buttons) and a
      // 56px ceiling (keeps the banner hugging the nav bar instead of floating
      // further up the screen and cramping the content above it).
      return Math.min(Math.max(insets.bottom, 48), 56);
    } catch {
      return 48;
    }
  }

  async showBannerAd(position: BannerAdPosition = BannerAdPosition.BOTTOM_CENTER): Promise<void> {
    if (!this.isInitialized || !Capacitor.isNativePlatform()) {
      return;
    }

    try {
      const margin = await this.getAndroidBottomMargin();
      const options: BannerAdOptions = {
        adId: this.getAdUnitId('banner'),
        adSize: BannerAdSize.BANNER,
        position: position,
        margin: margin,
        isTesting: false,
      };

      await AdMob.showBanner(options);
      console.log(`Banner ad shown successfully (margin: ${margin}px)`);
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