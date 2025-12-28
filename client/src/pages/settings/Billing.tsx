import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Home, ChevronRight, Crown } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Billing() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  
  const { data: user, isLoading } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  const handleCancelSubscription = () => {
    setShowCancelDialog(false);
    toast({
      title: "How to Cancel",
      description: "Go to Settings → Your Name → Subscriptions on your iOS device.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#C9A063] flex items-center justify-center">
        <div className="text-[#111827]">Loading...</div>
      </div>
    );
  }

  const isSubscribed = user?.subscriptionStatus === "active";
  const subscriptionPlan = user?.subscriptionPlan || "free";
  const subscriptionEndsAt = user?.subscriptionEndsAt;

  const getStatusColor = () => {
    if (isSubscribed) return "text-[#22C55E]";
    if (user?.subscriptionStatus === "canceled") return "text-[#F59E0B]";
    return "text-[#374151]";
  };

  const getStatusText = () => {
    if (isSubscribed) return "Active";
    if (user?.subscriptionStatus === "canceled") return "Canceled";
    if (user?.subscriptionStatus === "expired") return "Expired";
    return "Free";
  };

  return (
    <div className="min-h-screen bg-[#C9A063]">
      <div className="max-w-lg mx-auto">
        <div className="sticky top-0 z-10 bg-[#C9A063]/95 backdrop-blur-sm safe-area-header">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/settings">
              <div className="flex items-center text-[#111827] cursor-pointer" data-testid="button-back">
                <ChevronLeft className="h-5 w-5" />
                <span className="text-[17px] font-medium">Settings</span>
              </div>
            </Link>
            <Link href="/">
              <div className="text-[#111827] cursor-pointer" data-testid="button-home">
                <Home className="h-5 w-5" />
              </div>
            </Link>
          </div>
          <h1 className="text-[28px] font-bold text-[#111827] px-4 pb-3">Payment & Billing</h1>
        </div>

        <div className="py-6 px-4 space-y-6">
          {/* Current Plan Section */}
          <div>
            <h2 className="text-[13px] text-[#374151] uppercase tracking-wide px-4 mb-2 font-medium">Current Plan</h2>
            <div className="bg-white rounded-[16px] overflow-hidden shadow-md border border-[rgba(0,0,0,0.08)]">
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-[rgba(0,0,0,0.06)]">
                <span className="text-[#111827] text-[17px] font-medium">Plan</span>
                <div className="flex items-center gap-2">
                  {subscriptionPlan === 'premium' && <Crown className="h-4 w-4 text-[#6B4E2E]" />}
                  <span className="text-[#374151] text-[17px]">
                    {subscriptionPlan === 'premium' ? 'Premium' : 'Free'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-[rgba(0,0,0,0.06)]">
                <span className="text-[#111827] text-[17px] font-medium">Status</span>
                <span className={`text-[17px] font-semibold ${getStatusColor()}`}>
                  {getStatusText()}
                </span>
              </div>
              {subscriptionEndsAt && isSubscribed && (
                <div className="flex items-center justify-between px-4 py-3.5">
                  <span className="text-[#111827] text-[17px] font-medium">Next Billing</span>
                  <span className="text-[#374151] text-[17px]">
                    {new Date(subscriptionEndsAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Subscription Management */}
          <div>
            <h2 className="text-[13px] text-[#374151] uppercase tracking-wide px-4 mb-2 font-medium">Manage</h2>
            <div className="bg-white rounded-[16px] overflow-hidden shadow-md border border-[rgba(0,0,0,0.08)]">
              <Link href="/subscribe">
                <div 
                  className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors"
                  data-testid="button-review-plans"
                >
                  <span className="text-[#111827] text-[17px] font-medium">
                    {isSubscribed ? 'Manage Subscription' : 'Upgrade to Premium'}
                  </span>
                  <ChevronRight className="h-5 w-5 text-[#6B4E2E]" />
                </div>
              </Link>
            </div>
          </div>

          {/* Cancel Subscription - Only for subscribed users */}
          {isSubscribed && (
            <div className="pt-4">
              <button
                onClick={() => setShowCancelDialog(true)}
                className="w-full bg-white text-[#111827] text-[15px] py-3 px-4 font-medium rounded-[14px] border border-[rgba(0,0,0,0.08)] shadow-sm hover:bg-gray-50 active:bg-gray-100"
                data-testid="button-cancel-subscription"
              >
                Cancel Subscription
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="bg-white border-[rgba(0,0,0,0.08)] rounded-[18px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#111827]">Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription className="text-[#374151]">
              To cancel, go to your iOS device Settings → Your Name → Subscriptions → Rude Reminders.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#F3F4F6] border-0 text-[#111827] hover:bg-[#E5E7EB] rounded-[12px]">
              Close
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              className="bg-white hover:bg-gray-50 text-[#111827] border border-[rgba(0,0,0,0.08)] rounded-[12px]"
            >
              Got It
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
