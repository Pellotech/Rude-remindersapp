import { useState, useEffect, useCallback } from 'react';
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getPlatformInfo } from '@/utils/platformDetection';
import { apiRequest, queryClient } from "@/lib/queryClient";
import { revenueCatService } from "@/services/revenueCatService";
import { Capacitor } from '@capacitor/core';
import logoImage from "@assets/reems_logo_trimmed.png";
import RoseSpinner from "@/components/RoseSpinner";

interface SubscriptionManagerProps {
  isAuthenticated?: boolean;
  user?: any;
}

type Plan = 'monthly' | 'yearly';
type LoadState = 'loading' | 'ready' | 'error';

const PRIVACY_URL = 'https://app.termly.io/policy-viewer/policy.html?policyUUID=378d9c6b-c46e-44ed-83a2-d8770229969c';
const TERMS_URL = 'https://app.termly.io/policy-viewer/policy.html?policyUUID=34f340a5-79a7-4f66-b4f9-81f1e9693176';
const EULA_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

const findMonthly = (pkgs: any[]) =>
  pkgs.find((p) => p.identifier === '$rc_monthly' || p.packageType === 'MONTHLY' || p.identifier?.includes('monthly'));
const findYearly = (pkgs: any[]) =>
  pkgs.find((p) => p.identifier === '$rc_annual' || p.packageType === 'ANNUAL' || p.identifier?.includes('annual') || p.identifier?.includes('yearly'));

const hasActiveEntitlement = (customerInfo: any) =>
  !!customerInfo?.entitlements?.active && Object.keys(customerInfo.entitlements.active).length > 0;

const isUserCancelled = (e: any) =>
  e?.userCancelled === true || e?.code === '1' || e?.code === 1 || e?.code === 'PURCHASE_CANCELLED';

/** Tell our server to re-check RevenueCat and flip the account to premium. Retries once (store can lag a second). */
async function syncPremiumWithServer() {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await apiRequest("/api/sync-subscription", { method: "POST" });
      break;
    } catch {
      if (attempt === 0) await new Promise((r) => setTimeout(r, 2000));
      // If it still fails, the RevenueCat webhook will update the account shortly.
    }
  }
  await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
  await queryClient.invalidateQueries({ queryKey: ["/api/user/premium-status"] });
}

