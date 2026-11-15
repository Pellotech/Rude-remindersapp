import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ChevronLeft, Home, Copy, Check, RefreshCw, ShieldOff } from "lucide-react";
import SplashScreen from "@/components/SplashScreen";
import { getPlatformInfo } from "@/utils/platformDetection";

// This page issues/revokes the long-lived bearer token the iOS "Rude
// Reminders" App Intents extension uses to create reminders on the user's
// behalf when they ask Siri, independent of the main app being open. See
// ios/App/RudeRemindersIntents for the Swift side and
// POST/DELETE /api/auth/siri-token on the server for where this token lives.
export default function SiriShortcuts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery<any>({ queryKey: ["/api/auth/user"] });

  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateMutation = useMutation({
    mutationFn: () => apiRequest("/api/auth/siri-token", { method: "POST" }),
    onSuccess: async (data: any) => {
      setRevealedToken(data.token);
      setCopied(false);
      // Copy it straight away so the next step is just "paste"
      try { await navigator.clipboard.writeText(data.token); setCopied(true); } catch { /* user can tap Copy */ }
    },
    onError: () => {
      toast({
        title: "Couldn't generate token",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: () => apiRequest("/api/auth/siri-token", { method: "DELETE" }),
    onSuccess: () => {
      setRevealedToken(null);
      toast({ title: "Access revoked", description: "Siri can no longer create reminders until you connect again." });
    },
    onError: () => {
      toast({
        title: "Couldn't revoke token",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const copyToken = async () => {
    if (!revealedToken) return;
    try {
      await navigator.clipboard.writeText(revealedToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Couldn't copy",
        description: "Select and copy the token manually.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <SplashScreen />;
  }

  // Siri only exists on iPhone/iPad — never show this on Android or the website
  if (!getPlatformInfo().isIOS) {
    return (
      <div className="min-h-screen bg-black flex flex-col safe-area-header">
        <div className="px-4 py-3">
          <Link href="/settings">
            <div className="flex items-center text-ui-link cursor-pointer"><ChevronLeft className="h-5 w-5" /><span className="text-body-lg">Settings</span></div>
          </Link>
        </div>
        <div className="flex-1 flex items-center justify-center px-6 text-center">
          <p className="text-body text-ui-label-2">Siri &amp; Shortcuts is only available on iPhone and iPad.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-lg mx-auto">
        <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-ui-separator safe-area-header">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/settings">
              <div className="flex items-center text-ui-link cursor-pointer" data-testid="button-back">
                <ChevronLeft className="h-5 w-5" />
                <span className="text-body-lg">Settings</span>
              </div>
            </Link>
            <Link href="/">
              <div className="text-ui-link cursor-pointer" data-testid="button-home">
                <Home className="h-5 w-5" />
              </div>
            </Link>
          </div>
          <h1 className="text-title-lg font-bold text-white px-4 pb-2">Siri & Shortcuts</h1>
        </div>

        <div className="py-6 px-4 space-y-6">
          <div className="bg-ui-card rounded-xl p-4">
            <p className="text-body text-gray-300 leading-relaxed">
              Connect Reems Rude Reminders to Siri so you can say things like{" "}
              <span className="text-white font-medium">"Hey Siri, add a reminder in Reems Rude Reminders to call mom tomorrow at 5pm"</span>{" "}
              without opening the app.
            </p>
          </div>

          <div className="bg-ui-card rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-ui-separator">
              <p className="text-note text-ui-label-2 uppercase tracking-wide">Step 1</p>
              <p className="text-body text-white mt-1">Tap "Generate Access Token" below — it's copied for you automatically.</p>
            </div>
            <div className="px-4 py-3 border-b border-ui-separator">
              <p className="text-note text-ui-label-2 uppercase tracking-wide">Step 2</p>
              <p className="text-body text-white mt-1">
                Open the Shortcuts app, find "Connect Reems Rude Reminders", run it once, and paste the token when asked.
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="text-note text-ui-label-2 uppercase tracking-wide">Step 3</p>
              <p className="text-body text-white mt-1">
                That's it — "Hey Siri, add a reminder in Reems Rude Reminders..." works from anywhere.
              </p>
            </div>
          </div>

          {revealedToken ? (
            <div className="bg-ui-card rounded-xl p-4 space-y-3">
              <p className="text-note text-ui-label-2 uppercase tracking-wide">Your access token</p>
              <p className="text-note text-reem-coral">
                Copy this now — for your security it won't be shown again.
              </p>
              <div className="bg-black rounded-lg px-3 py-2.5 break-all text-note text-reem-gold font-mono">
                {revealedToken}
              </div>
              <button
                onClick={copyToken}
                className="w-full py-3 bg-white text-black font-semibold text-body rounded-xl flex items-center justify-center gap-2"
                data-testid="button-copy-token"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy Token"}
              </button>
              <button
                onClick={() => { window.location.href = "shortcuts://"; }}
                className="w-full py-3 bg-reem-gold text-black font-semibold text-body rounded-xl"
                data-testid="button-open-shortcuts"
              >
                Open Shortcuts App →
              </button>
              <p className="text-caption text-ui-label-2">
                In Shortcuts, tap the search bar, type "Connect Reems", run it and paste.
              </p>
            </div>
          ) : (
            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="w-full py-3.5 bg-reem-gold text-black font-semibold text-body-lg rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
              data-testid="button-generate-token"
            >
              <RefreshCw className={`h-4 w-4 ${generateMutation.isPending ? "animate-spin" : ""}`} />
              {generateMutation.isPending ? "Generating..." : "Generate Access Token"}
            </button>
          )}

          <div className="pt-2">
            <p className="text-note text-ui-label-2 uppercase tracking-wide px-1 mb-2">Danger Zone</p>
            <button
              onClick={() => revokeMutation.mutate()}
              disabled={revokeMutation.isPending}
              className="w-full py-3 bg-ui-card text-red-500 font-medium text-body rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
              data-testid="button-revoke-token"
            >
              <ShieldOff className="h-4 w-4" />
              {revokeMutation.isPending ? "Revoking..." : "Revoke Siri Access"}
            </button>
            <p className="text-caption text-ui-label-2 mt-2 px-1">
              Revoke if you ever lose the device you pasted this into, or want to disconnect Siri.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
