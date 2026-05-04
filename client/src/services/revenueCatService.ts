
import { Capacitor } from '@capacitor/core';
import { getFullApiUrl } from '@/lib/queryClient';

// RevenueCat enabled for production
const DISABLE_REVENUECAT = false;

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
    if (DISABLE_REVENUECAT) {
      return;
    }
    
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    
    // Check module-level flag first (already configured this session)
    if (revenueCatConfigured) {
      return;
    }
    
    // Check session storage (survives WebView reloads within same app session)
    if (wasConfiguredThisSession()) {
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
      
      // Skip isConfigured() check as it's inconsistent across versions
      // We rely on our own module-level + sessionStorage guards
      
      const platform = Capacitor.getPlatform();
      const envKey = platform === 'ios' 
        ? import.meta.env.VITE_REVENUECAT_IOS_API_KEY
        : import.meta.env.VITE_REVENUECAT_ANDROID_API_KEY;
      
      // Use env var, or fallback to hardcoded key for builds where env may not be available
      const apiKey = envKey || (platform === 'ios' ? 'appl_EcOTAAHXxtTgOjDXhasLTEmAbPP' : platform === 'android' ? 'goog_SrKZBDuIqerjUKIdeMidlBWbpLA' : null);
      
      if (!apiKey) {
        console.error('RevenueCat API key not configured for platform:', platform);
        return;
      }
      
      console.log('RevenueCat: Calling configure for platform:', platform, 'with key prefix:', apiKey.substring(0, 5) + '...');
      await Purchases.configure({ apiKey });
      console.log('RevenueCat: Successfully configured for platform:', platform);
      
      revenueCatConfigured = true;
      markConfigured();
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error);
      initializationPromise = null;
    }
  }


  async logIn(userId: string): Promise<void> {
    if (!Capacitor.isNativePlatform() || !userId) return;
    try {
      await this.initialize();
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const result: any = await Purchases.logIn({ appUserID: userId });
      console.log('RevenueCat: logIn success for', userId, 'created:', result?.created);
    } catch (error) {
      console.error('RevenueCat logIn failed:', error);
    }
  }

  async logOut(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      await Purchases.logOut();
      console.log('RevenueCat: logOut success');
    } catch (error) {
      console.error('RevenueCat logOut failed:', error);
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