export default function SubscriptionManager({ user }: SubscriptionManagerProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const platform = getPlatformInfo();
  const isNative = platform.isNative;
  const isSubscribed = user?.subscriptionStatus === 'active';

  const [selectedPlan, setSelectedPlan] = useState<Plan>('yearly');
  const [packages, setPackages] = useState<{ monthly?: any; yearly?: any }>({});
  const [loadState, setLoadState] = useState<LoadState>(isNative ? 'loading' : 'ready');
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const monthlyPrice: string | undefined = packages.monthly?.product?.priceString;
  const yearlyPrice: string | undefined = packages.yearly?.product?.priceString;
  const busy = purchasing || restoring;

  const openLink = async (url: string) => {
    if (Capacitor.isNativePlatform()) {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url, presentationStyle: 'popover' as any });
    } else {
      window.open(url, '_blank');
    }
  };

  // Load the plans ONCE when the screen opens, and keep them for the purchase.
  const loadPlans = useCallback(async () => {
    if (!isNative) return;
    setLoadState('loading');
    try {
      await revenueCatService.initialize();
      // Make sure the purchase is tied to this account (not an anonymous id).
      if (user?.id) await revenueCatService.logIn(user.id);
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const offerings: any = await Purchases.getOfferings();
      const pkgs: any[] = offerings?.current?.availablePackages ?? [];
      const monthly = findMonthly(pkgs);
      const yearly = findYearly(pkgs);
      if (!monthly && !yearly) throw new Error('No packages in current offering');
      setPackages({ monthly, yearly });
      if (!yearly && monthly) setSelectedPlan('monthly');
      setLoadState('ready');
    } catch (e) {
      console.error('RevenueCat: failed to load plans', e);
      setLoadState('error');
    }
  }, [isNative, user?.id]);

  useEffect(() => {
    if (!isSubscribed) loadPlans();
  }, [isSubscribed, loadPlans]);

  const finishAsPremium = async () => {
    await syncPremiumWithServer();
    toast({ title: "You're Premium! 🌹", description: "Everything is unlocked. Reem's got a lot to say." });
    setLocation("/");
  };

  const handlePurchase = async () => {
    const pkg = selectedPlan === 'yearly' ? packages.yearly : packages.monthly;
    if (!pkg) return;
    setPurchasing(true);
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
      if (hasActiveEntitlement(customerInfo)) {
        await finishAsPremium();
      } else {
        // Paid, but the store hasn't confirmed yet — don't leave the user stuck.
        await syncPremiumWithServer();
        toast({ title: "Purchase received", description: "Your Premium access is activating — it can take a minute." });
        setLocation("/");
      }
    } catch (e: any) {
      if (isUserCancelled(e)) return; // user closed the Apple/Google sheet — say nothing
      console.error('Purchase failed', e);
      toast({ title: "Purchase didn't go through", description: "You weren't charged. Please try again.", variant: "destructive" });
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await revenueCatService.initialize();
      if (user?.id) await revenueCatService.logIn(user.id);
      const restored = await revenueCatService.restorePurchases();
      if (restored) {
        await finishAsPremium();
      } else {
        toast({ title: "Nothing to restore", description: "We couldn't find an active subscription on this account." });
      }
    } finally {
      setRestoring(false);
    }
  };

  const handleManageSubscription = () => {
    openLink(platform.isIOS
      ? 'https://apps.apple.com/account/subscriptions'
      : 'https://play.google.com/store/account/subscriptions');
  };

  const legalLinks = (
    <div className="flex gap-4 justify-center flex-wrap">
      <button onClick={() => openLink(PRIVACY_URL)} className="text-caption-sm text-[#2563EB] underline">Privacy Policy</button>
      <button onClick={() => openLink(TERMS_URL)} className="text-caption-sm text-[#2563EB] underline">Terms of Use</button>
      <button onClick={() => openLink(EULA_URL)} className="text-caption-sm text-[#2563EB] underline">EULA</button>
    </div>
  );

  const premiumFeatures = [
    { icon: "🎙️", text: "AI voice characters for your reminders" },
    { icon: "📸", text: "Attach up to 5 photos per reminder" },
    { icon: "💬", text: "Motivational quotes from history's greats" },
    { icon: "🔥", text: "Adjustable rudeness levels (Sympathy to Savage)" },
    { icon: "✨", text: "A charismatic array of reminders for every life situation" },
  ];

  const PlanCard = ({ plan, title, price, period, badge }: { plan: Plan; title: string; price?: string; period: string; badge?: string }) => {
    const selected = selectedPlan === plan;
    return (
      <button
        onClick={() => setSelectedPlan(plan)}
        disabled={busy}
        className={`w-full p-4 rounded-[14px] border-2 transition-all flex items-center justify-between ${selected ? 'border-reem-red bg-[#FEF2F2]' : 'border-reem-line bg-white'}`}
        data-testid={`plan-${plan}`}
      >
        <div className="text-left">
          <div className="flex items-center gap-2">
            <span className="text-reem-ink font-semibold text-lg">{title}</span>
            {badge && <span className="bg-reem-red text-white text-tiny px-2 py-0.5 rounded-full font-semibold">{badge}</span>}
          </div>
          <div className="text-sm text-reem-text-muted">
            {price ? `${price} · ${period}, cancel anytime` : loadState === 'loading' ? 'Loading price...' : `${period}, cancel anytime`}
          </div>
        </div>
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selected ? 'border-reem-red bg-reem-red' : 'border-[#D1D5DB]'}`}>
          {selected && <Check className="h-4 w-4 text-white" />}
        </div>
      </button>
    );
  };

  // ── One screen: features + plans + buy ────────────────────────────────────
  const renderPaywall = () => {
    const selectedPrice = selectedPlan === 'yearly' ? yearlyPrice : monthlyPrice;
    const canBuy = isNative && loadState === 'ready' && !busy && !!(selectedPlan === 'yearly' ? packages.yearly : packages.monthly);
    return (
      <div className="bg-white rounded-[24px] p-6 shadow-[var(--rr-card-shadow)] border-[3px] border-reem-gold">
        <div className="text-center space-y-5">
          <img src={logoImage} alt="Reems Rude Reminders" className="h-24 w-auto mx-auto" />
          <div>
            <h1 className="text-3xl font-bold text-reem-ink mb-1">Unlock Premium</h1>
            <p className="text-sm text-reem-text-muted">Get the full Reems Rude Reminders experience</p>
          </div>

          <div className="text-left space-y-2.5 bg-reem-paper rounded-[16px] p-4 border border-reem-line">
            {premiumFeatures.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-lg">{f.icon}</span>
                <span className="text-sm text-reem-text">{f.text}</span>
              </div>
            ))}
          </div>

          {(packages.yearly || loadState !== 'ready' || !isNative) && (
            <div className="space-y-3">
              <PlanCard plan="yearly" title="Yearly" price={yearlyPrice} period="Billed yearly" badge="Best Value" />
              {(packages.monthly || loadState !== 'ready' || !isNative) && (
                <PlanCard plan="monthly" title="Monthly" price={monthlyPrice} period="Billed monthly" />
              )}
            </div>
          )}

          {loadState === 'error' && (
            <div className="bg-reem-cream border-[1.5px] border-reem-gold rounded-[12px] p-3 text-note text-reem-brown">
              Couldn't load the plans. Check your connection and{' '}
              <button onClick={loadPlans} className="underline font-semibold">try again</button>.
            </div>
          )}

          {!isNative && (
            <div className="bg-reem-cream border-[1.5px] border-reem-gold rounded-[12px] p-3 text-note text-reem-brown">
              Subscriptions are available in the Reems Rude Reminders app on the App Store and Google Play.
            </div>
          )}

          <Button
            onClick={handlePurchase}
            disabled={!canBuy}
            className="w-full bg-reem-red hover:bg-reem-red-dark disabled:bg-reem-red/40 text-white text-lg rounded-[14px] h-[52px]"
            size="lg"
            data-testid="button-continue-purchase"
          >
            {purchasing ? (<><RoseSpinner size={20} className="mr-2" />Processing...</>)
              : isNative && loadState === 'loading' ? (<><RoseSpinner size={20} className="mr-2" />Loading plans...</>)
              : !isNative ? 'Mobile App Only'
              : (<>Continue<ChevronRight className="h-5 w-5 ml-2" /></>)}
          </Button>

          {isNative && (
            <button
              onClick={handleRestore}
              disabled={busy}
              className="text-sm text-reem-text-muted underline disabled:opacity-50"
              data-testid="button-restore-purchases"
            >
              {restoring ? 'Restoring...' : 'Restore Purchases'}
            </button>
          )}

          <div className="pt-4 border-t border-reem-line space-y-3">
            <p className="text-caption-sm text-reem-text-muted leading-relaxed">
              Reems Rude Reminders Premium{selectedPrice ? ` · ${selectedPrice}/${selectedPlan === 'yearly' ? 'year' : 'month'}` : ''} is an auto-renewable subscription. Payment is charged to your {platform.isIOS ? 'Apple ID' : 'Google Play'} account at confirmation of purchase and renews {selectedPlan === 'yearly' ? 'yearly' : 'monthly'} unless cancelled at least 24 hours before the end of the current period. Manage or cancel anytime in your {platform.isIOS ? 'device Settings → Apple ID → Subscriptions' : 'Google Play Store → Menu → Subscriptions'}.
            </p>
            {legalLinks}
          </div>
        </div>
      </div>
    );
  };

  const renderPremiumDashboard = () => (
    <div className="bg-white rounded-[24px] p-8 shadow-[var(--rr-card-shadow)] border-[3px] border-reem-gold">
      <div className="space-y-6">
        <div className="flex flex-col items-center text-center gap-3">
          <img src={logoImage} alt="Reems Rude Reminders" className="h-24 w-auto" />
          <div>
            <h1 className="text-2xl font-bold text-reem-ink">Reems Rude Reminders</h1>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="bg-reem-red text-white text-xs px-2 py-0.5 rounded-full font-semibold">Premium Active</span>
            </div>
          </div>
        </div>
        {user?.subscriptionEndsAt && (
          <div className="bg-reem-paper rounded-[16px] p-4 border border-reem-line flex items-center gap-3">
            <span className="text-lg">📅</span>
            <span className="text-reem-ink">Renews {new Date(user.subscriptionEndsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span>
          </div>
        )}
        <button
          onClick={handleManageSubscription}
          className="w-full py-3 px-4 bg-white text-reem-red text-base font-medium rounded-[14px] border-2 border-reem-red hover:bg-[#FEF2F2] active:bg-reem-red active:text-white h-[48px]"
          data-testid="button-manage-subscription"
        >
          Manage Subscription
        </button>
        <p className="text-sm text-reem-text-muted text-center">
          Your plan is billed through your {platform.isIOS ? 'Apple ID' : 'Google Play'} account.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-lg mx-auto">
        <div className="sticky top-0 z-10 bg-black backdrop-blur-sm safe-area-header">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href={isSubscribed ? "/settings" : "/"}>
              <div className="flex items-center text-white cursor-pointer" data-testid="button-back">
                <ChevronLeft className="h-5 w-5" />
                <span className="text-body-lg font-medium">{isSubscribed ? 'Settings' : 'Back'}</span>
              </div>
            </Link>
          </div>
        </div>
        <div className="flex items-center justify-center p-4 pt-4" style={{ paddingBottom: 'calc(max(env(safe-area-inset-bottom), 16px) + 96px)' }}>
          <div className="w-full max-w-md">
            {isSubscribed ? renderPremiumDashboard() : renderPaywall()}
          </div>
        </div>
      </div>
    </div>
  );
}
