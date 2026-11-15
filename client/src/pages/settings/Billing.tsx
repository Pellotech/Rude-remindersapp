import { useState } from "react";
import SplashScreen from "@/components/SplashScreen";
import { getPlatformInfo } from "@/utils/platformDetection";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Home, ChevronRight, Crown, ExternalLink } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { revenueCatService } from "@/services/revenueCatService";

// ── Links (kept in one place so they're easy to update) ──────────────────────
const LINKS = {
  privacy: "https://app.termly.io/policy-viewer/policy.html?policyUUID=378d9c6b-c46e-44ed-83a2-d8770229969c",
  terms: "https://app.termly.io/policy-viewer/policy.html?policyUUID=34f340a5-79a7-4f66-b4f9-81f1e9693176",
  eula: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/",
  iosManage: "https://apps.apple.com/account/subscriptions",
  androidManage: "https://play.google.com/store/account/subscriptions",
  supportEmail: "mailto:ruderemindersinfo@gmail.com?subject=Reems%20Rude%20Reminders%20%E2%80%94%20Billing%20Question",
};

const openLink = async (url: string) => {
  if (url.startsWith("mailto:")) {
    window.location.href = url;
    return;
  }
  if (Capacitor.isNativePlatform()) {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url, presentationStyle: "popover" as any });
  } else {
    window.open(url, "_blank");
  }
};

function Row({ label, onClick, value, external, testId, last }: {
  label: string; onClick?: () => void; value?: React.ReactNode; external?: boolean; testId?: string; last?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between px-4 py-3.5 ${last ? "" : "border-b border-ui-separator"} ${onClick ? "cursor-pointer hover:bg-ui-raised transition-colors" : ""}`}
      data-testid={testId}
    >
      <span className="text-white text-body-lg">{label}</span>
      {value ?? (onClick && (external
        ? <ExternalLink className="h-4 w-4 text-ui-tertiary" />
        : <ChevronRight className="h-5 w-5 text-ui-tertiary" />))}
    </div>
  );
}

function Section({ title, children, footer }: { title: string; children: React.ReactNode; footer?: string }) {
  return (
    <div>
      <h2 className="text-note text-ui-label-2 uppercase tracking-wide px-4 mb-2">{title}</h2>
      <div className="bg-ui-card rounded-xl overflow-hidden border border-reem-gold/40">{children}</div>
      {footer && <p className="text-note text-ui-label-2 px-4 mt-2 leading-snug">{footer}</p>}
    </div>
  );
}

export default function Billing() {
  const { toast } = useToast();
  const { isAndroid, isIOS, isNative } = getPlatformInfo();
  const [restoring, setRestoring] = useState(false);

  const { data: user, isLoading } = useQuery<any>({ queryKey: ["/api/auth/user"] });

  if (isLoading) return <SplashScreen />;

  const status: string | undefined = user?.subscriptionStatus;
  const isSubscribed = status === "active";
  const subscriptionEndsAt = user?.subscriptionEndsAt;
  const storeName = isIOS ? "Apple ID" : isAndroid ? "Google Play" : "app store";

  const statusText = isSubscribed ? "Active" : status === "canceled" ? "Canceled" : status === "expired" ? "Expired" : "Free";
  const statusColor = isSubscribed ? "text-reem-green" : status === "canceled" ? "text-[#F59E0B]" : "text-ui-label-2";

  const handleRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      await revenueCatService.initialize();
      if (user?.id) await revenueCatService.logIn(user.id);
      const restored = await revenueCatService.restorePurchases();
      if (restored) {
        try { await apiRequest("/api/sync-subscription", { method: "POST" }); } catch { /* webhook will catch up */ }
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/user/premium-status"] });
        toast({ title: "Premium restored 🌹", description: "Welcome back — everything is unlocked." });
      } else {
        toast({ title: "Nothing to restore", description: `No active subscription found for this ${storeName}.` });
      }
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-lg mx-auto">
        <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-ui-separator safe-area-header">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/settings">
              <div className="flex items-center text-ui-link cursor-pointer" data-testid="button-back">
                <ChevronLeft className="h-5 w-5" />
                <span className="text-body-lg">Settings</span>
              </div>
            </Link>
            <Link href="/">
              <div className="text-ui-link cursor-pointer" data-testid="button-home">
                <Home className="h-5 w-5" />
              </div>
            </Link>
          </div>
          <h1 className="text-title-lg font-bold text-white px-4 pb-2">Payment & Billing</h1>
        </div>

        <div className="py-6 px-4 space-y-8" style={{ paddingBottom: isAndroid ? "120px" : isIOS ? "80px" : "24px" }}>
          {/* Current plan */}
          <Section title="Current Plan">
            <Row
              label="Plan"
              value={
                <div className="flex items-center gap-2">
                  {isSubscribed && <Crown className="h-4 w-4 text-reem-gold" />}
                  <span className="text-ui-label-2 text-body-lg">{isSubscribed ? "Reems Rude Reminders Premium" : "Free"}</span>
                </div>
              }
            />
            <Row label="Status" last={!(subscriptionEndsAt && isSubscribed)} value={<span className={`text-body-lg font-semibold ${statusColor}`}>{statusText}</span>} />
            {subscriptionEndsAt && isSubscribed && (
              <Row label="Renews" last value={<span className="text-ui-label-2 text-body-lg">{new Date(subscriptionEndsAt).toLocaleDateString()}</span>} />
            )}
          </Section>

          {/* Subscription */}
          <Section
            title="Subscription"
            footer={
              !isNative
                ? "Subscriptions are bought and managed in the Reems Rude Reminders app on iPhone or Android."
                : isSubscribed
                ? `Your subscription is billed through your ${storeName}.`
                : "New phone or reinstalled the app? Tap Restore Purchases to get your Premium back."
            }
          >
            {!isSubscribed && (
              <Link href="/subscribe">
                <div>
                  <Row label="Upgrade to Premium" onClick={() => {}} testId="button-upgrade" last={!isNative} />
                </div>
              </Link>
            )}
            {isNative && isSubscribed && (
              <Row
                label="Manage Subscription"
                onClick={() => openLink(isIOS ? LINKS.iosManage : LINKS.androidManage)}
                external
                testId="button-manage-subscription"
              />
            )}
            {isNative && (
              <Row
                label={restoring ? "Restoring..." : "Restore Purchases"}
                onClick={handleRestore}
                testId="button-restore-purchases"
                last
              />
            )}
          </Section>

          {/* Legal & help */}
          <Section title="Legal & Help">
            <Row label="Privacy Policy" onClick={() => openLink(LINKS.privacy)} external testId="link-privacy" />
            <Row label="Terms of Use" onClick={() => openLink(LINKS.terms)} external testId="link-terms" />
            {!isAndroid && (
              <Row label="End User License Agreement" onClick={() => openLink(LINKS.eula)} external testId="link-eula" />
            )}
            <Row label="Contact Billing Support" onClick={() => openLink(LINKS.supportEmail)} external testId="link-support" last />
          </Section>
        </div>
      </div>
    </div>
  );
}
