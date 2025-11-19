
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

export default function LoginPage() {
  const { user, refetch } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const isNativeMobile = Capacitor.isNativePlatform();

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

  if (user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
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

        {/* Email/Password Authentication */}
        <EmailAuthForm onSuccess={handleEmailAuthSuccess} />

        {/* Only show Replit Auth on web (not on mobile apps to comply with App Store guidelines) */}
        {!isNativeMobile && (
          <>
            {/* Separator */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Replit Auth Option */}
            <Card>
              <CardHeader>
                <CardTitle className="text-center text-lg">Replit Users</CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleReplitAuth}
                  disabled={isLoading}
                  className="w-full"
                  variant="outline"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  {isLoading ? "Redirecting..." : "Login with Replit"}
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Quick access for Replit users
                </p>
              </CardContent>
            </Card>
          </>
        )}

        <div className="text-center text-xs text-muted-foreground">
          <p>
            {isNativeMobile 
              ? "This app does not require an account to function. Optional account creation is only for syncing across devices." 
              : "No account required. Account creation is optional and only for syncing across devices."}
          </p>
        </div>
      </div>
    </div>
  );
}
