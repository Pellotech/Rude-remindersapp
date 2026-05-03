import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import AppHeader from "@/components/AppHeader";
import { getApiBaseUrl, getFullApiUrl, setAuthToken, queryClient } from "@/lib/queryClient";
import { appleSignInService } from "@/services/appleSignInService";
import { inAppOAuthService } from "@/services/inAppOAuthService";

export default function LoginPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("login");

  // Get redirect URL from query params
  const getRedirectUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('redirect') || '/';
  };

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: ""
  });
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [showVerificationScreen, setShowVerificationScreen] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  useEffect(() => {
    if (user) {
      setLocation(getRedirectUrl());
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
      console.log("LOGIN response.ok:", response.ok);
      console.log("LOGIN data:", JSON.stringify(data));
      if (response.ok) {
        // Store auth token for mobile apps (async for native storage)
        // Support multiple possible token field names
        const token = data.authToken ?? data.token ?? data.accessToken;
        console.log("SAVING authToken to Preferences:", token ? "exists" : "missing");
        if (token) {
          await setAuthToken(token);
        }
        // Force refresh auth query (staleTime: Infinity requires invalidation + refetch)
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
        toast({ title: "Welcome back!", description: "Logged in successfully" });
        setLocation(getRedirectUrl());
      } else if (data.error_code === "email_not_verified") {
        setVerificationEmail(data.email || loginForm.email);
        setShowVerificationScreen(true);
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
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        if (data.verification_required) {
          // Show verification pending screen
          setVerificationEmail(registerForm.email);
          setShowVerificationScreen(true);
        } else {
          // Tester or instant-login path
          const token = data.authToken ?? data.token ?? data.accessToken;
          if (token) await setAuthToken(token);
          await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
          toast({ title: "Success!", description: "Account created successfully!" });
          setLocation(getRedirectUrl());
        }
      } else {
        toast({ title: "Registration Failed", description: data.message || "Failed to create account", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAuth = async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
  };

  const handleAppleSignIn = async () => {
    if (!appleSignInService.isAvailable()) {
      toast({ title: "Not available", description: "Apple Sign-In is only available on iOS.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await appleSignInService.signInAndAuthenticate();
      await refreshAuth();
      toast({ title: "Welcome!", description: "Signed in with Apple" });
      setLocation(getRedirectUrl());
    } catch (error: any) {
      if (error?.message !== "Sign in cancelled") {
        toast({ title: "Apple Sign-In Failed", description: error?.message || "Please try again.", variant: "destructive" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const result = await inAppOAuthService.signInWithGoogle(getApiBaseUrl());
        if (result.success) {
          await refreshAuth();
          toast({ title: "Welcome!", description: "Signed in with Google" });
          setLocation(getRedirectUrl());
        } else if (result.error && result.error !== "cancelled") {
          toast({ title: "Google Sign-In Failed", description: result.error, variant: "destructive" });
        }
      } else {
        window.location.href = getFullApiUrl("/api/auth/google");
      }
    } catch (error: any) {
      toast({ title: "Google Sign-In Failed", description: error?.message || "Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setIsLoading(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const result = await inAppOAuthService.signInWithFacebook(getApiBaseUrl());
        if (result.success) {
          await refreshAuth();
          toast({ title: "Welcome!", description: "Signed in with Facebook" });
          setLocation(getRedirectUrl());
        } else if (result.error && result.error !== "cancelled") {
          toast({ title: "Facebook Sign-In Failed", description: result.error, variant: "destructive" });
        }
      } else {
        window.location.href = getFullApiUrl("/api/auth/facebook");
      }
    } catch (error: any) {
      toast({ title: "Facebook Sign-In Failed", description: error?.message || "Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!verificationEmail) return;
    setResendLoading(true);
    try {
      await fetch(getFullApiUrl("/api/auth/resend-verification"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verificationEmail }),
      });
      toast({ title: "Email Sent", description: "Verification email resent. Check your inbox." });
    } catch {
      toast({ title: "Error", description: "Failed to resend. Please try again.", variant: "destructive" });
    } finally {
      setResendLoading(false);
    }
  };

  if (user) return null;

  // Verification pending screen
  if (showVerificationScreen) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#C9A063] p-4 pt-safe">
        <div className="w-full max-w-md space-y-6">
          <AppHeader className="mb-4" />
          <Card className="bg-white border border-[#EAEAEA] rounded-[24px] shadow-[var(--rr-card-shadow)]">
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="w-16 h-16 bg-[#FDF3E3] rounded-full flex items-center justify-center mx-auto">
                <Mail className="h-8 w-8 text-[#C9A063]" />
              </div>
              <h2 className="text-xl font-bold text-[#111827]">Check your email</h2>
              <p className="text-[#6B7280] text-sm">
                Please check your email and click the verification link to continue.
              </p>
              {verificationEmail && (
                <p className="text-[#111827] text-sm font-medium">{verificationEmail}</p>
              )}
              <Button
                onClick={handleResendVerification}
                disabled={resendLoading}
                className="w-full bg-[#1B2A5E] hover:bg-[#152347] text-white rounded-[14px] h-[48px]"
              >
                {resendLoading ? "Sending..." : "Resend Email"}
              </Button>
              <button
                onClick={() => { setShowVerificationScreen(false); setActiveTab("login"); }}
                className="text-sm text-[#6B7280] hover:text-[#111827]"
              >
                Back to Login
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#C9A063] p-4 pt-safe">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <AppHeader className="mb-4" />

        {/* Rudy speech bubble banner */}
        <div style={{
          background: '#C9853A',
          borderRadius: 16,
          padding: '14px 16px 14px 8px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 6,
          marginBottom: 20,
        }}>
          <img
            src="/rudy/Rudy_confident_arms_crossed_transparent.png"
            alt="Rudy"
            style={{
              width: 88,
              height: 88,
              objectFit: 'contain',
              flexShrink: 0,
            }}
          />
          <div style={{
            background: 'white',
            borderRadius: '0 14px 14px 14px',
            padding: '10px 14px',
            position: 'relative',
            flex: 1,
          }}>
            <div style={{
              position: 'absolute',
              left: -8,
              top: 10,
              width: 0,
              height: 0,
              borderTop: '8px solid transparent',
              borderBottom: '8px solid transparent',
              borderRight: '8px solid white',
            }} />
            <p style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 500,
              color: '#111827',
              lineHeight: 1.4,
            }}>
              Oi! You get <span style={{ color: '#b70d0d', fontWeight: 700 }}>15 free reminders/month</span>, zero card needed. Or go Premium = mind blowing reminders. Pick your poison.
            </p>
          </div>
        </div>

        {/* Login/Register Form */}
        <Card className="bg-white border border-[#EAEAEA] rounded-[24px] shadow-[var(--rr-card-shadow)]">
          <CardContent className="pt-6">
            <h2 className="text-base font-semibold text-[#111827] text-center">
              Your free account awaits
            </h2>
            <p className="text-xs text-[#6B7280] text-center mt-1 mb-4">
              15 reminders/month free · No credit card needed
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
                  <div className="text-right -mt-1">
                    <button
                      type="button"
                      onClick={() => setLocation("/forgot-password")}
                      className="text-xs text-[#C9A063] hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <Button type="submit" className="w-full bg-white hover:bg-gray-50 text-[#111827] rounded-[14px] py-5 border-2 border-[#EAEAEA] h-[48px] font-semibold" disabled={isLoading}>
                    {isLoading ? "Logging in..." : "Login"}
                  </Button>
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

        {/* Social Sign-In — separate card */}
        <Card className="bg-white border border-[#EAEAEA] rounded-[24px] shadow-[var(--rr-card-shadow)]">
          <CardContent className="pt-6 pb-6">
            <p className="text-xs font-medium text-[#C9A063] uppercase tracking-wide text-center mb-4">
              Or continue with
            </p>
            <div className="flex flex-col gap-2.5">
              {Capacitor.getPlatform() === "ios" && (
                <button
                  type="button"
                  onClick={handleAppleSignIn}
                  disabled={isLoading}
                  data-testid="button-apple-signin"
                  className="w-full h-12 rounded-[12px] bg-black text-white font-semibold text-[15px] flex items-center justify-center gap-2.5 disabled:opacity-60"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  Continue with Apple
                </button>
              )}

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                data-testid="button-google-signin"
                className="w-full h-12 rounded-[12px] bg-white text-[#111827] font-semibold text-[15px] border-[1.5px] border-[#E5E7EB] flex items-center justify-center gap-2.5 disabled:opacity-60"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>

              {/* Facebook Sign-In hidden for launch — handler retained for easy re-enable
              <button
                type="button"
                onClick={handleFacebookSignIn}
                disabled={isLoading}
                data-testid="button-facebook-signin"
                className="w-full h-12 rounded-[12px] bg-[#1877F2] text-white font-semibold text-[15px] flex items-center justify-center gap-2.5 disabled:opacity-60"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Continue with Facebook
              </button>
              */}
            </div>
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
