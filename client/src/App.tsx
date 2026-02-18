import { Route, Switch, useLocation, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NotificationProvider } from "@/components/NotificationProvider";
import { useAuth } from "@/hooks/useAuth";
import Home from "@/pages/home";
import HomeFree from "@/pages/home-free";
import HomePremium from "@/pages/home-premium";
import Settings from "@/pages/SettingsLanding";
import PersonalInfo from "@/pages/settings/PersonalInfo";
import Notifications from "@/pages/settings/Notifications";
import Appearance from "@/pages/settings/Appearance";
import Billing from "@/pages/settings/Billing";
import ReminderHistory from "@/pages/settings/ReminderHistory";
import DevPreview from "@/pages/DevPreview";
import Subscribe from "@/pages/subscribe";
import AdminPage from "@/pages/admin";
import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";
import DeleteAccount from "@/pages/DeleteAccount";
import DeleteAccountComplete from "@/pages/DeleteAccountComplete";
import { useEffect, useMemo, useCallback, useSyncExternalStore } from "react";
import { revenueCatService } from "@/services/revenueCatService";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { initAuthToken } from "@/lib/queryClient";

const useNormalizedLocation = (): [string, (to: string) => void] => {
  const navigate = useCallback((to: string) => {
    const normalized = (to === "/index.html" || to === "") ? "/" : to;
    window.history.pushState(null, "", normalized);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  const subscribe = useCallback((callback: () => void) => {
    window.addEventListener("popstate", callback);
    return () => window.removeEventListener("popstate", callback);
  }, []);

  const getSnapshot = useCallback(() => {
    let path = window.location.pathname;
    if (path === "/index.html" || path === "") {
      path = "/";
    }
    return path;
  }, []);

  const location = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return [location, navigate];
};

function HomeRouter() {
  const { user, isLoading, isAuthenticated } = useAuth();

  // Only show loading on initial mount, not for guest users
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rude-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Route based on premium status:
  // - Premium users (authenticated + premium) → HomePremium
  // - Free users (authenticated + not premium) → HomeFree
  // - Guest users (not authenticated) → HomeFree
  const isPremium = isAuthenticated && user?.subscriptionPlan === 'premium';
  return isPremium ? <HomePremium /> : <HomeFree />;
}

function RedirectToLogin() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation('/login');
  }, [setLocation]);
  return null;
}

function AppRouter() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rude-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/index.html" component={HomeRouter} />
      <Route path="/" component={HomeRouter} />
      <Route path="/login" component={LoginPage} />
      <Route path="/subscribe" component={Subscribe} />
      <Route path="/delete-account" component={DeleteAccount} />
      <Route path="/delete-account/complete" component={DeleteAccountComplete} />

      {isAuthenticated ? (
        <>
          <Route path="/settings/billing" component={Billing} />
          <Route path="/settings/personal" component={PersonalInfo} />
          <Route path="/settings/notifications" component={Notifications} />
          <Route path="/settings/appearance" component={Appearance} />
          <Route path="/settings/history" component={ReminderHistory} />
          <Route path="/settings" component={Settings} />
          <Route path="/dev-preview" component={DevPreview} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/secret-admin-panel-b5ac04f4" component={AdminPage} />
        </>
      ) : (
        <>
          <Route path="/settings/:rest*" component={RedirectToLogin} />
          <Route path="/admin" component={RedirectToLogin} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    // Initialize auth token from persistent storage (important for iOS)
    initAuthToken().then(() => {
      console.log('🔐 Auth token initialization complete');
    }).catch(console.error);

    // Initialize RevenueCat (has DISABLE flag in service for debugging)
    if (Capacitor.isNativePlatform()) {
      revenueCatService.initialize().catch(console.error);
    }

    // Request notification permissions on mobile app launch
    const requestNotificationPermissions = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          console.log('📱 Mobile app detected - requesting notification permissions...');
          const permission = await LocalNotifications.requestPermissions();
          if (permission.display === 'granted') {
            console.log('✅ Notification permissions granted!');
          } else {
            console.warn('⚠️ Notification permissions denied:', permission.display);
          }
        } catch (error) {
          console.error('❌ Error requesting notification permissions:', error);
        }
      }
    };

    requestNotificationPermissions();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter hook={useNormalizedLocation}>
        <TooltipProvider>
          <NotificationProvider>
            <Toaster />
            <AppRouter />
          </NotificationProvider>
        </TooltipProvider>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;