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

const SubscribeForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          'Subscribe for $5/month'
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

export default function Subscribe() {
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Create subscription as soon as the page loads
    apiRequest("POST", "/api/create-subscription")
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
  }, []);

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
            Unlock AI-powered personalized reminders for just $5/month
          </p>
        </div>

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
                <SubscribeForm />
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