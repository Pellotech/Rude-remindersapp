import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import { Purchases } from '@revenuecat/purchases-js';
import { getPlatformInfo } from '@/utils/platformDetection';
import PremiumScreen from '@/components/PremiumScreen';

export default function Subscribe() {
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const platform = getPlatformInfo();

  const fetchCustomerInfo = () => {
    setLoading(true);
    
    apiRequest("/api/customer-info", { method: 'GET' })
      .then((data) => {
        setCustomerInfo(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to fetch customer info:', error);
        setCustomerInfo(null);
        setLoading(false);
      });
  };

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
      const user = await apiRequest("/api/auth/user", { method: 'GET' });
      const userId = user.id || `guest-${Date.now()}`;
      
      Purchases.configure({
        apiKey: apiKey,
        appUserId: userId,
      });
      
      console.log('RevenueCat Web SDK configured');
    } catch (error) {
      console.error('Failed to configure RevenueCat Web SDK:', error);
    }
  };

  useEffect(() => {
    fetchCustomerInfo();
    initializeRevenueCat();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const isPremium = customerInfo?.subscriptionStatus === 'active';

  return (
    <PremiumScreen 
      isPremium={isPremium}
      onViewSubscription={() => window.location.href = '/settings'}
    />
  );
}
