import { useEffect, useState, useRef } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Check, X, Smartphone, ArrowRight, ArrowLeft, Home, Crown, AlertCircle } from "lucide-react";
import { Purchases } from '@revenuecat/purchases-js';

// RevenueCat Web SDK integration for web paywalls

const MobileSubscribePrompt = ({ selectedPlan }: { selectedPlan: string }) => {
  const { toast } = useToast();
  
  const planPrice = selectedPlan === 'yearly' ? '$44.99/year USD' : '$5.99/month USD';

  const handleDownloadPrompt = () => {
    toast({
      title: "Download Required",
      description: "Please download our mobile app to subscribe.",
    });
  };

  return (
    <div className="space-y-6" data-testid="mobile-subscribe-prompt">
      <div className="text-center space-y-4">
        <Smartphone className="h-16 w-16 mx-auto text-blue-500" />
        <div>
          <h3 className="text-xl font-semibold">Subscribe via Mobile App</h3>
          <p className="text-muted-foreground">Download the app to start your premium subscription</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Button 
          onClick={handleDownloadPrompt}
          className="w-full bg-black text-white hover:bg-gray-800"
          data-testid="button-ios-download"
        >
          <ArrowRight className="mr-2 h-4 w-4" />
          App Store
        </Button>
        <Button 
          onClick={handleDownloadPrompt}
          className="w-full bg-green-600 text-white hover:bg-green-700"
          data-testid="button-android-download"
        >
          <ArrowRight className="mr-2 h-4 w-4" />
          Google Play
        </Button>
      </div>
      
      <div className="text-center text-sm text-muted-foreground">
        <p>Selected: {planPrice}</p>
      </div>
    </div>
  );
};

