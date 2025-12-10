import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, Crown, Sparkles, Home, ChevronLeft, ChevronRight, Check } from "lucide-react";
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
  const [showPlans, setShowPlans] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
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

  // Go to plan selection screen
  const handleShowPlans = () => {
    if (!isAuthenticated) {
      handleGuestSubscribe();
      return;
    }
    setShowPlans(true);
  };

  // Go back to unlock premium screen
  const handleBackFromPlans = () => {
    setShowPlans(false);
  };

  // Handle purchase with selected plan
  const handlePurchase = async () => {
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
        
        // Find the package based on user's selection
        let packageToPurchase;
        if (selectedPlan === 'yearly') {
          packageToPurchase = packages.find((p: any) => 
            p.identifier === '$rc_annual' || 
            p.packageType === 'ANNUAL' ||
            p.identifier.includes('annual') ||
            p.identifier.includes('yearly')
          );
        } else {
          packageToPurchase = packages.find((p: any) => 
            p.identifier === '$rc_monthly' || 
            p.packageType === 'MONTHLY' ||
            p.identifier.includes('monthly')
          );
        }
        
        // Fallback to first package if not found
        packageToPurchase = packageToPurchase || packages[0];
        
        if (!packageToPurchase) {
          setOfferingsError(true);
          setLoading(false);
          return;
        }

        const { Purchases } = await import('@revenuecat/purchases-capacitor');
        
        try {
          const { customerInfo } = await Purchases.purchasePackage({
            aPackage: packageToPurchase
          });

          const isPremiumNow = Object.keys(customerInfo.entitlements.active).length > 0;
          
          if (isPremiumNow) {
            toast({
              title: "Success!",
              description: "Subscription activated!",
            });
            
            // Sync subscription with backend database
            try {
              await apiRequest("/api/sync-subscription", {
                method: "POST",
                body: JSON.stringify({
                  subscriptionStatus: 'active',
                  subscriptionPlan: 'premium'
                })
              });
            } catch (syncError) {
              console.log('Backend sync will happen via webhook');
            }
            
            // Refresh user data and reload page to show paid member view
            queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
            setTimeout(() => {
              window.location.reload();
            }, 1000);
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
        title: "Manage Subscription",
        description: data.message || "Please manage your subscription through your device settings.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCanceling(false);
    }
  };

  // Render header based on current state
  const renderHeader = () => (
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
        ) : showPlans ? (
          <button 
            onClick={handleBackFromPlans}
            className="flex items-center text-[#0A84FF] cursor-pointer"
            data-testid="button-back-plans"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="text-[17px]">Back</span>
          </button>
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
  );

  // Screen 1: Unlock Premium (Free User)
  const renderUnlockPremium = () => (
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

        <div className="space-y-3">
          <Button 
            onClick={handleShowPlans}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white text-lg py-7"
            size="lg"
            data-testid="button-subscribe-now"
          >
            <Crown className="h-6 w-6 mr-3" />
            Subscribe Now
          </Button>
        </div>

        <p className="text-sm text-[#8E8E93]">
          Unlock all premium features
        </p>
      </div>
    </div>
  );

  // Screen 2: Available Plans Selection
  const renderAvailablePlans = () => (
    <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden p-8">
      <div className="text-center space-y-6">
        {/* App Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
            <span className="text-4xl">😌</span>
          </div>
        </div>
      
        <h1 className="text-2xl font-bold text-white">
          Available Plans
        </h1>

        {/* Plan Options */}
        <div className="space-y-3">
          {/* Monthly Plan */}
          <button
            onClick={() => setSelectedPlan('monthly')}
            className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
              selectedPlan === 'monthly'
                ? 'border-[#0A84FF] bg-[#0A84FF]/10'
                : 'border-[#38383A] bg-[#2C2C2E]'
            }`}
            data-testid="plan-monthly"
          >
            <div className="text-left">
              <div className="text-white font-semibold text-lg">Rude Monthly Pro</div>
              <div className="text-[#8E8E93] text-sm">$6.99 per month</div>
            </div>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
              selectedPlan === 'monthly' 
                ? 'border-[#0A84FF] bg-[#0A84FF]' 
                : 'border-[#48484A]'
            }`}>
              {selectedPlan === 'monthly' && <Check className="h-4 w-4 text-white" />}
            </div>
          </button>

          {/* Yearly Plan */}
          <button
            onClick={() => setSelectedPlan('yearly')}
            className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
              selectedPlan === 'yearly'
                ? 'border-[#0A84FF] bg-[#0A84FF]/10'
                : 'border-[#38383A] bg-[#2C2C2E]'
            }`}
            data-testid="plan-yearly"
          >
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold text-lg">Rude Yearly Pro</span>
                <span className="bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">
                  Save 37%
                </span>
              </div>
              <div className="text-[#8E8E93] text-sm">$59.99 per year</div>
            </div>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
              selectedPlan === 'yearly' 
                ? 'border-[#0A84FF] bg-[#0A84FF]' 
                : 'border-[#48484A]'
            }`}>
              {selectedPlan === 'yearly' && <Check className="h-4 w-4 text-white" />}
            </div>
          </button>
        </div>

        {offeringsError && (
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
            <p className="text-sm text-yellow-200">
              Please sign into a Sandbox App Store account to test purchases.
            </p>
          </div>
        )}

        {/* Continue Button */}
        <div className="pt-4">
          <Button 
            onClick={handlePurchase}
            disabled={loading}
            className="w-full bg-[#0A84FF] hover:bg-[#0A84FF]/90 text-white text-lg py-6"
            size="lg"
            data-testid="button-continue-purchase"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Continue with {selectedPlan === 'yearly' ? 'Yearly' : 'Monthly'}
                <ChevronRight className="h-5 w-5 ml-2" />
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-[#8E8E93]">
          {selectedPlan === 'yearly' ? '$59.99/year' : '$6.99/month'} • Cancel anytime
        </p>
      </div>
    </div>
  );

  // Screen 4: Premium Dashboard (Active Subscription)
  const renderPremiumDashboard = () => (
    <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden p-8">
      <div className="space-y-6">
        {/* App Icon & Title */}
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0">
            <span className="text-3xl">😌</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Rude Reminders</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[#8E8E93]">
                {user?.subscriptionPlan === 'premium' ? 'Premium' : 'Premium'} Plan
              </span>
              <Link href="#" className="text-[#0A84FF] text-sm">
                See All Plans ›
              </Link>
            </div>
          </div>
        </div>

        {/* Subscription Details */}
        <div className="bg-[#2C2C2E] rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="text-[#8E8E93]">💳</div>
            <span className="text-white">$59.99 per year</span>
          </div>
          {user?.subscriptionEndsAt && (
            <div className="flex items-center gap-3">
              <div className="text-[#8E8E93]">📅</div>
              <span className="text-white">
                Renews {new Date(user.subscriptionEndsAt).toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
            </div>
          )}
        </div>

        {/* Cancel Subscription Button */}
        <button
          onClick={handleCancelSubscription}
          disabled={canceling}
          className="w-full py-3.5 bg-transparent text-red-500 text-lg rounded-lg font-medium active:opacity-70 disabled:opacity-50"
          data-testid="button-cancel-subscription"
        >
          {canceling ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin inline" />
              Processing...
            </>
          ) : (
            'Cancel Subscription'
          )}
        </button>

        <p className="text-sm text-[#8E8E93] text-center">
          If you cancel now, you can still access your subscription until{' '}
          {user?.subscriptionEndsAt 
            ? new Date(user.subscriptionEndsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
            : 'the renewal date'
          }.
        </p>

        {/* About link */}
        <div className="text-center pt-2">
          <a href="#" className="text-[#0A84FF] text-sm">
            About Subscriptions and Privacy
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-lg mx-auto">
        {renderHeader()}

        <div className="flex items-center justify-center p-4 pt-8">
          <div className="w-full max-w-md">
            {isSubscribed 
              ? renderPremiumDashboard()
              : showPlans 
                ? renderAvailablePlans()
                : renderUnlockPremium()
            }
          </div>
        </div>
      </div>
    </div>
  );
}
