
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { EmailAuthForm } from "@/components/EmailAuthForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { LogIn, Zap } from "lucide-react";

export default function LoginPage() {
  const { user, refetch } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

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
        </div>

        {/* Email/Password Authentication */}
        <EmailAuthForm onSuccess={handleEmailAuthSuccess} />

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

        <div className="text-center text-xs text-muted-foreground">
          <p>
            Perfect for iOS and Android app stores - no social accounts required!
          </p>
        </div>
      </div>
    </div>
  );
}
