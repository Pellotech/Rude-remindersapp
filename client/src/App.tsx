import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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
import NotFound from "@/pages/not-found";
import { DevTools } from "@/components/DevTools";
import { useEffect, useState } from "react";

function HomeRouter() {
  const { user } = useAuth();

  // Check developer mode for testing subscription tiers
  const isDeveloperPremiumMode = localStorage.getItem('dev-premium-mode') === 'true';

  // Check if user has premium subscription OR developer mode is enabled
  const isPremium = isDeveloperPremiumMode || 
                   user?.subscriptionStatus === 'active' || 
                   user?.subscriptionPlan === 'premium';

  return isPremium ? <HomePremium /> : <HomeFree />;
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // If not authenticated and not loading, redirect to login
    if (!isLoading && !isAuthenticated) {
      window.location.href = '/api/login';
    }
  }, [isAuthenticated, isLoading]);

  // Show loading state while checking authentication
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
      {isAuthenticated ? (
        <>
          <Route path="/" component={HomeRouter} />
          <Route path="/home-free" component={HomeFree} />
          <Route path="/home-premium" component={HomePremium} />
          <Route path="/dev-preview" component={DevPreview} />
          <Route path="/settings" component={Settings} />
          <Route path="/settings/personal" component={PersonalInfo} />
          <Route path="/settings/notifications" component={Notifications} />
          <Route path="/settings/appearance" component={Appearance} />
          <Route path="/settings/billing" component={Billing} />
          <Route path="/settings/history" component={ReminderHistory} />
        </>
      ) : null}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [showDevTools, setShowDevTools] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <DevTools 
          isVisible={showDevTools} 
          onToggle={() => setShowDevTools(!showDevTools)}
        />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;