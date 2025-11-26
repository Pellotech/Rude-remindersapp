import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ChevronLeft, Home, Check } from "lucide-react";

export default function Billing() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: user, isLoading } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: () => apiRequest("/api/cancel-subscription", { method: "POST" }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Cancellation",
        description: data.message || "Please manage your subscription through your device settings.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process request. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  const isSubscribed = user?.subscriptionStatus === "active";
  const subscriptionPlan = user?.subscriptionPlan || "free";
  const subscriptionEndsAt = user?.subscriptionEndsAt;

  const getStatusColor = () => {
    if (isSubscribed) return "text-[#34C759]";
    if (user?.subscriptionStatus === "canceled") return "text-[#FF9500]";
    return "text-[#8E8E93]";
  };

  const getStatusText = () => {
    if (isSubscribed) return "Active";
    if (user?.subscriptionStatus === "canceled") return "Canceled";
    if (user?.subscriptionStatus === "expired") return "Expired";
    return "Free";
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-lg mx-auto">
        <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-[#38383A]" style={{ paddingTop: 'env(safe-area-inset-top, 20px)' }}>
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/settings">
              <div className="flex items-center text-[#0A84FF] cursor-pointer" data-testid="button-back">
                <ChevronLeft className="h-5 w-5" />
                <span className="text-[17px]">Settings</span>
              </div>
            </Link>
            <Link href="/">
              <div className="text-[#0A84FF] cursor-pointer" data-testid="button-home">
                <Home className="h-5 w-5" />
              </div>
            </Link>
          </div>
          <h1 className="text-[34px] font-bold text-white px-4 pb-2">Payment & Billing</h1>
        </div>

        <div className="py-6 px-4 space-y-8">
          <div>
            <h2 className="text-[13px] text-[#8E8E93] uppercase tracking-wide px-4 mb-2">Current Plan</h2>
            <div className="bg-[#1C1C1E] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#38383A]">
                <span className="text-white text-[17px]">Plan</span>
                <span className="text-[#8E8E93] text-[17px]">
                  {subscriptionPlan === 'premium' ? 'Premium' : 'Free'}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#38383A]">
                <span className="text-white text-[17px]">Status</span>
                <span className={`text-[17px] ${getStatusColor()}`}>
                  {getStatusText()}
                </span>
              </div>
              {subscriptionEndsAt && isSubscribed && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-white text-[17px]">Next Billing</span>
                  <span className="text-[#8E8E93] text-[17px]">
                    {new Date(subscriptionEndsAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-[13px] text-[#8E8E93] uppercase tracking-wide px-4 mb-2">Subscription Management</h2>
            <div className="bg-[#1C1C1E] rounded-xl overflow-hidden">
              <Link href="/subscribe">
                <div 
                  className="px-4 py-3 border-b border-[#38383A] cursor-pointer hover:bg-[#2C2C2E] transition-colors"
                  data-testid="button-review-plans"
                >
                  <span className="text-[#0A84FF] text-[17px]">Review Subscription Plans</span>
                </div>
              </Link>
              <button
                onClick={() => {
                  toast({
                    title: "App Store Settings",
                    description: "Go to Settings → Your Name → Subscriptions on your device.",
                  });
                }}
                className="w-full px-4 py-3 text-left hover:bg-[#2C2C2E] transition-colors"
                data-testid="button-app-store"
              >
                <span className="text-[#0A84FF] text-[17px]">Manage via App Store Settings</span>
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-[13px] text-[#8E8E93] uppercase tracking-wide px-4 mb-2">Premium Features</h2>
            <div className="bg-[#1C1C1E] rounded-xl overflow-hidden px-4 py-3 space-y-3">
              <div className="flex items-center gap-3">
                <Check className="h-4 w-4 text-[#34C759]" />
                <span className="text-white text-[15px]">AI-Generated Responses</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="h-4 w-4 text-[#34C759]" />
                <span className="text-white text-[15px]">Cultural & Gender Content</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="h-4 w-4 text-[#34C759]" />
                <span className="text-white text-[15px]">Premium Quotes</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="h-4 w-4 text-[#34C759]" />
                <span className="text-white text-[15px]">Unlimited Reminders</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="h-4 w-4 text-[#34C759]" />
                <span className="text-white text-[15px]">Premium Voice Characters</span>
              </div>
            </div>
          </div>

          {isSubscribed && (
            <div className="pt-4">
              <button
                onClick={() => cancelSubscriptionMutation.mutate()}
                disabled={cancelSubscriptionMutation.isPending}
                className="w-full text-center text-[#FF453A] text-[15px] py-2 disabled:opacity-50"
                data-testid="button-cancel-subscription"
              >
                {cancelSubscriptionMutation.isPending ? "Processing..." : "Cancel Subscription"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
