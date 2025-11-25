import { Route, Switch, useLocation } from "wouter";
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
import { useEffect } from "react";
import { revenueCatService } from "@/services/revenueCatService";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

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

  // Authenticated users (including developer accounts) always see premium interface
  // Guest users (not authenticated) see the free experience
  return isAuthenticated ? <HomePremium /> : <HomeFree />;
}

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location] = useLocation();

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
      {/* Guest mode: Allow access to home without login */}
      <Route path="/" component={HomeRouter} />
      <Route path="/login" component={LoginPage} />
      <Route path="/subscribe" component={Subscribe} />

      {/* Account-required routes - redirect to login if not authenticated */}
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
          {/* Redirect to login for protected routes */}
          <Route path="/settings/:rest*">
            {() => {
              window.location.href = '/login';
              return null;
            }}
          </Route>
          <Route path="/admin">
            {() => {
              window.location.href = '/login';
              return null;
            }}
          </Route>
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    // Initialize RevenueCat when app starts
    revenueCatService.initialize().catch(console.error);

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
      <TooltipProvider>
        <NotificationProvider>
          <Toaster />
          <Router />
        </NotificationProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;