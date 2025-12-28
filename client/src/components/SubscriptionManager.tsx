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
    <div className="sticky top-0 z-10 bg-[#C9A063]/95 backdrop-blur-sm safe-area-header">
      <div className="flex items-center justify-between px-4 py-3">
        {isSubscribed ? (
          <Link href="/settings">
            <div className="flex items-center text-[#111827] cursor-pointer" data-testid="button-back">
              <ChevronLeft className="h-5 w-5" />
              <span className="text-[17px] font-medium">Settings</span>
            </div>
          </Link>
        ) : showPlans ? (
          <button onClick={() => setShowPlans(false)} className="flex items-center text-[#111827]" data-testid="button-back-plans">
            <ChevronLeft className="h-5 w-5" />
            <span className="text-[17px] font-medium">Back</span>
          </button>
        ) : (
          <Link href="/">
            <div className="flex items-center text-[#111827] cursor-pointer" data-testid="button-back">
              <ChevronLeft className="h-5 w-5" />
              <span className="text-[17px] font-medium">Back</span>
            </div>
          </Link>
        )}
      </div>
    </div>
  );

  const renderUnlockPremium = () => (
    <div className="bg-white rounded-[18px] p-8 shadow-md border border-[rgba(0,0,0,0.08)]">
      <div className="text-center space-y-6">
        <div className="w-24 h-24 mx-auto bg-[#F3F4F6] rounded-full flex items-center justify-center">
          <Crown className="h-12 w-12 text-[#6B4E2E]" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-[#111827] mb-2">Unlock Premium</h1>
          <p className="text-[#374151]">Get all advanced reminder features</p>
        </div>
        <Button onClick={handleShowPlans} className="w-full bg-white hover:bg-gray-50 text-[#111827] text-lg py-6 rounded-[14px] border border-[rgba(0,0,0,0.08)] shadow-sm" size="lg" data-testid="button-subscribe-now">
          <Crown className="h-5 w-5 mr-2 text-[#6B4E2E]" />
          Subscribe Now
        </Button>
      </div>
    </div>
  );

  const renderAvailablePlans = () => (
    <div className="bg-white rounded-[18px] p-8 shadow-md border border-[rgba(0,0,0,0.08)]">
      <div className="text-center space-y-6">
        <div className="w-20 h-20 mx-auto bg-[#F3F4F6] rounded-[18px] flex items-center justify-center">
          <span className="text-4xl">😤</span>
        </div>
        <h1 className="text-2xl font-bold text-[#111827]">Choose Your Plan</h1>
        <div className="space-y-3">
          <button
            onClick={() => setSelectedPlan('monthly')}
            className={`w-full p-4 rounded-[14px] border-2 transition-all flex items-center justify-between ${selectedPlan === 'monthly' ? 'border-[#6B4E2E] bg-[#F9F7F4]' : 'border-[rgba(0,0,0,0.08)] bg-white'}`}
            data-testid="plan-monthly"
          >
            <div className="text-left">
              <div className="text-[#111827] font-semibold text-lg">Monthly</div>
              <div className="text-[#374151] text-sm">$6.99 per month</div>
            </div>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan === 'monthly' ? 'border-[#6B4E2E] bg-[#6B4E2E]' : 'border-[rgba(0,0,0,0.2)]'}`}>
              {selectedPlan === 'monthly' && <Check className="h-4 w-4 text-white" />}
            </div>
          </button>
          <button
            onClick={() => setSelectedPlan('yearly')}
            className={`w-full p-4 rounded-[14px] border-2 transition-all flex items-center justify-between ${selectedPlan === 'yearly' ? 'border-[#6B4E2E] bg-[#F9F7F4]' : 'border-[rgba(0,0,0,0.08)] bg-white'}`}
            data-testid="plan-yearly"
          >
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-[#111827] font-semibold text-lg">Yearly</span>
                <span className="bg-[#22C55E] text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">Best Value</span>
              </div>
              <div className="text-[#374151] text-sm">$59.99 per year (Save 28%)</div>
            </div>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan === 'yearly' ? 'border-[#6B4E2E] bg-[#6B4E2E]' : 'border-[rgba(0,0,0,0.2)]'}`}>
              {selectedPlan === 'yearly' && <Check className="h-4 w-4 text-white" />}
            </div>
          </button>
        </div>
        {offeringsError && (
          <div className="bg-[#FEF3C7] border border-[#F59E0B] rounded-[12px] p-4">
            <p className="text-sm text-[#92400E]">Please sign into a Sandbox App Store account to test purchases.</p>
          </div>
        )}
        <Button onClick={handlePurchase} disabled={loading} className="w-full bg-white hover:bg-gray-50 text-[#111827] text-lg py-6 rounded-[14px] border border-[rgba(0,0,0,0.08)] shadow-sm" size="lg" data-testid="button-continue-purchase">
          {loading ? (<><Loader2 className="h-5 w-5 mr-2 animate-spin" />Processing...</>) : (<>Continue<ChevronRight className="h-5 w-5 ml-2" /></>)}
        </Button>
        <p className="text-xs text-[#374151]">{selectedPlan === 'yearly' ? '$59.99/year' : '$6.99/month'} • Cancel anytime</p>
      </div>
    </div>
  );

  const renderPremiumDashboard = () => (
    <div className="bg-white rounded-[18px] p-8 shadow-md border border-[rgba(0,0,0,0.08)]">
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-[14px] bg-[#F3F4F6] flex items-center justify-center">
            <span className="text-3xl">😤</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#111827]">Rude Reminders</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="bg-[#22C55E] text-white text-xs px-2 py-0.5 rounded-full font-semibold">Premium Active</span>
            </div>
          </div>
        </div>
        <div className="bg-[#F3F4F6] rounded-[14px] p-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-lg">💳</span>
            <span className="text-[#111827]">{user?.subscriptionPlan === 'yearly' ? '$59.99 per year' : '$6.99 per month'}</span>
          </div>
          {user?.subscriptionEndsAt && (
            <div className="flex items-center gap-3">
              <span className="text-lg">📅</span>
              <span className="text-[#111827]">Renews {new Date(user.subscriptionEndsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span>
            </div>
          )}
        </div>
        <button onClick={handleCancelSubscription} className="w-full py-3 px-4 bg-white text-[#111827] text-base font-medium rounded-[14px] border border-[rgba(0,0,0,0.08)] shadow-sm hover:bg-gray-50 active:bg-gray-100" data-testid="button-cancel-subscription">
          Cancel Subscription
        </button>
        <p className="text-sm text-[#374151] text-center">
          Cancellation is managed through your device's subscription settings.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#C9A063]">
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
