import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Check, X } from "lucide-react";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const SubscribeForm = ({ selectedPlan }: { selectedPlan: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const buttonText = selectedPlan === 'yearly' ? 'Subscribe for $48/year' : 'Subscribe for $6/month';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!stripe || !elements) {
      setIsSubmitting(false);
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/settings?payment=success`,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment Successful",
        description: "Welcome to Premium! You now have access to AI-generated reminders.",
      });
    }
    
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="subscription-form">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || isSubmitting}
        className="w-full"
        data-testid="button-subscribe"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          buttonText
        )}
      </Button>
    </form>
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
          Everything you get with your $5/month subscription
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
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState('yearly'); // Default to yearly for better value

  const createSubscription = (plan: string) => {
    setLoading(true);
    setError("");
    
    // Create subscription with selected plan
    apiRequest("POST", "/api/create-subscription", { plan })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          throw new Error(data.error.message);
        }
        setClientSecret(data.clientSecret);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Subscription creation failed:', error);
        setError(error.message || 'Failed to create subscription');
        setLoading(false);
      });
  };

  useEffect(() => {
    // Create subscription when component mounts or plan changes
    createSubscription(selectedPlan);
  }, [selectedPlan]);

  const handlePlanChange = (plan: string) => {
    setSelectedPlan(plan);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Setting up your subscription...</p>
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
              Subscription Error
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

  if (!clientSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
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
              <CardTitle>Payment Details</CardTitle>
              <CardDescription>
                Secure payment powered by Stripe
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <SubscribeForm selectedPlan={selectedPlan} />
              </Elements>
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