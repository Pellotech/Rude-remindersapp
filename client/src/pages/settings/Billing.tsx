
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BackNavigation } from "@/components/BackNavigation";
import { CreditCard, Crown, Calendar, Check, X, Star, Zap, MessageSquare, Users, BarChart3, Smartphone } from "lucide-react";

export default function Billing() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: user, isLoading } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  const { data: usageData } = useQuery<any>({
    queryKey: ["/api/user/premium-status"],
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: () => apiRequest("/api/cancel-subscription", "POST"),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/premium-status"] });
      toast({
        title: "Subscription cancelled",
        description: data.message || "Your subscription will be cancelled at the end of the billing period.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  const isSubscribed = user?.subscriptionStatus === "active";
  const subscriptionPlan = user?.subscriptionPlan || "free";
  const subscriptionEndsAt = user?.subscriptionEndsAt;
  const currentUsage = usageData?.currentUsage || 0;
  const monthlyLimit = usageData?.monthlyLimit || 12;

  const premiumFeatures = [
    {
      icon: <MessageSquare className="h-5 w-5 text-purple-600" />,
      title: "AI-Generated Personalized Responses",
      description: "Get culturally-aware, contextually relevant rude reminders powered by advanced AI",
      category: "AI Features"
    },
    {
      icon: <Users className="h-5 w-5 text-blue-600" />,
      title: "Cultural & Gender-Specific Content",
      description: "Reminders tailored to your cultural background and personal preferences",
      category: "Personalization"
    },
    {
      icon: <Star className="h-5 w-5 text-yellow-600" />,
      title: "Premium Motivational Quotes",
      description: "Access to an extensive library of culturally-specific motivational content",
      category: "Content"
    },
    {
      icon: <Zap className="h-5 w-5 text-green-600" />,
      title: "Unlimited Reminders",
      description: "Create as many reminders as you need without monthly restrictions",
      category: "Usage"
    },
    {
      icon: <MessageSquare className="h-5 w-5 text-indigo-600" />,
      title: "10 Premium Voice Characters",
      description: "Advanced voice personalities for more engaging reminder experiences",
      category: "Voices"
    },
    {
      icon: <BarChart3 className="h-5 w-5 text-orange-600" />,
      title: "Detailed Analytics",
      description: "Track your productivity and reminder effectiveness over time",
      category: "Analytics"
    },
    {
      icon: <Smartphone className="h-5 w-5 text-pink-600" />,
      title: "Priority Mobile Support",
      description: "Enhanced mobile app features with priority customer support",
      category: "Support"
    }
  ];

  // Show different layouts for premium vs free users
  if (isSubscribed) {
    // Premium User - Simple Billing Management (matches your screenshots)
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <BackNavigation customBackPath="/settings" customBackLabel="Back to Settings" showMainPageButton={true} />

        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Payment & Billing
          </h1>
          <p className="text-muted-foreground">
            Manage your subscription and payment methods
          </p>
        </div>

        {/* Current Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Premium Plan</h3>
                <p className="text-sm text-muted-foreground">Premium features enabled</p>
              </div>
              <Badge className="bg-green-100 text-green-800 border-green-300">
                <Check className="h-3 w-3 mr-1" />
                Active
              </Badge>
            </div>

            {subscriptionEndsAt && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Next billing: {new Date(subscriptionEndsAt).toLocaleDateString()}
              </div>
            )}

            <Button 
              variant="outline"
              onClick={() => cancelSubscriptionMutation.mutate()}
              disabled={cancelSubscriptionMutation.isPending}
              data-testid="button-cancel-subscription"
              className="w-full"
            >
              {cancelSubscriptionMutation.isPending ? "Cancelling..." : "Cancel Subscription"}
            </Button>
          </CardContent>
        </Card>

        {/* Premium Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              Premium Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">AI-Generated Personalized Responses</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">Cultural & Gender-Specific Content</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">Premium Motivational Quotes</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">Unlimited Reminders</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">Advanced Voice Characters</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">•••• •••• •••• 4242</p>
                    <p className="text-sm text-muted-foreground">Expires 12/25</p>
                  </div>
                </div>
                <Badge variant="outline">Primary</Badge>
              </div>
              
              <Button variant="outline" className="w-full" data-testid="button-add-payment-method">
                Add Payment Method
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Billing History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Billing History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">January 2025</p>
                  <p className="text-sm text-muted-foreground">Premium Plan</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">$48.00</p>
                  <Badge variant="outline" className="text-xs">
                    Paid
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">December 2024</p>
                  <p className="text-sm text-muted-foreground">Premium Plan (Monthly)</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">$6.00</p>
                  <Badge variant="outline" className="text-xs">
                    Paid
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button 
            variant="destructive" 
            onClick={() => cancelSubscriptionMutation.mutate()}
            disabled={cancelSubscriptionMutation.isPending}
            data-testid="button-cancel-subscription-footer"
          >
            {cancelSubscriptionMutation.isPending ? "Cancelling..." : "Cancel Subscription"}
          </Button>
        </div>
      </div>
    );
  }

  // Free User - Upgrade Interface
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <BackNavigation customBackPath="/settings" customBackLabel="Back to Settings" showMainPageButton={true} />

      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Upgrade to Premium
        </h1>
        <p className="text-lg text-muted-foreground">
          Unlock the full power of Rude Reminders
        </p>
      </div>

      {/* Current Plan Status */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-purple-600" />
            Current Plan: Free
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Free Plan</h3>
              <p className="text-sm text-muted-foreground">
                {currentUsage}/{monthlyLimit} reminders used this month
              </p>
            </div>
            <Badge variant="secondary" className="flex items-center gap-1">
              <X className="h-3 w-3" />
              Free
            </Badge>
          </div>

          <div className="mt-4 p-4 bg-white/70 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Free Plan Usage</p>
                <div className="w-64 h-2 bg-gray-200 rounded-full mt-1">
                  <div 
                    className="h-full bg-purple-600 rounded-full transition-all" 
                    style={{width: `${(currentUsage / monthlyLimit) * 100}%`}}
                  />
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-purple-800">From $4/month</p>
                <p className="text-sm text-purple-600">$48 yearly or $6 monthly</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Premium Features Grid */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-center">Premium Features</h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {premiumFeatures.map((feature, index) => (
            <Card key={index} className="bg-gray-50 hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  {feature.icon}
                  <div>
                    <Badge variant="outline" className="text-xs mb-1">
                      {feature.category}
                    </Badge>
                    <CardTitle className="text-sm font-medium">
                      {feature.title}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="text-center space-y-4">
        <div className="space-y-3">
          <Button 
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 text-lg"
            onClick={() => window.location.href = '/subscribe'}
            data-testid="button-upgrade-premium"
          >
            <Crown className="h-5 w-5 mr-2" />
            Choose Your Plan - From $4/month
          </Button>
          <p className="text-sm text-muted-foreground">
            30-day money-back guarantee • Cancel anytime
          </p>
        </div>
      </div>

      {/* Support Section */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="text-center">
            <h3 className="font-semibold mb-2">Need Help?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Our support team is here to help you get the most out of Rude Reminders.
            </p>
            <div className="flex justify-center gap-4">
              <Button variant="outline" size="sm">
                Contact Support
              </Button>
              <Button variant="outline" size="sm">
                View FAQ
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
