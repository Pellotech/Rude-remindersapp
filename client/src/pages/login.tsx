
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { EmailAuthForm } from "@/components/EmailAuthForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { LogIn, Zap } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { appleSignInService } from "@/services/appleSignInService";
import { inAppOAuthService } from "@/services/inAppOAuthService";
import { SiApple, SiGoogle, SiFacebook } from "react-icons/si";

export default function LoginPage() {
  const { user, refetch } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isAppleSignInLoading, setIsAppleSignInLoading] = useState(false);
  const [isGoogleSignInLoading, setIsGoogleSignInLoading] = useState(false);
  const [isFacebookSignInLoading, setIsFacebookSignInLoading] = useState(false);
  const isNativeMobile = Capacitor.isNativePlatform();
  const isAppleSignInAvailable = appleSignInService.isAvailable();
  const isIOS = Capacitor.getPlatform() === 'ios';

  useEffect(() => {
    // Only redirect authenticated users, not guests
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const handleReplitAuth = () => {
    setIsLoading(true);
    window.location.href = "/api/login";
  };

  const handleEmailAuthSuccess = () => {
    toast({
      title: "Welcome!",
      description: "You're now logged in."
    });
    refetch();
  };

  const handleContinueAsGuest = () => {
    toast({
      title: "Welcome, Guest!",
      description: "Your reminders will be stored locally on this device."
    });
    setLocation("/");
  };

  const handleAppleSignIn = async () => {
    setIsAppleSignInLoading(true);
    try {
      await appleSignInService.signInAndAuthenticate();
      toast({
        title: "Welcome!",
        description: "Signed in successfully with Apple."
      });
      refetch();
    } catch (error: any) {
      // Don't show error for user cancellation
      if (!error.message?.includes('cancel')) {
        toast({
          title: "Sign in failed",
          description: error.message || "Could not sign in with Apple. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setIsAppleSignInLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleSignInLoading(true);
    try {
      // On native iOS, use in-app browser (SFSafariViewController) to comply with App Store guidelines
      // This prevents Safari redirect which causes rejection
      if (inAppOAuthService.isNativeIOS()) {
        const baseUrl = window.location.origin;
        const result = await inAppOAuthService.signInWithGoogle(baseUrl);
        
        if (result.success) {
          toast({
            title: "Welcome!",
            description: "Signed in successfully with Google."
          });
          refetch();
        } else if (result.error && result.error !== 'cancelled') {
          toast({
            title: "Sign in failed",
            description: result.error === 'not_configured' 
              ? "Google Sign-In is not yet configured." 
              : "Could not sign in with Google. Please try again.",
            variant: "destructive"
          });
        }
      } else {
        // On web, use standard redirect flow
        window.location.href = "/api/auth/google";
      }
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: "Could not sign in with Google. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGoogleSignInLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setIsFacebookSignInLoading(true);
    try {
      // On native iOS, use in-app browser (SFSafariViewController) to comply with App Store guidelines
      if (inAppOAuthService.isNativeIOS()) {
        const baseUrl = window.location.origin;
        const result = await inAppOAuthService.signInWithFacebook(baseUrl);
        
        if (result.success) {
          toast({
            title: "Welcome!",
            description: "Signed in successfully with Facebook."
          });
          refetch();
        } else if (result.error && result.error !== 'cancelled') {
          toast({
            title: "Sign in failed",
            description: result.error === 'not_configured' 
              ? "Facebook Sign-In is not yet configured." 
              : "Could not sign in with Facebook. Please try again.",
            variant: "destructive"
          });
        }
      } else {
        // On web, use standard redirect flow
        window.location.href = "/api/auth/facebook";
      }
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: "Could not sign in with Facebook. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsFacebookSignInLoading(false);
    }
  };

  if (user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 pt-safe">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Rude Reminders</h1>
          <p className="text-gray-600">
            Get brutally honest reminders that actually work
          </p>
          <p className="text-sm text-blue-600 font-medium mt-2">
            No account required to use this app
          </p>
        </div>

        {/* Continue as Guest - Primary CTA */}
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-300">
          <CardContent className="pt-6">
            <Button 
              onClick={handleContinueAsGuest}
              className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-6"
              size="lg"
              data-testid="button-continue-guest"
            >
              <Zap className="mr-2 h-5 w-5" />
              Start Using App
            </Button>
            <p className="text-xs text-green-700 text-center mt-3 font-medium">
              All core features work without an account
            </p>
          </CardContent>
        </Card>

        {/* Separator */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Optional: Create account to sync across devices
            </span>
          </div>
        </div>

        {/* Email/Password Authentication - FIRST */}
        <EmailAuthForm onSuccess={handleEmailAuthSuccess} />

        <div className="text-center text-xs text-muted-foreground space-y-2">
          <p>
            {isNativeMobile 
              ? "This app does not require an account to function. Optional account creation is only for syncing across devices." 
              : "No account required. Account creation is optional and only for syncing across devices."}
          </p>
          <p className="flex items-center justify-center gap-2 flex-wrap">
            <span>By continuing, you agree to our</span>
            <button
              type="button"
              onClick={async () => {
                const url = "https://app.termly.io/policy-viewer/policy.html?policyUUID=34f340a5-79a7-4f66-b4f9-81f1e9693176";
                if (Capacitor.isNativePlatform()) {
                  await Browser.open({ url, presentationStyle: "popover" });
                } else {
                  window.open(url, "_blank");
                }
              }}
              className="text-blue-600 hover:underline"
              data-testid="link-terms-login"
            >
              Terms of Service
            </button>
            <span>and</span>
            <button
              type="button"
              onClick={async () => {
                const url = "https://app.termly.io/policy-viewer/policy.html?policyUUID=378d9c6b-c46e-44ed-83a2-d8770229969c";
                if (Capacitor.isNativePlatform()) {
                  await Browser.open({ url, presentationStyle: "popover" });
                } else {
                  window.open(url, "_blank");
                }
              }}
              className="text-blue-600 hover:underline"
              data-testid="link-privacy-login"
            >
              Privacy Policy
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
