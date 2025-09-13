
import { Capacitor } from '@capacitor/core';

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
      // RevenueCat will be initialized with the API keys from Info.plist (iOS) 
      // and AndroidManifest.xml (Android) when the native app starts
      // No additional configuration needed here for API keys
      
      // Import RevenueCat plugin dynamically to avoid web build issues
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      
      // Configure with your app user ID (from your auth system)
      const userId = await this.getCurrentUserId();
      if (userId) {
        await Purchases.logIn({ appUserID: userId });
      }

      this.isInitialized = true;
      console.log('RevenueCat initialized successfully');
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error);
    }
  }

  async getCurrentUserId(): Promise<string | null> {
    try {
      // Get user ID from your auth system
      const response = await fetch('/api/auth/user');
      if (response.ok) {
        const user = await response.json();
        return user.id;
      }
    } catch (error) {
      console.error('Failed to get current user:', error);
    }
    return null;
  }

  async purchaseProduct(productId: string): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      // Redirect to mobile app download page for web users
      window.location.href = '/subscribe';
      return false;
    }

    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const { customerInfo } = await Purchases.purchaseProduct({ product: productId });
      return Object.keys(customerInfo.entitlements.active).length > 0;
    } catch (error) {
      console.error('Purchase failed:', error);
      return false;
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
      const response = await fetch('/api/customer-info');
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
