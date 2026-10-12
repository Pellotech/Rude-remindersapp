import { useAuth } from "@/hooks/useAuth";
import { RoseLoader } from "@/components/SplashScreen";
import SubscriptionManager from '@/components/SubscriptionManager';

// Purchases happen only in the iOS / Android app (RevenueCat native SDK),
// so this page just shows the paywall — no web SDK setup needed.
export default function Subscribe() {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <RoseLoader size={64} label="Loading..." />
      </div>
    );
  }

  return <SubscriptionManager isAuthenticated={isAuthenticated} user={user} />;
}
