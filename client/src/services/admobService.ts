import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition, RewardAdOptions } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';
import { SafeArea } from 'capacitor-plugin-safe-area';
import { AppTrackingTransparency } from 'capacitor-plugin-app-tracking-transparency';

// Diagnostic flag — was used to force iOS to request Google's guaranteed-fill
// test banner instead of the real ad unit, to confirm the banner mechanism
// itself rendered correctly on iOS independent of real-ad fill rate. Confirmed
// working (Aug 2026), so this is back to false — iOS now requests real ads.
const FORCE_IOS_TEST_BANNER = false;

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

  // iOS-only: real ad fill depends heavily on the IDFA being available, which
  // requires the user to have granted App Tracking Transparency. Request it
  // before AdMob initializes so the SDK's first ad requests already reflect
  // the user's choice. Safe no-op on Android and web (plugin is iOS-only, but
  // guarded here anyway in case it's ever called on another platform).
  private async requestIOSTrackingPermission(): Promise<void> {
    if (Capacitor.getPlatform() !== 'ios') return;
    try {
      const { status } = await AppTrackingTransparency.getStatus();
      if (status === 'notDetermined') {
        const result = await AppTrackingTransparency.requestPermission();
        console.log(`[AdMob] App Tracking Transparency permission: ${result.status}`);
      } else {
        console.log(`[AdMob] App Tracking Transparency already resolved: ${status}`);
      }
    } catch (err) {
      console.warn('[AdMob] Failed to request App Tracking Transparency permission:', err);
    }
  }

  async initialize(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      await this.requestIOSTrackingPermission();
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
    if (platform === 'ios' && type === 'banner' && FORCE_IOS_TEST_BANNER) {
      return 'ca-app-pub-3940256099942544/2934735716'; // Google's official iOS test banner ID
    }
    return this.adUnitIds[type][platform as 'android' | 'ios'] || this.adUnitIds[type].android;
  }

  private async getAndroidBottomMargin(): Promise<number> {
    if (Capacitor.getPlatform() !== 'android') return 0;
    try {
      const { insets } = await SafeArea.getSafeAreaInsets();
      console.log(`[AdMob] raw safe-area inset.bottom: ${insets.bottom}px`);
      // Pinned to a flat 48px — the minimum needed to clear a standard 3-button
      // nav bar without the banner sitting under/behind the nav buttons. Going
      // lower risks that overlap, so this is as close to the nav bar as it's
      // safe to sit. (Was a 48-80px range following the raw safe-area inset,
      // which floated higher than necessary on some devices and cramped the
      // content above it.)
      return 48;
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