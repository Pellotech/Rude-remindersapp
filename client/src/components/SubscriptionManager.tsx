import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Crown, Sparkles, Home, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getPlatformInfo } from '@/utils/platformDetection';
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SubscriptionManagerProps {
  isAuthenticated?: boolean;
  user?: any;
}

async function loadOfferingsSafe() {
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    
    try {
      const offeringsResult: any = await Purchases.getOfferings();
      if (offeringsResult.current) {
        return offeringsResult;
      }
    } catch (e) {
      console.warn("Offerings failed, attempting sync:", e);
    }

    await Purchases.syncPurchases();

    try {
      const offeringsResult: any = await Purchases.getOfferings();
      return offeringsResult;
    } catch (e) {
      console.error("Offerings failed after sync:", e);
      return null;
    }
  } catch (e) {
    console.error("Failed to load offerings:", e);
    return null;
  }
}

export default function SubscriptionManager({ isAuthenticated = false, user }: SubscriptionManagerProps) {
  const [loading, setLoading] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [offeringsError, setOfferingsError] = useState(false);
  const { toast } = useToast();
  const platform = getPlatformInfo();

  const isSubscribed = user?.subscriptionStatus === 'active';

  // Handle guest users - force login before subscribing
  const handleGuestSubscribe = () => {
    toast({
      title: "Sign in Required",
      description: "Create an account to subscribe.",
      variant: "default",
    });
    setTimeout(() => {
      window.location.href = '/login';
    }, 500);
  };

  const handleSubscribe = async () => {
    setLoading(true);
    setOfferingsError(false);

    try {
      if (platform.isNative) {
        const offeringsResult = await loadOfferingsSafe();
        
        if (!offeringsResult || !offeringsResult.current) {
          setOfferingsError(true);
          setLoading(false);
          return;
        }

        const packages = offeringsResult.current.availablePackages;
        const annualPackage = packages.find((p: any) => 
          p.identifier === '$rc_annual' || 
          p.packageType === 'ANNUAL' ||
          p.identifier.includes('annual') ||
          p.identifier.includes('yearly')
        );
        
        const selectedPackage = annualPackage || packages[0];
        
        if (!selectedPackage) {
          setOfferingsError(true);
          setLoading(false);
          return;
        }

        const { Purchases } = await import('@revenuecat/purchases-capacitor');
        
        try {
          const { customerInfo } = await Purchases.purchasePackage({
            aPackage: selectedPackage
          });

          const isPremiumNow = Object.keys(customerInfo.entitlements.active).length > 0;
          
          if (isPremiumNow) {
            toast({
              title: "Success!",
              description: "Subscription activated!",
            });
            
            // Refresh user data
            queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
            setTimeout(() => {
              window.location.href = '/subscribe';
            }, 1500);
          }
        } catch (purchaseError: any) {
          if (purchaseError.userCancelled) {
            console.log('User cancelled purchase');
            return;
          }
          
          if (purchaseError.code === 509 || purchaseError.code === '509') {
            setOfferingsError(true);
            toast({
              title: "Sandbox Account Required",
              description: "Please sign into a Sandbox App Store account for testing.",
              variant: "destructive",
            });
            return;
          }
          
          console.error('Purchase failed:', purchaseError);
          toast({
            title: "Purchase Failed",
            description: "Please try again.",
            variant: "destructive",
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCanceling(true);
    try {
      const data = await apiRequest("/api/cancel-subscription", { method: "POST" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Cancellation",
        description: data.message || "Please manage your subscription through your device settings.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCanceling(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-lg mx-auto">
        <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-[#38383A] safe-area-header">
          <div className="flex items-center justify-between px-4 py-3">
            {isSubscribed ? (
              <>
                <Link href="/settings">
                  <div className="flex items-center text-[#0A84FF] cursor-pointer" data-testid="button-back">
                    <ChevronLeft className="h-5 w-5" />
                    <span className="text-[17px]">Settings</span>
                  </div>
                </Link>
                <Link href="/">
                  <div className="text-[#0A84FF] cursor-pointer" data-testid="button-home">
                    <Home className="h-5 w-5" />
                  </div>
                </Link>
              </>
            ) : (
              <Link href="/">
                <div className="flex items-center text-[#0A84FF] cursor-pointer" data-testid="button-back">
                  <ChevronLeft className="h-5 w-5" />
                  <span className="text-[17px]">Back</span>
                </div>
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center p-4 pt-8">
          <div className="w-full max-w-md">
            {isSubscribed ? (
              // Subscription Active View
              <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden p-8">
                <div className="text-center space-y-8">
                  <div className="relative inline-block">
                    <Crown className="h-24 w-24 mx-auto text-purple-500" />
                    <Sparkles className="h-8 w-8 absolute -top-2 -right-2 text-yellow-500 animate-pulse" />
                  </div>
                
                  <div>
                    <h1 className="text-4xl font-bold text-white mb-3">
                      Premium Active!
                    </h1>
                    <p className="text-[#8E8E93] text-lg">
                      You have access to all premium features
                    </p>
                  </div>

                  <div className="bg-[#2C2C2E] rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[#8E8E93]">Plan</span>
                      <span className="text-white font-semibold">{user?.subscriptionPlan === 'premium' ? 'Premium' : 'Free'}</span>
                    </div>
                    {user?.subscriptionEndsAt && (
                      <div className="flex justify-between items-center">
                        <span className="text-[#8E8E93]">Renews</span>
                        <span className="text-white">{new Date(user.subscriptionEndsAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={handleCancelSubscription}
                      disabled={canceling}
                      className="w-full py-3.5 bg-red-600/20 text-red-500 text-lg rounded-lg font-semibold active:opacity-70 disabled:opacity-50 border border-red-500/30"
                      data-testid="button-cancel-subscription"
                    >
                      {canceling ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin inline" />
                          Canceling...
                        </>
                      ) : (
                        'Cancel Subscription'
                      )}
                    </button>
                  </div>

                  <p className="text-sm text-[#8E8E93]">
                    You'll keep access until your renewal date
                  </p>
                </div>
              </div>
            ) : (
              // Available Plans View
              <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden p-8">
                <div className="text-center space-y-8">
                  <div className="relative inline-block">
                    <Crown className="h-24 w-24 mx-auto text-purple-500" />
                    <Sparkles className="h-8 w-8 absolute -top-2 -right-2 text-yellow-500 animate-pulse" />
                  </div>
                
                  <div>
                    <h1 className="text-4xl font-bold text-white mb-3">
                      Unlock Premium
                    </h1>
                    <p className="text-[#8E8E93] text-lg">
                      Get all advanced reminder features
                    </p>
                  </div>

                  {offeringsError && (
                    <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
                      <p className="text-sm text-yellow-200">
                        Please sign into a Sandbox App Store account to test purchases.
                      </p>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <Button 
                      onClick={isAuthenticated ? handleSubscribe : handleGuestSubscribe}
                      disabled={loading}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white text-lg py-7"
                      size="lg"
                      data-testid="button-subscribe-now"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Crown className="h-6 w-6 mr-3" />
                          {isAuthenticated ? 'Subscribe Now' : 'Sign in to Subscribe'}
                        </>
                      )}
                    </Button>
                  </div>

                  <p className="text-sm text-[#8E8E93]">
                    {isAuthenticated ? 'Unlock all premium features' : 'Create an account to unlock premium'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
