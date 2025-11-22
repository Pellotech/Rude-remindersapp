import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Check, X, ArrowLeft, Home, Crown, Sparkles } from "lucide-react";
import { Purchases } from '@revenuecat/purchases-js';
import { getPlatformInfo } from '@/utils/platformDetection';


export default function Subscribe() {
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const { toast } = useToast();
  const platform = getPlatformInfo();

  const fetchCustomerInfo = () => {
    setLoading(true);
    setError("");
    
    // Fetch current subscription status
    apiRequest("/api/customer-info", { method: 'GET' })
      .then((data) => {
        if (data.error) {
          throw new Error(data.error.message);
        }
        setCustomerInfo(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to fetch customer info:', error);
        setError(error.message || 'Failed to fetch subscription status');
        setLoading(false);
      });
  };

  // Initialize RevenueCat (Web SDK for web, native SDK already configured for mobile)
  const initializeRevenueCat = async () => {
    // On mobile, native SDK is already configured - just set ready to true
    if (platform.isNative) {
      console.log('Native platform detected - using native RevenueCat SDK');
      setReady(true);
      return;
    }

    // On web, configure the Web SDK
    const apiKey = import.meta.env.VITE_REVENUECAT_WEB_API_KEY;
    
    if (!apiKey) {
      console.warn('RevenueCat Web API key not configured');
      setReady(false);
      return;
    }

    try {
      // Get user info for RevenueCat
      const user = await apiRequest("/api/auth/user", { method: 'GET' });
      const userId = user.id || `guest-${Date.now()}`;
      
      // Configure RevenueCat Web SDK
      Purchases.configure({
        apiKey: apiKey,
        appUserId: userId,
      });
      
      setReady(true);
      console.log('RevenueCat Web SDK configured for user:', userId);
    } catch (error) {
      console.error('Failed to configure RevenueCat Web SDK:', error);
      setReady(false);
    }
  };

  // Display RevenueCat paywall (native or web)
  const showPaywall = async () => {
    if (!ready) {
      toast({
        title: "Payment System Loading",
        description: "Please wait a moment...",
        variant: "destructive",
      });
      return;
    }

    try {
      // Native mobile purchase flow
      if (platform.isNative) {
        const { Purchases } = await import('@revenuecat/purchases-capacitor');
        
        console.log('[Native] Fetching offerings...');
        const offeringsResult: any = await Purchases.getOfferings();
        
        if (!offeringsResult.current) {
          throw new Error('No subscription plans available. Please try again later.');
        }

        console.log('[Native] Current offering:', offeringsResult.current);
        
        // Get the annual package or first available
        const packages = offeringsResult.current.availablePackages;
        const annualPackage = packages.find((p: any) => 
          p.identifier === '$rc_annual' || 
          p.packageType === 'ANNUAL' ||
          p.identifier.includes('annual') ||
          p.identifier.includes('yearly')
        );
        
        const selectedPackage = annualPackage || packages[0];
        
        if (!selectedPackage) {
          throw new Error('No subscription packages available.');
        }

        console.log('[Native] Purchasing package:', selectedPackage.identifier);
        
        // Show native paywall
        const { customerInfo: purchaseResult } = await Purchases.purchasePackage({
          aPackage: selectedPackage
        });

        console.log('[Native] Purchase completed:', purchaseResult);
        
        // Check if premium is active
        const isPremium = Object.keys(purchaseResult.entitlements.active).length > 0;
        
        if (isPremium) {
          // Refresh customer info
          fetchCustomerInfo();
          
          toast({
            title: "Success!",
            description: "Your subscription is now active!",
          });
        }
      } else {
        // Web purchase flow
        const purchases = Purchases.getSharedInstance();
        
        console.log('[Web] Fetching offerings...');
        const offerings = await purchases.getOfferings();
        
        if (!offerings.current) {
          throw new Error('No subscription plans available. Please try again later.');
        }

        // Get the annual package (best value)
        const selectedPackage = offerings.current.annual || offerings.current.availablePackages[0];
        
        if (!selectedPackage) {
          throw new Error('No subscription packages available.');
        }

        console.log('[Web] Purchasing package:', selectedPackage.identifier);

        const purchaseResult = await purchases.purchase({
          rcPackage: selectedPackage,
        });

        console.log('[Web] Purchase completed:', purchaseResult);
        
        // Refresh customer info
        fetchCustomerInfo();
        
        toast({
          title: "Success!",
          description: "Your subscription is now active!",
        });
      }
    } catch (error: any) {
      console.error('Paywall error:', {
        message: error.message,
        code: error.code,
        userCancelled: error.userCancelled
      });
      
      // Don't show error for user cancellation
      if (error.userCancelled || error.message === 'User cancelled') {
        console.log('User cancelled purchase');
        return;
      }
      
      toast({
        title: "Subscription Error",
        description: error.message || "Failed to process subscription. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Fetch customer info and initialize RevenueCat when component mounts
    fetchCustomerInfo();
    initializeRevenueCat();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading subscription information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Navigation Header */}
          <div className="flex items-center justify-between mb-4 pt-safe">
            <Button 
              variant="outline" 
              onClick={() => window.history.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Home
            </Button>
          </div>

          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <X className="h-5 w-5 text-red-500 mr-2" />
                  Error Loading Subscription
                </CardTitle>
                <CardDescription>{error}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => window.location.href = '/'}
                  className="w-full"
                  data-testid="button-back-to-home"
                >
                  Back to Home
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Check if user has premium entitlement
  const isPremium = customerInfo?.subscriptionStatus === 'active';

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Navigation Header */}
        <div className="flex items-center justify-between mb-4 pt-safe">
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
            className="flex items-center gap-2"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2"
            data-testid="button-home"
          >
            <Home className="h-4 w-4" />
            Home
          </Button>
        </div>

        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <Crown className="h-20 w-20 mx-auto text-purple-600" />
            <Sparkles className="h-6 w-6 absolute -top-2 -right-2 text-yellow-500" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Premium Subscription
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Unlock all premium features and get the full Rude Reminders experience
          </p>
        </div>

        {/* Main CTA Card */}
        {isPremium ? (
          <Card className="shadow-2xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="pt-10 pb-10">
              <div className="text-center space-y-6">
                <Check className="h-16 w-16 mx-auto text-green-500" />
                <div>
                  <h2 className="text-2xl font-bold text-green-700 mb-2">You're a Premium Member! 🎉</h2>
                  <p className="text-muted-foreground">
                    Enjoy unlimited access to all premium features
                  </p>
                </div>
                
                <Button 
                  onClick={() => window.location.href = '/settings'}
                  variant="outline"
                  className="w-full max-w-sm"
                  data-testid="button-view-subscription"
                >
                  View Subscription Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
            <CardContent className="pt-10 pb-10">
              <div className="space-y-8">
                {ready ? (
                  <>
                    <Button 
                      onClick={showPaywall}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-2xl py-8 shadow-lg"
                      size="lg"
                      data-testid="button-subscribe-now"
                    >
                      <Crown className="h-7 w-7 mr-3" />
                      Subscribe Now
                    </Button>
                    
                    <div className="text-center space-y-2">
                      <p className="text-sm text-muted-foreground font-medium">
                        ✓ 30-day money-back guarantee
                      </p>
                      <p className="text-sm text-muted-foreground font-medium">
                        ✓ Cancel anytime, no questions asked
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-purple-600" />
                    <p className="text-muted-foreground">Loading payment options...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}