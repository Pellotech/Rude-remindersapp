import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Crown, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getPlatformInfo } from '@/utils/platformDetection';
import { BackNavigation } from "@/components/BackNavigation";

interface PremiumScreenProps {
  isPremium: boolean;
  onViewSubscription?: () => void;
}

async function loadOfferingsSafe() {
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    
    try {
      const offeringsResult: any = await Purchases.getOfferings();
      if (offeringsResult.current) {
        return offeringsResult;
      }
    } catch (e) {
      console.warn("Offerings failed, attempting sync:", e);
    }

    await Purchases.syncPurchases();

    try {
      const offeringsResult: any = await Purchases.getOfferings();
      return offeringsResult;
    } catch (e) {
      console.error("Offerings failed after sync:", e);
      return null;
    }
  } catch (e) {
    console.error("Failed to load offerings:", e);
    return null;
  }
}

export default function PremiumScreen({ isPremium, onViewSubscription }: PremiumScreenProps) {
  const [loading, setLoading] = useState(false);
  const [offeringsError, setOfferingsError] = useState(false);
  const { toast } = useToast();
  const platform = getPlatformInfo();

  const handleSubscribe = async () => {
    setLoading(true);
    setOfferingsError(false);

    try {
      if (platform.isNative) {
        // Load offerings without blocking the paywall
        const offeringsResult = await loadOfferingsSafe();
        
        if (!offeringsResult || !offeringsResult.current) {
          // Show warning but don't block - user can retry
          setOfferingsError(true);
          setLoading(false);
          return;
        }

        const packages = offeringsResult.current.availablePackages;
        const annualPackage = packages.find((p: any) => 
          p.identifier === '$rc_annual' || 
          p.packageType === 'ANNUAL' ||
          p.identifier.includes('annual') ||
          p.identifier.includes('yearly')
        );
        
        const selectedPackage = annualPackage || packages[0];
        
        if (!selectedPackage) {
          setOfferingsError(true);
          setLoading(false);
          return;
        }

        // Safe purchase handler - don't block on errors
        const { Purchases } = await import('@revenuecat/purchases-capacitor');
        
        try {
          const { customerInfo } = await Purchases.purchasePackage({
            aPackage: selectedPackage
          });

          const isPremiumNow = Object.keys(customerInfo.entitlements.active).length > 0;
          
          if (isPremiumNow) {
            toast({
              title: "Success!",
              description: "Subscription activated!",
            });
            
            if (onViewSubscription) {
              setTimeout(() => onViewSubscription(), 1500);
            }
          }
        } catch (purchaseError: any) {
          // Handle user cancellation gracefully
          if (purchaseError.userCancelled) {
            console.log('User cancelled purchase');
            return;
          }
          
          // Handle StoreKit sandbox error (code 509)
          if (purchaseError.code === 509 || purchaseError.code === '509') {
            setOfferingsError(true);
            toast({
              title: "Sandbox Account Required",
              description: "Please sign into a Sandbox App Store account for testing.",
              variant: "destructive",
            });
            return;
          }
          
          // Generic error - let user retry
          console.error('Purchase failed:', purchaseError);
          toast({
            title: "Purchase Failed",
            description: "Please try again.",
            variant: "destructive",
          });
        }
      } else {
        // Web purchase flow
        const { Purchases } = await import('@revenuecat/purchases-js');
        const purchases = Purchases.getSharedInstance();
        
        const offerings = await purchases.getOfferings();
        
        if (!offerings.current) {
          throw new Error('No subscription plans available.');
        }

        const selectedPackage = offerings.current.annual || offerings.current.availablePackages[0];
        
        if (!selectedPackage) {
          throw new Error('No subscription packages available.');
        }

        await purchases.purchase({ rcPackage: selectedPackage });
        
        toast({
          title: "Success!",
          description: "Subscription activated!",
        });
      }
    } catch (error: any) {
      // Top-level error handling for non-purchase errors
      if (error.userCancelled || error.message === 'User cancelled') {
        console.log('User cancelled');
        return;
      }
      
      console.error('Subscription error:', error);
      toast({
        title: "Error",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewPlans = async () => {
    await handleSubscribe();
  };

  if (isPremium) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
        <BackNavigation 
          customBackPath="/settings" 
          customBackLabel="Settings" 
          showMainPageButton={true}
        />
        <div className="flex items-center justify-center p-4 pt-8">
          <Card className="w-full max-w-md shadow-2xl border-2 border-green-200">
            <CardContent className="pt-12 pb-12">
              <div className="text-center space-y-6">
                <div className="relative inline-block">
                  <Crown className="h-20 w-20 mx-auto text-green-600" />
                  <Sparkles className="h-6 w-6 absolute -top-2 -right-2 text-yellow-500" />
                </div>
                
                <div>
                  <h1 className="text-3xl font-bold text-green-700 mb-3">
                    Premium Active!
                  </h1>
                  <p className="text-muted-foreground text-lg">
                    You have access to all premium features
                  </p>
                </div>
                
                {onViewSubscription && (
                  <Button 
                    onClick={onViewSubscription}
                    variant="outline"
                    size="lg"
                    className="w-full"
                    data-testid="button-view-subscription"
                  >
                    View Subscription Details
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <BackNavigation 
        customBackPath="/settings" 
        customBackLabel="Settings" 
        showMainPageButton={true}
      />
      <div className="flex items-center justify-center p-4 pt-8">
        <Card className="w-full max-w-md shadow-2xl border-2 border-purple-200">
          <CardContent className="pt-12 pb-12">
            <div className="text-center space-y-8">
              <div className="relative inline-block">
                <Crown className="h-24 w-24 mx-auto text-purple-600" />
                <Sparkles className="h-8 w-8 absolute -top-2 -right-2 text-yellow-500 animate-pulse" />
              </div>
            
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">
                Unlock Premium
              </h1>
              <p className="text-muted-foreground text-lg">
                Get all advanced reminder features
              </p>
            </div>

            {offeringsError && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  Please sign into a Sandbox App Store account to test purchases.
                </p>
              </div>
            )}
            
            <div className="space-y-3">
              <Button 
                onClick={handleSubscribe}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xl py-7 shadow-lg"
                size="lg"
                data-testid="button-subscribe-now"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Crown className="h-6 w-6 mr-3" />
                    Subscribe Now
                  </>
                )}
              </Button>
              
              <Button 
                onClick={handleViewPlans}
                disabled={loading}
                variant="outline"
                size="lg"
                className="w-full py-6 text-lg"
                data-testid="button-view-plans"
              >
                View All Plans
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              No account required to subscribe
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
