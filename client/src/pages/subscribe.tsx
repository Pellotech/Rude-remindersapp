import { useEffect, useState } from 'react';
import { useAuth } from "@/hooks/useAuth";
import { RoseLoader } from "@/components/SplashScreen";
import { Purchases } from '@revenuecat/purchases-js';
import { apiRequest } from "@/lib/queryClient";
import { getPlatformInfo } from '@/utils/platformDetection';
import SubscriptionManager from '@/components/SubscriptionManager';

export default function Subscribe() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const [revenueCatReady, setRevenueCatReady] = useState(true);
  const platform = getPlatformInfo();

  useEffect(() => {
    const initializeRevenueCat = async () => {
      if (platform.isNative) {
        return;
      }

      const apiKey = import.meta.env.VITE_REVENUECAT_WEB_API_KEY;
      
      if (!apiKey) {
        console.warn('RevenueCat Web API key not configured');
        return;
      }

      try {
        const currentUser = await apiRequest("/api/auth/user", { method: 'GET' });
        const userId = currentUser?.id || `guest-${Date.now()}`;
        
        Purchases.configure({
          apiKey: apiKey,
          appUserId: userId,
        });
        
        console.log('RevenueCat Web SDK configured');
      } catch (error) {
        console.error('Failed to configure RevenueCat Web SDK:', error);
      }
    };

    initializeRevenueCat();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <RoseLoader size={64} label="Loading..." />
        </div>
      </div>
    );
  }

  return (
    <SubscriptionManager 
      isAuthenticated={isAuthenticated}
      user={user}
    />
  );
}
