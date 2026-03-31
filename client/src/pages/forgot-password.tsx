import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { getFullApiUrl } from "@/lib/queryClient";

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setIsLoading(true);
    try {
      await fetch(getFullApiUrl("/api/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setSubmitted(true);
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
              {submitted ? (
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center h-14 w-14 rounded-full bg-green-100 mx-auto">
                    <Mail className="h-7 w-7 text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold text-[#111827]">Check your email</h2>
                  <p className="text-sm text-[#374151]">
                    If an account exists with that email, a reset link has been sent. Check your inbox (and spam folder).
                  </p>
                  <Button
                    type="button"
                    className="w-full mt-4 text-[#C9A063] bg-transparent hover:bg-[#FDF3E3] border border-[#C9A063] rounded-[14px]"
                    onClick={() => setLocation("/login")}
                  >
                    Back to Login
                  </Button>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-[#111827] mb-1">Reset Password</h2>
                  <p className="text-sm text-[#374151] mb-6">Enter your email and we'll send you a reset link.</p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[#111827]">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-[#C53B3B]" />
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 border-2 border-[#C9A063] focus:border-[#C53B3B] rounded-[14px] text-[#111827] py-3"
                          style={{ backgroundColor: "#FDF3E3" }}
                          autoComplete="email"
                          required
                        />
                      </div>
                    </div>

                    {error && (
                      <p className="text-sm text-[#C53B3B]">{error}</p>
                    )}

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-[#C53B3B] hover:bg-[#a83030] text-white rounded-[14px] py-5 h-[48px] font-semibold"
                    >
                      {isLoading ? "Sending..." : "Send Reset Link"}
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
