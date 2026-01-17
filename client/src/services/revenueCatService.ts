
import { Capacitor } from '@capacitor/core';
import { getFullApiUrl } from '@/lib/queryClient';

// Use sessionStorage to persist configuration state across WebView reloads
const STORAGE_KEY = 'revenuecat_configured';
let revenueCatConfigured = false;
let initializationPromise: Promise<void> | null = null;

// Check if we already configured in this session (survives WebView reloads)
function wasConfiguredThisSession(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function markConfigured(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    // Ignore storage errors
  }
}

export class RevenueCatService {
  private static instance: RevenueCatService;

  static getInstance(): RevenueCatService {
    if (!RevenueCatService.instance) {
      RevenueCatService.instance = new RevenueCatService();
    }
    return RevenueCatService.instance;
  }

  async initialize(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    
    // Check module-level flag first
    if (revenueCatConfigured) {
      console.log('RevenueCat already configured (module flag)');
      return;
    }
    
    // Check session storage (survives WebView reloads within same app session)
    if (wasConfiguredThisSession()) {
      console.log('RevenueCat already configured (session storage)');
      revenueCatConfigured = true;
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
      try {
        const { isConfigured } = await Purchases.isConfigured();
        if (isConfigured) {
          console.log('RevenueCat already configured at native level');
          revenueCatConfigured = true;
          markConfigured();
          return;
        }
      } catch {
        // isConfigured not available in older versions, continue with configure
      }
      
      const platform = Capacitor.getPlatform();
      const apiKey = platform === 'ios' 
        ? (import.meta.env.VITE_REVENUECAT_IOS_API_KEY || 'appl_EcOTAAHXxtTgOjDXhasLTEmAbPP')
        : (import.meta.env.VITE_REVENUECAT_ANDROID_API_KEY || 'YOUR_PRODUCTION_ANDROID_API_KEY_HERE');
      
      await Purchases.configure({ apiKey });
      console.log('RevenueCat configured for platform:', platform);
      
      revenueCatConfigured = true;
      markConfigured();
      console.log('RevenueCat initialized successfully');
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
