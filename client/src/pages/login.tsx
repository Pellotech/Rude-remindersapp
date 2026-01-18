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
  const [setPasswordForm, setSetPasswordForm] = useState({ email: "", password: "", confirmPassword: "" });
  const [showSetPassword, setShowSetPassword] = useState(false);

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

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    if (setPasswordForm.password !== setPasswordForm.confirmPassword) {
      toast({ title: "Error", description: "Passwords don't match", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    
    if (setPasswordForm.password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await fetch(getFullApiUrl("/api/auth/set-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: setPasswordForm.email,
          password: setPasswordForm.password
        })
      });
      const data = await response.json();
      
      if (response.ok) {
        toast({ title: "Success!", description: "Password set. Logging you in..." });
        setTimeout(() => refetch(), 100);
      } else {
        toast({ title: "Failed", description: data.message || "Failed to set password", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
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
                  
                  <button
                    type="button"
                    onClick={() => setShowSetPassword(true)}
                    className="w-full text-center text-sm text-[#6B7280] hover:text-[#C53B3B] mt-2"
                  >
                    Have an account but no password? Set one here
                  </button>
                </form>
              </TabsContent>
              
              {showSetPassword && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <Card className="w-full max-w-md bg-white rounded-[24px]">
                    <CardContent className="pt-6">
                      <h3 className="text-lg font-semibold text-[#111827] mb-4">Set Password</h3>
                      <p className="text-sm text-[#6B7280] mb-4">
                        If your account was created without a password, you can set one here.
                      </p>
                      <form onSubmit={handleSetPassword} className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-[#111827]">Email</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-[#C53B3B]" />
                            <Input
                              type="email"
                              placeholder="your@email.com"
                              value={setPasswordForm.email}
                              onChange={(e) => setSetPasswordForm(prev => ({ ...prev, email: e.target.value }))}
                              className="pl-10 bg-white border-2 border-[#EAEAEA] rounded-[14px] text-[#111827]"
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[#111827]">New Password</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-[#C53B3B]" />
                            <Input
                              type="password"
                              placeholder="Enter new password"
                              value={setPasswordForm.password}
                              onChange={(e) => setSetPasswordForm(prev => ({ ...prev, password: e.target.value }))}
                              className="pl-10 bg-white border-2 border-[#EAEAEA] rounded-[14px] text-[#111827]"
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[#111827]">Confirm Password</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-[#C53B3B]" />
                            <Input
                              type="password"
                              placeholder="Confirm password"
                              value={setPasswordForm.confirmPassword}
                              onChange={(e) => setSetPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                              className="pl-10 bg-white border-2 border-[#EAEAEA] rounded-[14px] text-[#111827]"
                              required
                            />
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowSetPassword(false)}
                            className="flex-1 rounded-[14px]"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            className="flex-1 bg-[#C53B3B] hover:bg-[#A32F2F] text-white rounded-[14px]"
                            disabled={isLoading}
                          >
                            {isLoading ? "Setting..." : "Set Password"}
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              )}

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
