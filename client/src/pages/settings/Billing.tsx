import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BackNavigation } from "@/components/BackNavigation";
import { CreditCard, Crown, Calendar, Check, X } from "lucide-react";

export default function Billing() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: user, isLoading } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: () => apiRequest("/api/subscription/cancel", "POST"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Subscription cancelled",
        description: "Your subscription has been cancelled successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
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

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <BackNavigation customBackPath="/settings" customBackLabel="Back to Settings" showMainPageButton={true} />

      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Payment & Billing</h1>
        <p className="text-muted-foreground">Manage your subscription and payment methods</p>
      </div>

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
              <h3 className="font-semibold capitalize">{subscriptionPlan} Plan</h3>
              <p className="text-sm text-muted-foreground">
                {isSubscribed ? "Premium features enabled" : "Basic features only"}
              </p>
            </div>
            <Badge variant={isSubscribed ? "default" : "secondary"} className="flex items-center gap-1">
              {isSubscribed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              {isSubscribed ? "Active" : "Free"}
            </Badge>
          </div>

          {isSubscribed && subscriptionEndsAt && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Next billing: {new Date(subscriptionEndsAt).toLocaleDateString()}
            </div>
          )}

          <div className="pt-4 border-t">
            {!isSubscribed ? (
              <Button className="bg-rude-red hover:bg-rude-red/90">
                Upgrade to Premium
              </Button>
            ) : (
              <Button 
                variant="outline" 
                onClick={() => cancelSubscriptionMutation.mutate()}
                disabled={cancelSubscriptionMutation.isPending}
              >
                {cancelSubscriptionMutation.isPending ? "Cancelling..." : "Cancel Subscription"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="h-5 w-5" />
            Premium Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Check className={`h-4 w-4 ${isSubscribed ? 'text-green-600' : 'text-gray-400'}`} />
              <span className={isSubscribed ? 'text-foreground' : 'text-muted-foreground'}>
                Unlimited reminder attachments
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Check className={`h-4 w-4 ${isSubscribed ? 'text-green-600' : 'text-gray-400'}`} />
              <span className={isSubscribed ? 'text-foreground' : 'text-muted-foreground'}>
                Advanced voice character selection
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Check className={`h-4 w-4 ${isSubscribed ? 'text-green-600' : 'text-gray-400'}`} />
              <span className={isSubscribed ? 'text-foreground' : 'text-muted-foreground'}>
                Cultural motivational quotes
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Check className={`h-4 w-4 ${isSubscribed ? 'text-green-600' : 'text-gray-400'}`} />
              <span className={isSubscribed ? 'text-foreground' : 'text-muted-foreground'}>
                Priority customer support
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Check className={`h-4 w-4 ${isSubscribed ? 'text-green-600' : 'text-gray-400'}`} />
              <span className={isSubscribed ? 'text-foreground' : 'text-muted-foreground'}>
                Mobile app with push notifications
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {isSubscribed && (
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
              
              <Button variant="outline" className="w-full">
                Add Payment Method
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isSubscribed && (
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
                  <p className="font-medium">$9.99</p>
                  <Badge variant="outline" className="text-xs">
                    Paid
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">December 2024</p>
                  <p className="text-sm text-muted-foreground">Premium Plan</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">$9.99</p>
                  <Badge variant="outline" className="text-xs">
                    Paid
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}