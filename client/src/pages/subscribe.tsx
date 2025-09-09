import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Check, X, Smartphone, ArrowRight } from "lucide-react";

// RevenueCat integration - subscriptions managed through mobile app stores

const MobileSubscribePrompt = ({ selectedPlan }: { selectedPlan: string }) => {
  const { toast } = useToast();
  
  const planPrice = selectedPlan === 'yearly' ? '$48/year (save 33%)' : '$6/month';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent('Download our mobile app to subscribe!')}`;

  const handleDownloadPrompt = () => {
    toast({
      title: "Download Required",
      description: "Please download our mobile app from the App Store or Google Play to subscribe.",
    });
  };

  return (
    <div className="space-y-6" data-testid="mobile-subscribe-prompt">
      <div className="text-center space-y-4">
        <Smartphone className="h-16 w-16 mx-auto text-blue-500" />
        <div>
          <h3 className="text-xl font-semibold">Mobile App Required</h3>
          <p className="text-muted-foreground">Subscriptions are managed through our mobile app for the best experience</p>
        </div>
        
        <div className="p-4 bg-blue-50 rounded-lg">
          <img src={qrCodeUrl} alt="QR Code" className="w-32 h-32 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Scan with your phone to download</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Button 
          onClick={handleDownloadPrompt}
          className="w-full bg-black text-white hover:bg-gray-800"
          data-testid="button-ios-download"
        >
          <ArrowRight className="mr-2 h-4 w-4" />
          Download for iOS
        </Button>
        <Button 
          onClick={handleDownloadPrompt}
          className="w-full bg-green-600 text-white hover:bg-green-700"
          data-testid="button-android-download"
        >
          <ArrowRight className="mr-2 h-4 w-4" />
          Download for Android
        </Button>
      </div>
      
      <div className="text-center text-sm text-muted-foreground">
        <p>Selected plan: {planPrice}</p>
        <p>You'll be able to choose and purchase this plan in the mobile app</p>
      </div>
    </div>
  );
};

const PremiumFeatures = () => {
  const features = [
    {
      icon: <Check className="h-5 w-5 text-green-500" />,
      title: "AI-Generated Responses",
      description: "Get personalized, contextually-aware rude reminders powered by advanced AI"
    },
    {
      icon: <Check className="h-5 w-5 text-green-500" />,
      title: "Cultural & Gender Personalization",
      description: "Reminders tailored to your cultural background and personal preferences"
    },
    {
      icon: <Check className="h-5 w-5 text-green-500" />,
      title: "Premium Motivational Quotes",
      description: "Access to an extensive library of culturally-specific motivational content"
    },
    {
      icon: <Check className="h-5 w-5 text-green-500" />,
      title: "Unlimited Reminders",
      description: "Create as many reminders as you need without restrictions"
    },
    {
      icon: <Check className="h-5 w-5 text-green-500" />,
      title: "Advanced Voice Characters",
      description: "Premium voice personalities for more engaging reminder experiences"
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Premium Features</CardTitle>
        <CardDescription>
          Everything you get with your premium subscription
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
            <span>Monthly Plan</span>
            {selectedPlan === 'monthly' && <Check className="h-5 w-5 text-blue-500" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">$6<span className="text-lg text-muted-foreground">/month</span></div>
          <p className="text-sm text-muted-foreground mt-1">Billed monthly</p>
        </CardContent>
      </Card>

      <Card 
        className={`cursor-pointer transition-all relative ${selectedPlan === 'yearly' ? 'ring-2 ring-green-500 bg-green-50' : 'hover:shadow-md'}`}
        onClick={() => onPlanChange('yearly')}
        data-testid="plan-yearly"
      >
        <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
          Save 33%
        </div>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Yearly Plan</span>
            {selectedPlan === 'yearly' && <Check className="h-5 w-5 text-green-500" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">$48<span className="text-lg text-muted-foreground">/year</span></div>
          <p className="text-sm text-muted-foreground mt-1">$4/month (billed yearly)</p>
          <p className="text-xs text-green-600 font-medium">Early subscriber special!</p>
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

  const fetchCustomerInfo = () => {
    setLoading(true);
    setError("");
    
    // Fetch current subscription status
    apiRequest("GET", "/api/customer-info")
      .then((res) => res.json())
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

  useEffect(() => {
    // Fetch customer info when component mounts
    fetchCustomerInfo();
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
      <div className="min-h-screen flex items-center justify-center">
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
              onClick={() => window.location.href = '/settings'}
              className="w-full"
              data-testid="button-back-to-settings"
            >
              Back to Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show current subscription status if user is already premium
  if (customerInfo?.subscriptionStatus === 'active') {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto space-y-6">
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
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Upgrade to Premium</h1>
          <p className="text-muted-foreground mt-2">
            Choose your plan and unlock AI-powered personalized reminders
          </p>
        </div>

        <PlanSelector selectedPlan={selectedPlan} onPlanChange={handlePlanChange} />

        <div className="grid md:grid-cols-2 gap-6">
          <PremiumFeatures />
          
          <Card>
            <CardHeader>
              <CardTitle>Get Premium Access</CardTitle>
              <CardDescription>
                Download our mobile app to subscribe and unlock premium features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MobileSubscribePrompt selectedPlan={selectedPlan} />
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>You can cancel your subscription at any time from your settings.</p>
          <p>Your subscription will remain active until the end of your billing period.</p>
        </div>
      </div>
    </div>
  );
}