
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  const isSubscribed = user?.subscriptionStatus === "active";
  const subscriptionPlan = user?.subscriptionPlan || "free";
  const subscriptionEndsAt = user?.subscriptionEndsAt;

  const getStatusColor = () => {
    if (isSubscribed) return "text-[#22C55E]";
    if (user?.subscriptionStatus === "canceled") return "text-[#F59E0B]";
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
        <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-[#38383A] safe-area-header">
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
          {/* Current Plan Section */}
          <div>
            <h2 className="text-[13px] text-[#8E8E93] uppercase tracking-wide px-4 mb-2">Current Plan</h2>
            <div className="bg-[#1C1C1E] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#38383A]">
                <span className="text-white text-[17px]">Plan</span>
                <div className="flex items-center gap-2">
                  {subscriptionPlan === 'premium' && <Crown className="h-4 w-4 text-[#FFD700]" />}
                  <span className="text-[#8E8E93] text-[17px]">
                    {subscriptionPlan === 'premium' ? 'Premium' : 'Free'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#38383A]">
                <span className="text-white text-[17px]">Status</span>
                <span className={`text-[17px] font-semibold ${getStatusColor()}`}>
                  {getStatusText()}
                </span>
              </div>
              {subscriptionEndsAt && isSubscribed && (
                <div className="flex items-center justify-between px-4 py-3.5">
                  <span className="text-white text-[17px]">Next Billing</span>
                  <span className="text-[#8E8E93] text-[17px]">
                    {new Date(subscriptionEndsAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Subscription Management */}
          <div>
            <h2 className="text-[13px] text-[#8E8E93] uppercase tracking-wide px-4 mb-2">Manage</h2>
            <div className="bg-[#1C1C1E] rounded-xl overflow-hidden">
              <Link href="/subscribe">
                <div 
                  className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-[#2C2C2E] transition-colors"
                  data-testid="button-review-plans"
                >
                  <span className="text-white text-[17px]">
                    {isSubscribed ? 'Manage Subscription' : 'Upgrade to Premium'}
                  </span>
                  <ChevronRight className="h-5 w-5 text-[#48484A]" />
                </div>
              </Link>
            </div>
          </div>

          {/* Cancel Subscription - Only for subscribed users */}
          {isSubscribed && (
            <div className="pt-4">
              <button
                onClick={() => setShowCancelDialog(true)}
                className="w-full bg-[#1C1C1E] text-white text-[17px] py-3.5 px-4 rounded-xl hover:bg-[#2C2C2E] transition-colors"
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
        <AlertDialogContent className="bg-[#1C1C1E] border-[#38383A] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription className="text-[#8E8E93]">
              To cancel, go to your iOS device Settings → Your Name → Subscriptions → Rude Reminders.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#2C2C2E] border-0 text-white hover:bg-[#3C3C3E] rounded-xl">
              Close
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              className="bg-[#0A84FF] hover:bg-[#0A7AEF] text-white border-0 rounded-xl"
            >
              Got It
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
