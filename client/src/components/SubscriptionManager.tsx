import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, Crown, ChevronLeft, ChevronRight, Check } from "lucide-react";
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
      if (offeringsResult.current) return offeringsResult;
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
  const [offeringsError, setOfferingsError] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const { toast } = useToast();
  const platform = getPlatformInfo();

  const isSubscribed = user?.subscriptionStatus === 'active';

  const handleGuestSubscribe = () => {
    toast({ title: "Sign in Required", description: "Create an account to subscribe." });
    setTimeout(() => { window.location.href = '/login'; }, 500);
  };

  const handleShowPlans = () => {
    if (!isAuthenticated) { handleGuestSubscribe(); return; }
    setShowPlans(true);
  };

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
        let packageToPurchase;
        if (selectedPlan === 'yearly') {
          packageToPurchase = packages.find((p: any) => p.identifier === '$rc_annual' || p.packageType === 'ANNUAL' || p.identifier.includes('annual') || p.identifier.includes('yearly'));
        } else {
          packageToPurchase = packages.find((p: any) => p.identifier === '$rc_monthly' || p.packageType === 'MONTHLY' || p.identifier.includes('monthly'));
        }
        packageToPurchase = packageToPurchase || packages[0];
        if (!packageToPurchase) {
          setOfferingsError(true);
          setLoading(false);
          return;
        }
        const { Purchases } = await import('@revenuecat/purchases-capacitor');
        try {
          const { customerInfo } = await Purchases.purchasePackage({ aPackage: packageToPurchase });
          const isPremiumNow = Object.keys(customerInfo.entitlements.active).length > 0;
          if (isPremiumNow) {
            toast({ title: "Success!", description: "Subscription activated!" });
            try {
              await apiRequest("/api/sync-subscription", { method: "POST", body: JSON.stringify({ subscriptionStatus: 'active', subscriptionPlan: 'premium' }) });
            } catch { console.log('Backend sync will happen via webhook'); }
            queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
            setTimeout(() => { window.location.reload(); }, 1000);
          }
        } catch (purchaseError: any) {
          if (purchaseError.userCancelled) return;
          if (purchaseError.code === 509 || purchaseError.code === '509') {
            setOfferingsError(true);
            toast({ title: "Sandbox Account Required", description: "Please sign into a Sandbox App Store account for testing.", variant: "destructive" });
            return;
          }
          toast({ title: "Purchase Failed", description: "Please try again.", variant: "destructive" });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = () => {
    toast({ title: "How to Cancel", description: "Go to Settings → Your Name → Subscriptions on your iOS device." });
  };

  const renderHeader = () => (
    <div className="sticky top-0 z-10 bg-[#DA7F7F]/95 backdrop-blur-sm safe-area-header">
      <div className="flex items-center justify-between px-4 py-3">
        {isSubscribed ? (
          <Link href="/settings">
            <div className="flex items-center text-[#2D2926] cursor-pointer" data-testid="button-back">
              <ChevronLeft className="h-5 w-5" />
              <span className="text-[17px] font-medium">Settings</span>
            </div>
          </Link>
        ) : showPlans ? (
          <button onClick={() => setShowPlans(false)} className="flex items-center text-[#2D2926]" data-testid="button-back-plans">
            <ChevronLeft className="h-5 w-5" />
            <span className="text-[17px] font-medium">Back</span>
          </button>
        ) : (
          <Link href="/">
            <div className="flex items-center text-[#2D2926] cursor-pointer" data-testid="button-back">
              <ChevronLeft className="h-5 w-5" />
              <span className="text-[17px] font-medium">Back</span>
            </div>
          </Link>
        )}
      </div>
    </div>
  );

  const renderUnlockPremium = () => (
    <div className="bg-[#D4AF37] rounded-[20px] p-8 shadow-lg">
      <div className="text-center space-y-6">
        <div className="w-24 h-24 mx-auto bg-[#FFF8F0] rounded-full flex items-center justify-center shadow-md">
          <Crown className="h-12 w-12 text-[#D4AF37]" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-[#2D2926] mb-2">Unlock Premium</h1>
          <p className="text-[#4A3F3F]">Get all advanced reminder features</p>
        </div>
        <Button onClick={handleShowPlans} className="w-full bg-[#2D2926] hover:bg-[#1A1A1A] text-white text-lg py-6 rounded-xl" size="lg" data-testid="button-subscribe-now">
          <Crown className="h-5 w-5 mr-2" />
          Subscribe Now
        </Button>
      </div>
    </div>
  );

  const renderAvailablePlans = () => (
    <div className="bg-[#FFF8F0] rounded-[20px] p-8 shadow-lg">
      <div className="text-center space-y-6">
        <div className="w-20 h-20 mx-auto bg-[#D4AF37] rounded-[20px] flex items-center justify-center shadow-md">
          <span className="text-4xl">😤</span>
        </div>
        <h1 className="text-2xl font-bold text-[#2D2926]">Choose Your Plan</h1>
        <div className="space-y-3">
          <button
            onClick={() => setSelectedPlan('monthly')}
            className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${selectedPlan === 'monthly' ? 'border-[#D4AF37] bg-[#D4AF37]/10' : 'border-[#E8D5C4] bg-white'}`}
            data-testid="plan-monthly"
          >
            <div className="text-left">
              <div className="text-[#2D2926] font-semibold text-lg">Monthly</div>
              <div className="text-[#5C4F4A] text-sm">$6.99 per month</div>
            </div>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan === 'monthly' ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-[#C19A2E]'}`}>
              {selectedPlan === 'monthly' && <Check className="h-4 w-4 text-white" />}
            </div>
          </button>
          <button
            onClick={() => setSelectedPlan('yearly')}
            className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${selectedPlan === 'yearly' ? 'border-[#D4AF37] bg-[#D4AF37]/10' : 'border-[#E8D5C4] bg-white'}`}
            data-testid="plan-yearly"
          >
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-[#2D2926] font-semibold text-lg">Yearly</span>
                <span className="bg-[#4CAF50] text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">Best Value</span>
              </div>
              <div className="text-[#5C4F4A] text-sm">$59.99 per year (Save 28%)</div>
            </div>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan === 'yearly' ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-[#C19A2E]'}`}>
              {selectedPlan === 'yearly' && <Check className="h-4 w-4 text-white" />}
            </div>
          </button>
        </div>
        {offeringsError && (
          <div className="bg-[#FEF3C7] border border-[#F59E0B] rounded-xl p-4">
            <p className="text-sm text-[#92400E]">Please sign into a Sandbox App Store account to test purchases.</p>
          </div>
        )}
        <Button onClick={handlePurchase} disabled={loading} className="w-full bg-[#D4AF37] hover:bg-[#C19A2E] text-[#2D2926] text-lg py-6 rounded-xl" size="lg" data-testid="button-continue-purchase">
          {loading ? (<><Loader2 className="h-5 w-5 mr-2 animate-spin" />Processing...</>) : (<>Continue<ChevronRight className="h-5 w-5 ml-2" /></>)}
        </Button>
        <p className="text-xs text-[#5C4F4A]">{selectedPlan === 'yearly' ? '$59.99/year' : '$6.99/month'} • Cancel anytime</p>
      </div>
    </div>
  );

  const renderPremiumDashboard = () => (
    <div className="bg-[#D4AF37] rounded-[20px] p-8 shadow-lg">
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-[16px] bg-[#FFF8F0] flex items-center justify-center shadow-md">
            <span className="text-3xl">😤</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#2D2926]">Rude Reminders</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="bg-[#4CAF50] text-white text-xs px-2 py-0.5 rounded-full font-semibold">Premium Active</span>
            </div>
          </div>
        </div>
        <div className="bg-[#FFF8F0] rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-lg">💳</span>
            <span className="text-[#2D2926]">{user?.subscriptionPlan === 'yearly' ? '$59.99 per year' : '$6.99 per month'}</span>
          </div>
          {user?.subscriptionEndsAt && (
            <div className="flex items-center gap-3">
              <span className="text-lg">📅</span>
              <span className="text-[#2D2926]">Renews {new Date(user.subscriptionEndsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span>
            </div>
          )}
        </div>
        <button onClick={handleCancelSubscription} className="w-full py-3 text-[#DC3545] text-base font-medium active:opacity-70" data-testid="button-cancel-subscription">
          Cancel Subscription
        </button>
        <p className="text-sm text-[#4A3F3F] text-center">
          Cancellation is managed through your device's subscription settings.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#DA7F7F]">
      <div className="max-w-lg mx-auto">
        {renderHeader()}
        <div className="flex items-center justify-center p-4 pt-8">
          <div className="w-full max-w-md">
            {isSubscribed ? renderPremiumDashboard() : showPlans ? renderAvailablePlans() : renderUnlockPremium()}
          </div>
        </div>
      </div>
    </div>
  );
}
