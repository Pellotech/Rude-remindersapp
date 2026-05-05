import { useState, useEffect } from 'react';
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Crown, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getPlatformInfo } from '@/utils/platformDetection';
import { BackNavigation } from "@/components/BackNavigation";
import { revenueCatService } from "@/services/revenueCatService";
import logoImage from "@assets/translusant_logo2_1767108484844.png";
import RoseSpinner from "@/components/RoseSpinner";

interface PremiumScreenProps {
  isPremium: boolean;
  onViewSubscription?: () => void;
  isAuthenticated?: boolean;
}

async function loadOfferingsSafe() {
  try {
    // Ensure RevenueCat is configured before any Purchases calls
    await revenueCatService.initialize();
    
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

export default function PremiumScreen({ isPremium, onViewSubscription, isAuthenticated = false }: PremiumScreenProps) {
  const [loading, setLoading] = useState(false);
  const [offeringsError, setOfferingsError] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
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
    // "View All Plans" button opens the same paywall as Subscribe
    // Both actions lead to the same RevenueCat purchase flow
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
    <div className="min-h-screen bg-black">
      <BackNavigation 
        customBackPath="/" 
        customBackLabel="Back" 
        showMainPageButton={false}
      />
      <div className="flex items-center justify-center p-4 pt-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-[24px] overflow-hidden p-8">
            <div className="text-center space-y-6">
              <div className="w-24 h-24 mx-auto bg-[#F9FAFB] rounded-full flex items-center justify-center">
                <img src={logoImage} alt="Rude Reminders" className="h-16 w-auto" />
              </div>
            
              <div>
                <h1 className="text-3xl font-bold text-[#111827] mb-2">
                  Unlock Premium
                </h1>
              </div>

              {offeringsError && (
                <div className="bg-[#FEF3C7] border border-[#F59E0B] rounded-[14px] p-4">
                  <p className="text-sm text-[#92400E]">
                    Please sign into a Sandbox App Store account to test purchases.
                  </p>
                </div>
              )}
              
              <div className="space-y-3">
                <Button 
                  onClick={handleSubscribe}
                  disabled={loading}
                  className="w-full bg-[#C53B3B] hover:bg-[#A83232] text-white text-lg py-6 rounded-[14px] h-[52px]"
                  size="lg"
                  data-testid="button-subscribe-now"
                >
                  {loading ? (
                    <>
                      <RoseSpinner size={20} className="mr-2" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Subscribe Now
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
