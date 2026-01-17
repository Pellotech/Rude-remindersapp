import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, User, Eye, EyeOff, Sparkles } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import AppHeader from "@/components/AppHeader";
import { getFullApiUrl } from "@/lib/queryClient";
import { SiApple, SiGoogle, SiFacebook } from "react-icons/si";
import { inAppOAuthService } from "@/services/inAppOAuthService";
import { appleSignInService } from "@/services/appleSignInService";

export default function LoginPage() {
  const { user, refetch } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("login");

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: ""
  });

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch(getFullApiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(loginForm)
      });
      const data = await response.json();
      if (response.ok) {
        toast({ title: "Welcome back!", description: "Logged in successfully" });
        refetch();
      } else {
        toast({ title: "Login Failed", description: data.message || "Invalid credentials", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    if (registerForm.password !== registerForm.confirmPassword) {
      toast({ title: "Error", description: "Passwords don't match", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    if (registerForm.password.length < 8) {
      toast({ title: "Error", description: "Password must be at least 8 characters", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    try {
      const response = await fetch(getFullApiUrl("/api/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: registerForm.email,
          password: registerForm.password,
          firstName: registerForm.firstName,
          lastName: registerForm.lastName
        })
      });
      const data = await response.json();
      if (response.ok) {
        toast({ title: "Success!", description: "Account created. Logging you in..." });
        await fetch(getFullApiUrl("/api/auth/login"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email: registerForm.email, password: registerForm.password })
        });
        setTimeout(() => refetch(), 100);
      } else {
        toast({ title: "Registration Failed", description: data.message || "Failed to create account", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueAsGuest = () => {
    toast({ title: "Welcome!", description: "Your reminders will be stored locally." });
    setLocation("/");
  };

  const isNativeIOS = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    try {
      const result = await appleSignInService.signIn();
      // If we get here, sign in was successful - now verify with backend
      const response = await fetch(getFullApiUrl("/api/auth/apple/native"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          identityToken: result.identityToken,
          email: result.email,
          givenName: result.givenName,
          familyName: result.familyName,
          user: result.user
        })
      });
      
      if (response.ok) {
        toast({ title: "Welcome!", description: "Signed in with Apple successfully" });
        refetch();
      } else {
        const data = await response.json();
        toast({ title: "Sign In Failed", description: data.message || "Apple Sign In failed", variant: "destructive" });
      }
    } catch (error: any) {
      if (!error.message?.includes('cancelled')) {
        toast({ title: "Error", description: error.message || "Apple Sign In failed", variant: "destructive" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const baseUrl = getFullApiUrl("");
      const result = await inAppOAuthService.signInWithGoogle(baseUrl);
      if (result.success) {
        toast({ title: "Welcome!", description: "Signed in with Google successfully" });
        refetch();
      } else if (result.error) {
        toast({ title: "Sign In Failed", description: result.error, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Google Sign In failed", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setIsLoading(true);
    try {
      const baseUrl = getFullApiUrl("");
      const result = await inAppOAuthService.signInWithFacebook(baseUrl);
      if (result.success) {
        toast({ title: "Welcome!", description: "Signed in with Facebook successfully" });
        refetch();
      } else if (result.error) {
        toast({ title: "Sign In Failed", description: result.error, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Facebook Sign In failed", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (user) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#C9A063] p-4 pt-safe">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <AppHeader className="mb-4" />

        {/* Primary CTA - Start Using App */}
        <Card className="bg-white border border-[#EAEAEA] rounded-[24px] shadow-[var(--rr-card-shadow)]">
          <CardContent className="pt-6 pb-6">
            <Button 
              onClick={handleContinueAsGuest}
              className="w-full bg-white hover:bg-gray-50 text-[#111827] text-lg py-6 rounded-[14px] h-[52px] border-2 border-[#EAEAEA] font-semibold"
              size="lg"
              data-testid="button-continue-guest"
            >
              <Sparkles className="mr-2 h-5 w-5 text-[#111827]" />
              Start Using App
            </Button>
            <p className="text-sm text-[#6B7280] text-center mt-3">
              Free Access
            </p>
          </CardContent>
        </Card>

        {/* Login/Register Form */}
        <Card className="bg-white border border-[#EAEAEA] rounded-[24px] shadow-[var(--rr-card-shadow)]">
          <CardContent className="pt-6">
            <p className="text-sm text-[#6B7280] text-center mb-4">
              Premium Access
            </p>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 bg-[#F9FAFB] rounded-[14px] p-1 border border-[#EAEAEA]">
                <TabsTrigger value="login" className="rounded-[12px] text-[#6B7280] data-[state=active]:bg-white data-[state=active]:text-[#111827] data-[state=active]:shadow-sm">Login</TabsTrigger>
                <TabsTrigger value="register" className="rounded-[12px] text-[#6B7280] data-[state=active]:bg-white data-[state=active]:text-[#111827] data-[state=active]:shadow-sm">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label className="text-[#111827]">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-[#C53B3B]" />
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                        className="pl-10 bg-white border-2 border-[#EAEAEA] focus:border-[#C53B3B] rounded-[14px] text-[#111827] py-3"
                        data-testid="input-login-email"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#111827]">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-[#C53B3B]" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter password"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                        className="pl-10 pr-10 bg-white border-2 border-[#EAEAEA] focus:border-[#C53B3B] rounded-[14px] text-[#111827] py-3"
                        data-testid="input-login-password"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4 text-[#C53B3B]" /> : <Eye className="h-4 w-4 text-[#C53B3B]" />}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-white hover:bg-gray-50 text-[#111827] rounded-[14px] py-5 border-2 border-[#EAEAEA] h-[48px] font-semibold" disabled={isLoading}>
                    {isLoading ? "Logging in..." : "Login"}
                  </Button>

                  {/* Social Login Buttons */}
                  <div className="mt-6 space-y-3">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-[#EAEAEA]" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-[#6B7280]">Or continue with</span>
                      </div>
                    </div>

                    {isNativeIOS && (
                      <Button
                        type="button"
                        onClick={handleAppleSignIn}
                        className="w-full bg-black hover:bg-gray-900 text-white rounded-[14px] py-5 h-[48px] font-semibold"
                        disabled={isLoading}
                      >
                        <SiApple className="mr-2 h-5 w-5" />
                        Sign in with Apple
                      </Button>
                    )}

                    <Button
                      type="button"
                      onClick={handleGoogleSignIn}
                      className="w-full bg-white hover:bg-gray-50 text-[#111827] rounded-[14px] py-5 border-2 border-[#EAEAEA] h-[48px] font-semibold"
                      disabled={isLoading}
                    >
                      <SiGoogle className="mr-2 h-5 w-5 text-[#4285F4]" />
                      Sign in with Google
                    </Button>

                    <Button
                      type="button"
                      onClick={handleFacebookSignIn}
                      className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-[14px] py-5 h-[48px] font-semibold"
                      disabled={isLoading}
                    >
                      <SiFacebook className="mr-2 h-5 w-5" />
                      Sign in with Facebook
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-[#111827]">First Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-[#C53B3B]" />
                        <Input
                          placeholder="First"
                          value={registerForm.firstName}
                          onChange={(e) => setRegisterForm(prev => ({ ...prev, firstName: e.target.value }))}
                          className="pl-10 bg-white border-[rgba(0,0,0,0.08)] rounded-[12px] text-[#111827]"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#111827]">Last Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-[#C53B3B]" />
                        <Input
                          placeholder="Last"
                          value={registerForm.lastName}
                          onChange={(e) => setRegisterForm(prev => ({ ...prev, lastName: e.target.value }))}
                          className="pl-10 bg-white border-[rgba(0,0,0,0.08)] rounded-[12px] text-[#111827]"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#111827]">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-[#C53B3B]" />
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                        className="pl-10 bg-white border-[rgba(0,0,0,0.08)] rounded-[12px] text-[#111827]"
                        data-testid="input-register-email"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#111827]">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-[#C53B3B]" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Min 8 characters"
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                        className="pl-10 pr-10 bg-white border-[rgba(0,0,0,0.08)] rounded-[12px] text-[#111827]"
                        data-testid="input-register-password"
                        required
                        minLength={8}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4 text-[#C53B3B]" /> : <Eye className="h-4 w-4 text-[#C53B3B]" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#111827]">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-[#C53B3B]" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Confirm password"
                        value={registerForm.confirmPassword}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="pl-10 bg-white border-[rgba(0,0,0,0.08)] rounded-[12px] text-[#111827]"
                        data-testid="input-register-confirm-password"
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-white hover:bg-gray-50 text-[#111827] rounded-[14px] py-5 border-2 border-[#EAEAEA] h-[48px] font-semibold" disabled={isLoading}>
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-[#6B7280] space-y-2">
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
              className="text-[#C53B3B] font-semibold hover:underline"
              data-testid="link-terms-login"
            >
              Terms
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
              className="text-[#C53B3B] font-semibold hover:underline"
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
