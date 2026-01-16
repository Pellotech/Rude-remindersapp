
import { Capacitor } from '@capacitor/core';
import { getFullApiUrl } from '@/lib/queryClient';

export class RevenueCatService {
  private static instance: RevenueCatService;
  private isInitialized = false;

  static getInstance(): RevenueCatService {
    if (!RevenueCatService.instance) {
      RevenueCatService.instance = new RevenueCatService();
    }
    return RevenueCatService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized || !Capacitor.isNativePlatform()) {
      return;
    }

    try {
      // Import RevenueCat plugin dynamically to avoid web build issues
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      
      // Configure RevenueCat with API key
      // This must be called before any other Purchases methods
      const platform = Capacitor.getPlatform();
      
      // Use environment variables to support switching between test and production
      // PRODUCTION MODE: Using production API keys
      // Get your production keys from RevenueCat Dashboard > Projects > API Keys
      const apiKey = platform === 'ios' 
        ? (import.meta.env.VITE_REVENUECAT_IOS_API_KEY || 'YOUR_PRODUCTION_IOS_API_KEY_HERE')
        : (import.meta.env.VITE_REVENUECAT_ANDROID_API_KEY || 'YOUR_PRODUCTION_ANDROID_API_KEY_HERE');
      
      await Purchases.configure({ apiKey });
      console.log('RevenueCat configured for platform:', platform);
      
      // RevenueCat will use an anonymous user ID by default
      // This allows guest purchases without requiring login (Apple Guideline 5.1.1)
      // User purchases will still be tracked by Apple/Google account

      this.isInitialized = true;
      console.log('RevenueCat initialized successfully (anonymous mode)');
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error);
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
