import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Zap, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

export default function LoginPage() {
  const { user, refetch } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const isNativeMobile = Capacitor.isNativePlatform();

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
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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

  if (user) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#DA7F7F] p-4 pt-safe">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 mx-auto bg-[#D4AF37] rounded-[20px] flex items-center justify-center shadow-lg mb-4">
            <span className="text-4xl">😤</span>
          </div>
          <h1 className="text-3xl font-bold text-[#2D2926]">Rude Reminders</h1>
          <p className="text-[#4A3F3F] text-lg">The reminder that talks back</p>
        </div>

        {/* Primary CTA - Start Using App */}
        <Card className="bg-[#D4AF37] border-0 rounded-[20px] shadow-lg">
          <CardContent className="pt-6 pb-6">
            <Button 
              onClick={handleContinueAsGuest}
              className="w-full bg-[#2D2926] hover:bg-[#1A1A1A] text-white text-lg py-6 rounded-xl"
              size="lg"
              data-testid="button-continue-guest"
            >
              <Zap className="mr-2 h-5 w-5" />
              Start Using App
            </Button>
            <p className="text-sm text-[#2D2926] text-center mt-3 font-medium">
              No account required to use this app
            </p>
          </CardContent>
        </Card>

        {/* Login/Register Form */}
        <Card className="bg-[#FFF8F0] border-0 rounded-[20px] shadow-lg">
          <CardContent className="pt-6">
            <p className="text-sm text-[#5C4F4A] text-center mb-4">
              Optional — create an account to sync across devices
            </p>
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 bg-[#E8D5C4] rounded-xl">
                <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#2D2926]">Login</TabsTrigger>
                <TabsTrigger value="register" className="rounded-lg data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#2D2926]">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label className="text-[#2D2926]">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-[#8B7355]" />
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                        className="pl-10 bg-white border-[#E8D5C4] rounded-xl text-[#2D2926]"
                        data-testid="input-login-email"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#2D2926]">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-[#8B7355]" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter password"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                        className="pl-10 pr-10 bg-white border-[#E8D5C4] rounded-xl text-[#2D2926]"
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
                        {showPassword ? <EyeOff className="h-4 w-4 text-[#8B7355]" /> : <Eye className="h-4 w-4 text-[#8B7355]" />}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-[#D4AF37] hover:bg-[#C19A2E] text-[#2D2926] rounded-xl py-5" disabled={isLoading}>
                    {isLoading ? "Logging in..." : "Login"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-[#2D2926]">First Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-[#8B7355]" />
                        <Input
                          placeholder="First"
                          value={registerForm.firstName}
                          onChange={(e) => setRegisterForm(prev => ({ ...prev, firstName: e.target.value }))}
                          className="pl-10 bg-white border-[#E8D5C4] rounded-xl text-[#2D2926]"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#2D2926]">Last Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-[#8B7355]" />
                        <Input
                          placeholder="Last"
                          value={registerForm.lastName}
                          onChange={(e) => setRegisterForm(prev => ({ ...prev, lastName: e.target.value }))}
                          className="pl-10 bg-white border-[#E8D5C4] rounded-xl text-[#2D2926]"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#2D2926]">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-[#8B7355]" />
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                        className="pl-10 bg-white border-[#E8D5C4] rounded-xl text-[#2D2926]"
                        data-testid="input-register-email"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#2D2926]">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-[#8B7355]" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Min 8 characters"
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                        className="pl-10 pr-10 bg-white border-[#E8D5C4] rounded-xl text-[#2D2926]"
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
                        {showPassword ? <EyeOff className="h-4 w-4 text-[#8B7355]" /> : <Eye className="h-4 w-4 text-[#8B7355]" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#2D2926]">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-[#8B7355]" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Confirm password"
                        value={registerForm.confirmPassword}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="pl-10 bg-white border-[#E8D5C4] rounded-xl text-[#2D2926]"
                        data-testid="input-register-confirm-password"
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-[#D4AF37] hover:bg-[#C19A2E] text-[#2D2926] rounded-xl py-5" disabled={isLoading}>
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-[#4A3F3F] space-y-2">
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
              className="text-[#2D2926] font-semibold hover:underline"
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
              className="text-[#2D2926] font-semibold hover:underline"
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
