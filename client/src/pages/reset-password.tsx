import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { getFullApiUrl } from "@/lib/queryClient";

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) setToken(t);
    else setError("No reset token found. Please request a new reset link.");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(getFullApiUrl("/api/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Something went wrong. Please try again.");
        return;
      }

      setSuccess(true);
      setTimeout(() => setLocation("/login"), 2500);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F5F5" }}>
      <AppHeader />
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <Card className="border-2 border-[#C9A063] rounded-2xl shadow-md">
            <CardContent className="pt-8 pb-8 px-6">
              {success ? (
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center h-14 w-14 rounded-full bg-green-100 mx-auto">
                    <Lock className="h-7 w-7 text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold text-[#111827]">Password updated!</h2>
                  <p className="text-sm text-[#374151]">Redirecting you to login...</p>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-[#111827] mb-1">Reset Password</h2>
                  <p className="text-sm text-[#374151] mb-6">Enter your new password below.</p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[#111827]">New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-[#C53B3B]" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="At least 8 characters"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="pl-10 pr-10 border-2 border-[#C9A063] focus:border-[#C53B3B] rounded-[14px] text-[#111827] py-3"
                          style={{ backgroundColor: "#FDF3E3" }}
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

                    <div className="space-y-2">
                      <Label className="text-[#111827]">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-[#C53B3B]" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pl-10 border-2 border-[#C9A063] focus:border-[#C53B3B] rounded-[14px] text-[#111827] py-3"
                          style={{ backgroundColor: "#FDF3E3" }}
                          required
                        />
                      </div>
                    </div>

                    {error && (
                      <p className="text-sm text-[#C53B3B]">{error}</p>
                    )}

                    <Button
                      type="submit"
                      disabled={isLoading || !token}
                      className="w-full bg-[#C53B3B] hover:bg-[#a83030] text-white rounded-[14px] py-5 h-[48px] font-semibold"
                    >
                      {isLoading ? "Updating..." : "Reset Password"}
                    </Button>

                    <div className="text-center mt-2">
                      <button
                        type="button"
                        onClick={() => setLocation("/login")}
                        className="text-sm text-[#C9A063] hover:underline"
                      >
                        Back to Login
                      </button>
                    </div>
                  </form>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
