import { useState } from "react";
import { AlertTriangle, Trash2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { clearAuthToken, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function DeleteAccount() {
  const { toast } = useToast();

  const [step, setStep] = useState<"info" | "login" | "confirm">("info");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Login failed");
      }
      return res.json();
    },
    onSuccess: () => {
      setLoginError("");
      setStep("confirm");
    },
    onError: (error: Error) => {
      setLoginError(error.message);
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/account/delete-with-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, confirmText: deleteConfirmText }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Deletion failed");
      }
      return res.json();
    },
    onSuccess: async () => {
      await clearAuthToken();
      queryClient.clear();
      setEmail("");
      setPassword("");
      setDeleteConfirmText("");
      setShowDeleteDialog(false);
      window.location.replace("/delete-account/complete");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (step === "info") {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-lg mx-auto">
          <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-[#38383A]">
            <h1 className="text-[28px] font-bold text-white px-4 py-4">Delete Your Account</h1>
          </div>

          <div className="py-6 px-4 space-y-6">
            <div className="bg-[#1C1C1E] rounded-xl p-4">
              <p className="text-[15px] text-gray-300 leading-relaxed">
                If you wish to delete your Rude Reminders account, you will need to log in and confirm your identity. This process will permanently remove your account and all associated data.
              </p>
            </div>

            <div className="bg-[#1C1C1E] rounded-xl p-4 space-y-3">
              <h2 className="text-[17px] font-semibold text-white">What gets deleted</h2>
              <ul className="text-[15px] text-gray-400 space-y-1.5">
                <li>• Account profile (name, email, profile image)</li>
                <li>• All reminders you created</li>
                <li>• Personalization preferences</li>
                <li>• Notification settings</li>
                <li>• Subscription linkage</li>
                <li>• Authentication tokens and session data</li>
              </ul>
            </div>

            <div className="bg-[#1C1C1E] rounded-xl p-4 space-y-3">
              <h2 className="text-[17px] font-semibold text-white">What is retained</h2>
              <ul className="text-[15px] text-gray-400 space-y-1.5">
                <li>• Anonymized usage analytics (not linked to you)</li>
                <li>• Transaction records required by law (up to 180 days)</li>
              </ul>
            </div>

            <div className="bg-[#1C1C1E] rounded-xl p-4 space-y-3">
              <h2 className="text-[17px] font-semibold text-white">Retention period</h2>
              <p className="text-[15px] text-gray-400">
                All personal data is permanently removed within 30 days. Your account is immediately deactivated upon deletion.
              </p>
            </div>

            <div className="bg-[#1C1C1E] rounded-xl p-4 space-y-3">
              <h2 className="text-[17px] font-semibold text-white">Subscription note</h2>
              <p className="text-[15px] text-gray-400">
                Deleting your account does not cancel active subscriptions through the App Store or Google Play. Cancel your subscription in your device settings first.
              </p>
            </div>

            <button
              onClick={() => setStep("login")}
              className="w-full py-3.5 bg-red-600 text-white font-semibold text-[17px] rounded-xl flex items-center justify-center gap-2"
            >
              <Trash2 className="h-5 w-5" />
              Proceed to Delete Account
            </button>

            <div className="text-center text-[13px] text-gray-500 pt-2">
              <p>Questions? Contact{" "}
                <a href="mailto:ruderemindersinfo@gmail.com" className="text-[#0A84FF] underline">
                  ruderemindersinfo@gmail.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "login") {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-lg mx-auto">
          <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-[#38383A]">
            <div className="flex items-center px-4 py-3">
              <button onClick={() => { setStep("info"); setLoginError(""); }} className="flex items-center text-[#0A84FF] cursor-pointer">
                <ArrowLeft className="h-5 w-5" />
                <span className="text-[17px] ml-1">Back</span>
              </button>
            </div>
            <h1 className="text-[28px] font-bold text-white px-4 pb-2">Log In to Continue</h1>
          </div>

          <div className="py-6 px-4 space-y-6">
            <div className="bg-[#1C1C1E] rounded-xl p-4">
              <p className="text-[15px] text-gray-300 leading-relaxed">
                Please log in with the account you want to delete. This verifies your identity before proceeding.
              </p>
            </div>

            {loginError && (
              <div className="bg-red-900/30 border border-red-800 rounded-xl p-4">
                <p className="text-[15px] text-red-400">{loginError}</p>
              </div>
            )}

            <div className="bg-[#1C1C1E] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#38383A]">
                <label className="text-[13px] text-[#8E8E93] uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent text-white text-[17px] mt-1 outline-none placeholder-[#48484A]"
                  placeholder="your@email.com"
                  autoComplete="off"
                  data-form-type="other"
                />
              </div>
              <div className="px-4 py-3">
                <label className="text-[13px] text-[#8E8E93] uppercase tracking-wide">Password</label>
                <div className="flex items-center">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent text-white text-[17px] mt-1 outline-none placeholder-[#48484A]"
                    placeholder="Enter your password"
                    autoComplete="off"
                    data-form-type="other"
                  />
                  <button onClick={() => setShowPassword(!showPassword)} className="text-[#8E8E93] ml-2">
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => loginMutation.mutate()}
              disabled={!email || !password || loginMutation.isPending}
              className="w-full py-3.5 bg-red-600 text-white font-semibold text-[17px] rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loginMutation.isPending ? "Verifying..." : "Log In & Continue"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-lg mx-auto">
        <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-[#38383A]">
          <div className="flex items-center px-4 py-3">
            <button onClick={() => { setStep("login"); setDeleteConfirmText(""); setShowDeleteDialog(false); }} className="flex items-center text-[#0A84FF] cursor-pointer">
              <ArrowLeft className="h-5 w-5" />
              <span className="text-[17px] ml-1">Back</span>
            </button>
          </div>
          <h1 className="text-[34px] font-bold text-red-400 px-4 pb-2 flex items-center gap-2">
            <AlertTriangle className="h-7 w-7" />
            Delete Account
          </h1>
        </div>

        <div className="py-6 px-4 space-y-6">
          <div className="bg-[#1C1C1E] rounded-xl p-4">
            <p className="text-[15px] text-gray-300 leading-relaxed">
              This will permanently delete your account and all associated data, including your reminders. This action cannot be undone.
            </p>
          </div>

          <div className="bg-[#1C1C1E] rounded-xl overflow-hidden">
            <div className="px-4 py-3">
              <label className="text-[13px] text-[#8E8E93] uppercase tracking-wide">Type DELETE to confirm</label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full bg-transparent text-white text-[17px] mt-1 outline-none placeholder-[#48484A]"
                placeholder="DELETE"
                autoCapitalize="characters"
              />
            </div>
          </div>

          <button
            onClick={() => setShowDeleteDialog(true)}
            disabled={deleteConfirmText !== "DELETE" || deleteAccountMutation.isPending}
            className="w-full py-3.5 bg-red-600 text-white font-semibold text-[17px] rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Trash2 className="h-5 w-5" />
            {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
          </button>
        </div>

        {showDeleteDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="bg-[#1C1C1E] rounded-2xl w-[280px] overflow-hidden">
              <div className="p-4 text-center">
                <h3 className="text-[17px] font-semibold text-red-400 mb-2">Delete Account</h3>
                <p className="text-[13px] text-gray-400">
                  This will permanently delete your account and all associated data, including your reminders. This action cannot be undone.
                </p>
              </div>
              <div className="border-t border-[#38383A]">
                <button
                  onClick={() => { setShowDeleteDialog(false); setDeleteConfirmText(""); }}
                  className="w-full py-3 text-[17px] text-[#0A84FF] font-medium border-b border-[#38383A]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteAccountMutation.mutate()}
                  disabled={deleteAccountMutation.isPending}
                  className="w-full py-3 text-[17px] text-red-500 font-semibold disabled:opacity-50"
                >
                  {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
