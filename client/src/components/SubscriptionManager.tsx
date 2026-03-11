import { useState, useEffect } from 'react';
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Loader2, Crown, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getPlatformInfo } from '@/utils/platformDetection';
import { apiRequest, queryClient } from "@/lib/queryClient";
import { revenueCatService } from "@/services/revenueCatService";
import { Capacitor } from '@capacitor/core';
import logoImage from "@assets/translusant_logo2_1767108484844.png";

interface SubscriptionManagerProps {
  isAuthenticated?: boolean;
  user?: any;
}

async function loadOfferingsSafe() {
  try {
    // Ensure RevenueCat is configured before any Purchases calls
    await revenueCatService.initialize();
    
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
  const [monthlyPrice, setMonthlyPrice] = useState<string | null>(null);
  const [yearlyPrice, setYearlyPrice] = useState<string | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const platform = getPlatformInfo();

  const isSubscribed = user?.subscriptionStatus === 'active';

  const openLink = async (url: string) => {
    if (Capacitor.isNativePlatform()) {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url, presentationStyle: 'popover' as any });
    } else {
      window.open(url, '_blank');
    }
  };

  const [pricesLoading, setPricesLoading] = useState(false);

  useEffect(() => {
    if (platform.isNative) {
      setPricesLoading(true);
      console.log('RevenueCat: Loading offerings...');
      loadOfferingsSafe().then((offeringsResult) => {
        console.log('RevenueCat: Offerings result:', JSON.stringify(offeringsResult?.current?.availablePackages?.map((p: any) => ({
          id: p.identifier,
          type: p.packageType,
          price: p.product?.priceString
        }))));
        if (!offeringsResult?.current) {
          console.warn('RevenueCat: No current offering found');
          setPricesLoading(false);
          return;
        }
        const packages = offeringsResult.current.availablePackages;
        const monthly = packages.find((p: any) => p.identifier === '$rc_monthly' || p.packageType === 'MONTHLY' || p.identifier.includes('monthly'));
        const yearly = packages.find((p: any) => p.identifier === '$rc_annual' || p.packageType === 'ANNUAL' || p.identifier.includes('annual') || p.identifier.includes('yearly'));
        if (monthly?.product?.priceString) setMonthlyPrice(monthly.product.priceString);
        if (yearly?.product?.priceString) setYearlyPrice(yearly.product.priceString);
        setPricesLoading(false);
      }).catch(() => setPricesLoading(false));
    }
  }, []);

  const handleGuestSubscribe = () => {
    toast({ title: "Sign in Required", description: "Create an account to subscribe." });
    setTimeout(() => { setLocation('/login'); }, 500);
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
        // loadOfferingsSafe() already ensures RevenueCat is initialized
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
            try {
              await apiRequest("/api/sync-subscription", { method: "POST", body: { subscriptionStatus: 'active', subscriptionPlan: 'premium' } as any });
            } catch { console.log('Backend sync will happen via webhook'); }
            await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
            toast({ title: "Success!", description: "Subscription activated!" });
            setLocation("/");
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
    toast({ title: "How to Cancel", description: platform.isIOS ? "Go to Settings → Your Name → Subscriptions on your iOS device." : "Go to Google Play Store → Menu → Subscriptions to manage your plan." });
  };

  const premiumFeatures = [
    { icon: "🎙️", text: "AI voice characters for your reminders" },
    { icon: "📸", text: "Attach up to 5 photos per reminder" },
    { icon: "💬", text: "Motivational quotes from history's greats" },
    { icon: "🔥", text: "Adjustable rudeness levels (Gentle to Savage)" },
    { icon: "✨", text: "A charismatic array of reminders for every life situation" },
  ];

  const renderUnlockPremium = () => (
    <div className="bg-white rounded-[24px] p-8 shadow-[var(--rr-card-shadow)] border border-[#EAEAEA]">
      <div className="text-center space-y-6">
        <div className="w-24 h-24 mx-auto bg-[#F9FAFB] rounded-full flex items-center justify-center">
          <img src={logoImage} alt="Rude Reminders" className="h-16 w-auto" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-[#111827] mb-2">Unlock Premium</h1>
          <p className="text-sm text-[#6B7280]">Get the full Rude Reminders experience</p>
        </div>
        <div className="text-left space-y-3 bg-[#F9FAFB] rounded-[16px] p-4 border border-[#EAEAEA]">
          {premiumFeatures.map((feature, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-lg">{feature.icon}</span>
              <span className="text-sm text-[#374151]">{feature.text}</span>
            </div>
          ))}
        </div>
        {!isAuthenticated && (
          <p className="font-bold text-[#C53B3B] text-sm">Please create an account before subscribing</p>
        )}
        <Button onClick={handleShowPlans} className="w-full bg-[#C53B3B] hover:bg-[#A83232] text-white text-lg py-6 rounded-[14px] h-[52px]" size="lg" data-testid="button-subscribe-now">
          <Crown className="h-5 w-5 mr-2" />
          Subscribe Now
        </Button>
        <div className="flex gap-4 justify-center">
          <button onClick={() => openLink('https://app.termly.io/policy-viewer/policy.html?policyUUID=378d9c6b-c46e-44ed-83a2-d8770229969c')} className="text-[11px] text-[#2563EB] underline">
            Privacy Policy
          </button>
          <button onClick={() => openLink('https://app.termly.io/policy-viewer/policy.html?policyUUID=34f340a5-79a7-4f66-b4f9-81f1e9693176')} className="text-[11px] text-[#2563EB] underline">
            Terms of Use
          </button>
          <button onClick={() => openLink('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')} className="text-[11px] text-[#2563EB] underline">
            EULA
          </button>
        </div>
      </div>
    </div>
  );

  const renderAvailablePlans = () => (
    <div className="bg-white rounded-[24px] p-8 shadow-[var(--rr-card-shadow)] border border-[#EAEAEA]">
      <div className="text-center space-y-6">
        <div className="w-20 h-20 mx-auto bg-[#F9FAFB] rounded-[20px] flex items-center justify-center">
          <img src={logoImage} alt="Rude Reminders" className="h-14 w-auto" />
        </div>
        <h1 className="text-2xl font-bold text-[#111827]">Choose Your Plan</h1>
        <p className="text-sm text-[#6B7280]">Unlock all premium features including AI voice characters, photo attachments, motivational quotes, and adjustable rudeness levels.</p>
        <div className="space-y-3">
          <button
            onClick={() => setSelectedPlan('monthly')}
            className={`w-full p-4 rounded-[14px] border-2 transition-all flex items-center justify-between ${selectedPlan === 'monthly' ? 'border-[#C53B3B] bg-[#FEF2F2]' : 'border-[#EAEAEA] bg-white'}`}
            data-testid="plan-monthly"
          >
            <div className="text-left">
              <div className="text-[#111827] font-semibold text-lg">Monthly</div>
              <div className="text-sm text-[#6B7280]">{monthlyPrice ? `${monthlyPrice} per month` : pricesLoading ? 'Loading price...' : ''}</div>
            </div>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan === 'monthly' ? 'border-[#C53B3B] bg-[#C53B3B]' : 'border-[#D1D5DB]'}`}>
              {selectedPlan === 'monthly' && <Check className="h-4 w-4 text-white" />}
            </div>
          </button>
          <button
            onClick={() => setSelectedPlan('yearly')}
            className={`w-full p-4 rounded-[14px] border-2 transition-all flex items-center justify-between ${selectedPlan === 'yearly' ? 'border-[#C53B3B] bg-[#FEF2F2]' : 'border-[#EAEAEA] bg-white'}`}
            data-testid="plan-yearly"
          >
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-[#111827] font-semibold text-lg">Yearly</span>
                <span className="bg-[#C53B3B] text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">Best Value</span>
              </div>
              <div className="text-sm text-[#6B7280]">{yearlyPrice ? `${yearlyPrice} per year` : pricesLoading ? 'Loading price...' : ''}</div>
            </div>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan === 'yearly' ? 'border-[#C53B3B] bg-[#C53B3B]' : 'border-[#D1D5DB]'}`}>
              {selectedPlan === 'yearly' && <Check className="h-4 w-4 text-white" />}
            </div>
          </button>
        </div>
        {offeringsError && (
          <div className="bg-[#FEF3C7] border border-[#F59E0B] rounded-[14px] p-4">
            <p className="text-sm text-[#92400E]">Please sign into a Sandbox App Store account to test purchases.</p>
          </div>
        )}
        <Button onClick={handlePurchase} disabled={loading || (platform.isNative && pricesLoading)} className="w-full bg-[#C53B3B] hover:bg-[#A83232] text-white text-lg py-6 rounded-[14px] h-[52px]" size="lg" data-testid="button-continue-purchase">
          {loading ? (<><Loader2 className="h-5 w-5 mr-2 animate-spin" />Processing...</>) : pricesLoading ? (<><Loader2 className="h-5 w-5 mr-2 animate-spin" />Loading prices...</>) : (<>Continue<ChevronRight className="h-5 w-5 ml-2" /></>)}
        </Button>
        <p className="text-xs text-[#6B7280]">
          {selectedPlan === 'yearly' && yearlyPrice
            ? `Rude Reminders Premium · ${yearlyPrice}/year · ` 
            : selectedPlan === 'monthly' && monthlyPrice
            ? `Rude Reminders Premium · ${monthlyPrice}/month · `
            : 'Rude Reminders Premium · '}Auto-renewable subscription · Cancel anytime
        </p>
        <div className="mt-4 pt-4 border-t border-[#EAEAEA]">
          <p className="text-[11px] font-semibold text-[#374151] mb-2">Subscription Terms</p>
          <p className="text-[11px] text-[#6B7280] leading-relaxed">
            Rude Reminders Premium is an auto-renewable subscription. Payment will be charged to your {platform.isIOS ? 'Apple ID' : 'Google Play'} account at confirmation of purchase. {selectedPlan === 'monthly' ? 'Your subscription renews monthly.' : 'Your subscription renews yearly.'} Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period. You can manage or cancel your subscription at any time in your {platform.isIOS ? 'device Settings → Apple ID → Subscriptions' : 'Google Play Store → Menu → Subscriptions'}.
          </p>
          <div className="flex gap-4 mt-3 justify-center flex-wrap">
            <button onClick={() => openLink('https://app.termly.io/policy-viewer/policy.html?policyUUID=378d9c6b-c46e-44ed-83a2-d8770229969c')} className="text-[11px] text-[#2563EB] underline">
              Privacy Policy
            </button>
            <button onClick={() => openLink('https://app.termly.io/policy-viewer/policy.html?policyUUID=34f340a5-79a7-4f66-b4f9-81f1e9693176')} className="text-[11px] text-[#2563EB] underline">
              Terms of Use
            </button>
            <button onClick={() => openLink('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')} className="text-[11px] text-[#2563EB] underline">
              EULA
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPremiumDashboard = () => (
    <div className="bg-white rounded-[24px] p-8 shadow-[var(--rr-card-shadow)] border border-[#EAEAEA]">
      <div className="space-y-6">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-20 h-20 bg-[#F9FAFB] rounded-[20px] flex items-center justify-center">
            <img src={logoImage} alt="Rude Reminders" className="h-14 w-auto" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#111827]">Rude Reminders</h1>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="bg-[#C53B3B] text-white text-xs px-2 py-0.5 rounded-full font-semibold">Premium Active</span>
            </div>
          </div>
        </div>
        <div className="bg-[#F9FAFB] rounded-[16px] p-4 space-y-3 border border-[#EAEAEA]">
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
        <button onClick={handleCancelSubscription} className="w-full py-3 px-4 bg-white text-[#C53B3B] text-base font-medium rounded-[14px] border-2 border-[#C53B3B] hover:bg-[#FEF2F2] active:bg-[#C53B3B] active:text-white h-[48px]" data-testid="button-cancel-subscription">
          Cancel Subscription
        </button>
        <p className="text-sm text-[#6B7280] text-center">
          Cancellation is managed through your device's subscription settings.
        </p>
      </div>
    </div>
  );

  const bgColor = 'bg-black';
  const headerBgColor = 'bg-black';
  const textColor = 'text-white';

  return (
    <div className={`min-h-screen ${bgColor}`}>
      <div className="max-w-lg mx-auto">
        <div className={`sticky top-0 z-10 ${headerBgColor} backdrop-blur-sm safe-area-header`}>
          <div className="flex items-center justify-between px-4 py-3">
            {isSubscribed ? (
              <Link href="/settings">
                <div className={`flex items-center ${textColor} cursor-pointer`} data-testid="button-back">
                  <ChevronLeft className="h-5 w-5" />
                  <span className="text-[17px] font-medium">Settings</span>
                </div>
              </Link>
            ) : showPlans ? (
              <button onClick={() => setShowPlans(false)} className={`flex items-center ${textColor}`} data-testid="button-back-plans">
                <ChevronLeft className="h-5 w-5" />
                <span className="text-[17px] font-medium">Back</span>
              </button>
            ) : (
              <Link href="/">
                <div className={`flex items-center ${textColor} cursor-pointer`} data-testid="button-back">
                  <ChevronLeft className="h-5 w-5" />
                  <span className="text-[17px] font-medium">Back</span>
                </div>
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center justify-center p-4 pt-8">
          <div className="w-full max-w-md">
            {isSubscribed ? renderPremiumDashboard() : showPlans ? renderAvailablePlans() : renderUnlockPremium()}
          </div>
        </div>
      </div>
    </div>
  );
}