const PremiumFeatures = () => {
  const features = [
    {
      icon: <Check className="h-5 w-5 text-green-500" />,
      title: "Unlimited Reminders",
      description: "Create as many reminders as you need"
    },
    {
      icon: <Check className="h-5 w-5 text-green-500" />,
      title: "Premium Content",
      description: "Access to exclusive reminder features"
    },
    {
      icon: <Check className="h-5 w-5 text-green-500" />,
      title: "Ad-Free Experience",
      description: "Enjoy the app without advertisements"
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Premium Benefits</CardTitle>
        <CardDescription>
          Upgrade to unlock premium features
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start space-x-3">
              {feature.icon}
              <div>
                <h4 className="font-medium text-sm">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const PlanSelector = ({ selectedPlan, onPlanChange }: { selectedPlan: string, onPlanChange: (plan: string) => void }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <Card 
        className={`cursor-pointer transition-all ${selectedPlan === 'monthly' ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'}`}
        onClick={() => onPlanChange('monthly')}
        data-testid="plan-monthly"
      >
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Monthly</span>
            {selectedPlan === 'monthly' && <Check className="h-5 w-5 text-blue-500" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">$5.99<span className="text-lg text-muted-foreground">/month USD</span></div>
          <p className="text-sm text-muted-foreground mt-1">Renews monthly</p>
        </CardContent>
      </Card>

      <Card 
        className={`cursor-pointer transition-all relative ${selectedPlan === 'yearly' ? 'ring-2 ring-green-500 bg-green-50' : 'hover:shadow-md'}`}
        onClick={() => onPlanChange('yearly')}
        data-testid="plan-yearly"
      >
        <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
          Best Value
        </div>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Annual</span>
            {selectedPlan === 'yearly' && <Check className="h-5 w-5 text-green-500" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">$44.99<span className="text-lg text-muted-foreground">/year USD</span></div>
          <p className="text-sm text-muted-foreground mt-1">Save 37% annually</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default function Subscribe() {
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState('yearly'); // Default to yearly for better value
  const [rcConfigured, setRcConfigured] = useState(false);
  const [rcError, setRcError] = useState("");
  const paywallContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

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

  // Initialize RevenueCat Web SDK
  const initializeRevenueCat = async () => {
    const apiKey = import.meta.env.VITE_REVENUECAT_WEB_API_KEY;
    
    if (!apiKey) {
      console.warn('RevenueCat Web API key not configured');
      setRcError('RevenueCat not configured');
      return;
    }

    try {
      // Get user info for RevenueCat
      const user = await apiRequest("/api/auth/user", { method: 'GET' });
      const userId = user.id || `user-${Date.now()}`;
      
      // Configure RevenueCat (returns Purchases instance)
      Purchases.configure({
        apiKey: apiKey,
        appUserId: userId,
      });
      
      setRcConfigured(true);
      console.log('RevenueCat configured successfully');
    } catch (error) {
      console.error('Failed to configure RevenueCat:', error);
      setRcError('Failed to initialize payment system');
    }
  };

  // Display RevenueCat paywall
  const showPaywall = async () => {
    if (!rcConfigured || !paywallContainerRef.current) {
      toast({
        title: "Configuration Required",
        description: "Payment system is not configured. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get shared Purchases instance
      const purchases = Purchases.getSharedInstance();
      
      console.log('Fetching offerings...');
      
      // Get offerings
      const offerings = await purchases.getOfferings();
      
      console.log('Offerings received:', offerings);
      console.log('Current offering:', offerings.current);
      console.log('All offerings:', offerings.all);
      
      if (!offerings.current) {
        console.error('No current offering found. Available offerings:', Object.keys(offerings.all || {}));
        throw new Error('No current offering available. Please set a current offering in RevenueCat dashboard.');
      }

      console.log('Available packages in current offering:', offerings.current.availablePackages);
      console.log('Annual package:', offerings.current.annual);
      console.log('Monthly package:', offerings.current.monthly);

      // Get the package based on selected plan
      const selectedPackage = selectedPlan === 'yearly' 
        ? offerings.current.annual || offerings.current.availablePackages.find(p => p.identifier.includes('yearly'))
        : offerings.current.monthly || offerings.current.availablePackages.find(p => p.identifier.includes('monthly'));
      
      if (!selectedPackage) {
        console.error('No package found for plan:', selectedPlan);
        console.error('Available packages:', offerings.current.availablePackages.map(p => p.identifier));
        throw new Error(`No ${selectedPlan} package available. Please check your RevenueCat product configuration.`);
      }

      console.log('Selected package:', selectedPackage.identifier, selectedPackage.product);

      const purchaseResult = await purchases.purchase({
        rcPackage: selectedPackage,
      });

      console.log('Purchase completed:', purchaseResult);
      
      // Refresh customer info after purchase
      fetchCustomerInfo();
      
      toast({
        title: "Success!",
        description: "Your subscription is now active!",
      });
    } catch (error: any) {
      console.error('Paywall error details:', {
        message: error.message,
        code: error.code,
        underlyingError: error.underlyingErrorMessage,
        stack: error.stack
      });
      
      if (error.message !== 'User cancelled' && !error.userCancelled) {
        toast({
          title: "Subscription Error",
          description: error.message || "Failed to process subscription. Please try again or contact support.",
          variant: "destructive",
        });
      }
    }
  };

  useEffect(() => {
    // Fetch customer info and initialize RevenueCat when component mounts
    fetchCustomerInfo();
    initializeRevenueCat();
  }, []);

  const handlePlanChange = (plan: string) => {
    setSelectedPlan(plan);
  };

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
          <div className="flex items-center justify-between mb-4">
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

  // Show current subscription status if user is already premium
  if (customerInfo?.subscriptionStatus === 'active') {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Navigation Header */}
          <div className="flex items-center justify-between mb-4">
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

          <div className="text-center">
            <Check className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h1 className="text-3xl font-bold">You're Already Premium!</h1>
            <p className="text-muted-foreground mt-2">
              You have an active {customerInfo.subscriptionPlan} subscription
            </p>
          </div>
          
          <PremiumFeatures />
          
          <div className="text-center">
            <Button 
              onClick={() => window.location.href = '/settings'}
              data-testid="button-manage-subscription"
            >
              Manage Subscription
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Header */}
        <div className="flex items-center justify-between mb-4">
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

        <div className="text-center">
          <Crown className="h-16 w-16 mx-auto text-purple-600 mb-4" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Premium Subscription
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Choose your plan to unlock premium features
          </p>
        </div>

        {/* RevenueCat Paywall Container */}
        {rcConfigured ? (
          <Card className="shadow-lg border-2 border-purple-200">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Crown className="h-6 w-6 text-purple-600" />
                Select Your Premium Plan
              </CardTitle>
              <CardDescription>
                Subscribe now to unlock all premium features with RevenueCat secure checkout
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {/* RevenueCat Paywall will be injected here */}
              <div 
                ref={paywallContainerRef} 
                className="min-h-[400px] rounded-lg"
                data-testid="revenuecat-paywall-container"
              />
              
              <div className="mt-6 space-y-4">
                <Button 
                  onClick={showPaywall}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-lg py-6"
                  size="lg"
                  data-testid="button-show-paywall"
                >
                  <Crown className="h-5 w-5 mr-2" />
                  View Subscription Plans
                </Button>
                
                <p className="text-center text-sm text-muted-foreground">
                  ✓ 30-day money-back guarantee • ✓ Cancel anytime • ✓ Secure checkout
                </p>

                <details className="mt-4 p-3 bg-gray-50 rounded-lg text-xs">
                  <summary className="cursor-pointer font-medium text-gray-700">
                    Troubleshooting Info (for debugging)
                  </summary>
                  <div className="mt-2 space-y-1 text-gray-600">
                    <p>✓ RevenueCat Web SDK: Configured</p>
                    <p>✓ API Key: Present</p>
                    <p className="text-orange-600 mt-2">
                      If you see "No offerings available" error:
                    </p>
                    <ol className="list-decimal list-inside ml-2 space-y-1">
                      <li>Go to RevenueCat Dashboard → Offerings</li>
                      <li>Ensure you have created an offering</li>
                      <li>Check "Set as Current Offering" checkbox</li>
                      <li>Add your products to the offering</li>
                      <li>Wait 2-3 minutes for cache to update</li>
                      <li>Check browser console (F12) for detailed logs</li>
                    </ol>
                  </div>
                </details>
              </div>
            </CardContent>
          </Card>
        ) : rcError ? (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <AlertCircle className="h-5 w-5" />
                Configuration Needed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-orange-700">
                RevenueCat is not configured. To enable web subscriptions:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-orange-700">
                <li>Get your RevenueCat Web API Key from the RevenueCat dashboard</li>
                <li>Add it as environment variable: <code className="bg-white px-2 py-1 rounded">VITE_REVENUECAT_WEB_API_KEY</code></li>
                <li>Create offerings and paywalls in the RevenueCat dashboard</li>
                <li>Restart the application</li>
              </ol>
              
              <div className="pt-4">
                <p className="text-sm font-medium mb-2">Alternative: Mobile App Download</p>
                <MobileSubscribePrompt selectedPlan={selectedPlan} />
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex justify-center items-center min-h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        )}

        {/* Premium Features */}
        <div className="grid md:grid-cols-2 gap-6">
          <PremiumFeatures />
          
          <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-blue-600" />
                Mobile App Available
              </CardTitle>
              <CardDescription>
                Also subscribe through our mobile app
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Prefer to subscribe through the App Store or Google Play? Download our mobile app:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => toast({ title: "App Store", description: "Download our iOS app to subscribe" })}
                    className="w-full"
                    data-testid="button-ios-download"
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    App Store
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => toast({ title: "Google Play", description: "Download our Android app to subscribe" })}
                    className="w-full"
                    data-testid="button-android-download"
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Google Play
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-sm text-muted-foreground bg-gray-50 p-4 rounded-lg">
          <p className="font-medium mb-1">Money-Back Guarantee</p>
          <p>You can cancel your subscription at any time from your settings.</p>
          <p>Your subscription will remain active until the end of your billing period.</p>
        </div>
      </div>
    </div>
  );
}