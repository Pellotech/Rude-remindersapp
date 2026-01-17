
import { Capacitor } from '@capacitor/core';
import { getFullApiUrl } from '@/lib/queryClient';

// TEMPORARY: Completely disable RevenueCat to debug reload loop
const DISABLE_REVENUECAT = true;

let revenueCatConfigured = false;
let initializationPromise: Promise<void> | null = null;

export class RevenueCatService {
  private static instance: RevenueCatService;

  static getInstance(): RevenueCatService {
    if (!RevenueCatService.instance) {
      RevenueCatService.instance = new RevenueCatService();
    }
    return RevenueCatService.instance;
  }

  async initialize(): Promise<void> {
    if (DISABLE_REVENUECAT) {
      console.log('RevenueCat DISABLED for debugging');
      return;
    }
    
    if (revenueCatConfigured || !Capacitor.isNativePlatform()) {
      return;
    }

    if (initializationPromise) {
      return initializationPromise;
    }

    initializationPromise = this.doInitialize();
    return initializationPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      
      // Check if RevenueCat is already configured at native level
      // This handles WebView reloads where JS context resets but native SDK persists
      try {
        const { isConfigured } = await Purchases.isConfigured();
        if (isConfigured) {
          console.log('RevenueCat already configured at native level, skipping');
          revenueCatConfigured = true;
          return;
        }
      } catch {
        // isConfigured not available in older versions, continue with configure
      }
      
      const platform = Capacitor.getPlatform();
      const apiKey = platform === 'ios' 
        ? (import.meta.env.VITE_REVENUECAT_IOS_API_KEY || 'YOUR_PRODUCTION_IOS_API_KEY_HERE')
        : (import.meta.env.VITE_REVENUECAT_ANDROID_API_KEY || 'YOUR_PRODUCTION_ANDROID_API_KEY_HERE');
      
      await Purchases.configure({ apiKey });
      console.log('RevenueCat configured for platform:', platform);
      
      revenueCatConfigured = true;
      console.log('RevenueCat initialized successfully (anonymous mode)');
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error);
      initializationPromise = null;
    }
  }


  async restorePurchases(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const { customerInfo } = await Purchases.restorePurchases();
      return Object.keys(customerInfo.entitlements.active).length > 0;
    } catch (error) {
      console.error('Restore failed:', error);
      return false;
    }
  }

  async getCustomerInfo(): Promise<any> {
    if (!Capacitor.isNativePlatform()) {
      // Fall back to server-side customer info for web
      const response = await fetch(getFullApiUrl('/api/customer-info'), {
        credentials: 'include',
      });
      return response.json();
    }

    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const { customerInfo } = await Purchases.getCustomerInfo();
      return customerInfo;
    } catch (error) {
      console.error('Failed to get customer info:', error);
      return null;
    }
  }
}

export const revenueCatService = RevenueCatService.getInstance();
