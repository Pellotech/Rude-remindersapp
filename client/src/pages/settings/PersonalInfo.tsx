import { useState } from "react";
import SplashScreen from "@/components/SplashScreen";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, clearAuthToken } from "@/lib/queryClient";
import { getPlatformInfo } from "@/utils/platformDetection";
import { SaveBar, SAVE_BAR_SPACE, useLeaveGuard } from "@/components/UnsavedChanges";
import { ChevronLeft, ChevronDown, Eye, EyeOff, Home, Trash2, AlertTriangle, ArrowLeft, Lock, Copy, Check } from "lucide-react";

export default function PersonalInfo() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { isAndroid, isIOS } = getPlatformInfo();
  
  const { data: user, isLoading } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (settings: any) =>
      apiRequest("/api/settings", { method: "PUT", body: JSON.stringify(settings) }),
    onSuccess: () => {
      setLocalSettings({});
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Saved",
        description: "Your information has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Couldn't save",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => apiRequest("/api/account", { method: "DELETE" }),
    onSuccess: async () => {
      await clearAuthToken();
      queryClient.clear();
      toast({ title: "Account deleted." });
      setLocation("/login");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const [localSettings, setLocalSettings] = useState<any>({});
  const [codeCopied, setCodeCopied] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [showDeleteScreen, setShowDeleteScreen] = useState(false);

  const isOAuthOnly = !!user && !user.hasPassword;
  const newPwTooShort = newPassword.length > 0 && newPassword.length < 8;
  const pwMismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;
  const canSubmitPassword =
    !isOAuthOnly &&
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    confirmPassword === newPassword &&
    currentPassword !== newPassword;

  const changePasswordMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/account/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
    onSuccess: () => {
      toast({ title: "Password updated", description: "Your password has been changed." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => {
      const message = err?.message?.replace(/^\d+:\s*/, "") || "Failed to change password";
      let description = message;
      try {
        const parsed = JSON.parse(message);
        if (parsed?.message) description = parsed.message;
      } catch {}
      toast({ title: "Couldn't update password", description, variant: "destructive" });
    },
  });

  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  // Only real edits count (typing a name back to what it was removes the change)
  const updateSetting = (key: string, value: any) => {
    setLocalSettings((prev: any) => {
      const next = { ...prev };
      if ((user?.[key] ?? "") === value) delete next[key];
      else next[key] = value;
      return next;
    });
  };

  const hasChanges = Object.keys(localSettings).length > 0;
  const currentSettings = { ...user, ...localSettings };
  const saveSettings = () => updateSettingsMutation.mutateAsync(localSettings);
  const discardChanges = () => setLocalSettings({});
  const { leave, dialog: leaveDialog } = useLeaveGuard(hasChanges, saveSettings, discardChanges);

  if (isLoading) {
    return (
      <SplashScreen />
    );
  }

  if (showDeleteScreen) {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-lg mx-auto">
          <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-ui-separator safe-area-header">
            <div className="flex items-center px-4 py-3">
              <button onClick={() => { setShowDeleteScreen(false); setDeleteConfirmText(""); setShowDeleteDialog(false); }} className="flex items-center text-ui-link cursor-pointer">
                <ArrowLeft className="h-5 w-5" />
                <span className="text-body-lg ml-1">Back</span>
              </button>
            </div>
            <h1 className="text-title-lg font-bold text-red-400 px-4 pb-2 flex items-center gap-2">
              <AlertTriangle className="h-7 w-7" />
              Delete Account
            </h1>
          </div>

          <div className="py-6 px-4 space-y-6" style={{ paddingBottom: isAndroid ? '120px' : isIOS ? '80px' : '24px' }}>
            <div className="bg-ui-card rounded-xl p-4">
              <p className="text-body text-gray-300 leading-relaxed">
                This will permanently delete your account and all associated data, including your reminders. This action cannot be undone.
              </p>
            </div>

            <div className="bg-ui-card rounded-xl overflow-hidden">
              <div className="px-4 py-3">
                <label className="text-note text-ui-label-2 uppercase tracking-wide">Type DELETE to confirm</label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full bg-transparent text-white text-body-lg mt-1 outline-none placeholder-ui-tertiary"
                  placeholder="DELETE"
                  autoCapitalize="characters"
                />
              </div>
            </div>

            <button
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleteConfirmText !== "DELETE" || deleteAccountMutation.isPending}
              className="w-full py-3.5 bg-red-600 text-white font-semibold text-body-lg rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <Trash2 className="h-5 w-5" />
              {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
            </button>
          </div>

          {showDeleteDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
              <div className="bg-ui-card rounded-2xl w-[280px] overflow-hidden">
                <div className="p-4 text-center">
                  <h3 className="text-body-lg font-semibold text-red-400 mb-2">Delete Account</h3>
                  <p className="text-note text-gray-400">
                    This will permanently delete your account and all associated data, including your reminders. This action cannot be undone.
                  </p>
                </div>
                <div className="border-t border-ui-separator">
                  <button
                    onClick={() => { setShowDeleteDialog(false); setDeleteConfirmText(""); }}
                    className="w-full py-3 text-body-lg text-ui-link font-medium border-b border-ui-separator"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteAccountMutation.mutate()}
                    disabled={deleteAccountMutation.isPending}
                    className="w-full py-3 text-body-lg text-red-500 font-semibold disabled:opacity-50"
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

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-lg mx-auto">
        <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-ui-separator safe-area-header">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => leave("/settings")} className="flex items-center text-ui-link" data-testid="button-back">
              <ChevronLeft className="h-5 w-5" />
              <span className="text-body-lg">Settings</span>
            </button>
            <button onClick={() => leave("/")} className="text-ui-link" data-testid="button-home" aria-label="Home">
              <Home className="h-5 w-5" />
            </button>
          </div>
          <h1 className="text-title-lg font-bold text-white px-4 pb-2">Personal Information</h1>
        </div>

        <div className="py-6 px-4 space-y-6" style={{ paddingBottom: (isAndroid ? 120 : isIOS ? 80 : 24) + SAVE_BAR_SPACE }}>
          <div className="bg-ui-card rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-ui-separator">
              <label className="text-note text-ui-label-2 uppercase tracking-wide">First Name</label>
              <input
                type="text"
                value={currentSettings.firstName || ""}
                onChange={(e) => updateSetting("firstName", e.target.value)}
                className="w-full bg-transparent text-white text-body-lg mt-1 outline-none placeholder-ui-tertiary"
                placeholder="Enter first name"
                data-testid="input-first-name"
              />
            </div>
            <div className="px-4 py-3 border-b border-ui-separator">
              <label className="text-note text-ui-label-2 uppercase tracking-wide">Last Name</label>
              <input
                type="text"
                value={currentSettings.lastName || ""}
                onChange={(e) => updateSetting("lastName", e.target.value)}
                className="w-full bg-transparent text-white text-body-lg mt-1 outline-none placeholder-ui-tertiary"
                placeholder="Enter last name"
                data-testid="input-last-name"
              />
            </div>
            <div className="px-4 py-3 border-b border-ui-separator">
              <label className="text-note text-ui-label-2 uppercase tracking-wide">Nickname</label>
              <input
                type="text"
                value={currentSettings.nickname || ""}
                onChange={(e) => updateSetting("nickname", e.target.value)}
                className="w-full bg-transparent text-white text-body-lg mt-1 outline-none placeholder-ui-tertiary"
                placeholder="What should we call you?"
                data-testid="input-nickname"
              />
              <p className="text-caption text-ui-label-2 mt-1">
                Used for greetings and reminders instead of your first name, if set.
              </p>
            </div>
            <div className="px-4 py-3 border-b border-ui-separator">
              <label className="text-note text-ui-label-2 uppercase tracking-wide">Email</label>
              <p className="text-ui-label-3 text-body-lg mt-1 break-all" data-testid="text-email">{user?.email || "—"}</p>
              <p className="text-caption text-ui-label-2 mt-1">This is your sign-in email. Need it changed? Email us from Help &amp; Support.</p>
            </div>
            <div className="px-4 py-3">
              <label className="text-note text-ui-label-2 uppercase tracking-wide">Your User ID</label>
              <div className="flex items-center justify-between mt-1">
                <p className="text-ui-label-3 text-body-lg tracking-wider tabular-nums" data-testid="text-user-code">
                  {user?.userCode ? `${user.userCode.slice(0, 5)} ${user.userCode.slice(5)}` : "—"}
                </p>
                {user?.userCode && (
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(user.userCode);
                        setCodeCopied(true);
                        setTimeout(() => setCodeCopied(false), 2000);
                      } catch {
                        toast({ title: "Couldn't copy", description: "Press and hold the number to copy it." });
                      }
                    }}
                    className="flex items-center gap-1 text-ui-link text-body"
                    data-testid="button-copy-user-code"
                  >
                    {codeCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {codeCopied ? "Copied" : "Copy"}
                  </button>
                )}
              </div>
              <p className="text-caption text-ui-label-2 mt-1">Your personal 10-digit ID. It never changes. Support may ask for it.</p>
            </div>
          </div>

          <div>
            {isOAuthOnly ? (
              <>
                <p className="text-note text-ui-label-2 uppercase tracking-wide px-4 mb-2">Change Password</p>
                <div className="bg-ui-card rounded-xl px-4 py-3">
                  <p className="text-body text-ui-label-2">
                    You sign in with Google or Apple. Want to log in with your email too? Add a password and you'll get the same account and reminders either way.
                  </p>
                  {user?.email && !user.email.endsWith('@noemail.local') && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await apiRequest('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: user.email }) });
                          toast({ title: "Check your email", description: `We sent a link to ${user.email} to set your password.` });
                        } catch {
                          toast({ title: "Couldn't send the email", description: "Please try again in a minute.", variant: "destructive" });
                        }
                      }}
                      className="mt-3 text-ui-link text-body font-medium"
                    >
                      Add a password
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-ui-card rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setPasswordOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                  aria-expanded={passwordOpen}
                  data-testid="toggle-change-password"
                >
                  <div className="flex items-center gap-3">
                    <Lock className="h-5 w-5 text-reem-gold" />
                    <span className="text-body-lg text-white font-medium">Change Password</span>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-ui-label-2 transition-transform duration-200 ${passwordOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {passwordOpen && (
                  <div className="border-t border-ui-raised divide-y divide-ui-raised">
                    <div className="px-4 py-3">
                      <label className="text-caption text-ui-label-2">Current password</label>
                  <div className="relative mt-1">
                    <input
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-transparent text-white text-body-lg outline-none placeholder-ui-tertiary pr-10"
                      placeholder="Enter current password"
                      autoComplete="current-password"
                      data-testid="input-current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-ui-label-2"
                      aria-label={showCurrent ? "Hide password" : "Show password"}
                    >
                      {showCurrent ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="px-4 py-3">
                  <label className="text-caption text-ui-label-2">New password</label>
                  <div className="relative mt-1">
                    <input
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-transparent text-white text-body-lg outline-none placeholder-ui-tertiary pr-10"
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      data-testid="input-new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-ui-label-2"
                      aria-label={showNew ? "Hide password" : "Show password"}
                    >
                      {showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {newPwTooShort && (
                    <p className="text-caption text-reem-coral mt-1">Must be at least 8 characters.</p>
                  )}
                </div>

                <div className="px-4 py-3">
                  <label className="text-caption text-ui-label-2">Confirm new password</label>
                  <div className="relative mt-1">
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-transparent text-white text-body-lg outline-none placeholder-ui-tertiary pr-10"
                      placeholder="Re-enter new password"
                      autoComplete="new-password"
                      data-testid="input-confirm-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-ui-label-2"
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                    >
                      {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {pwMismatch && (
                    <p className="text-caption text-reem-coral mt-1">Passwords don't match.</p>
                  )}
                </div>

                    <div className="px-4 py-3">
                      <button
                        onClick={() => changePasswordMutation.mutate()}
                        disabled={!canSubmitPassword || changePasswordMutation.isPending}
                        className="w-full py-3 bg-reem-gold text-black font-semibold text-body rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
                        data-testid="button-update-password"
                      >
                        {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>


          <div className="pt-4">
            <p className="text-note text-ui-label-2 uppercase tracking-wide px-4 mb-2">Account Management</p>
            <div className="bg-ui-card rounded-xl overflow-hidden">
              <button
                onClick={() => setShowDeleteScreen(true)}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-ui-raised transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Trash2 className="h-5 w-5 text-red-500" />
                  <span className="text-red-500 text-body">Delete Account</span>
                </div>
                <ChevronLeft className="h-4 w-4 text-ui-tertiary rotate-180" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <SaveBar visible={hasChanges} saving={updateSettingsMutation.isPending} onSave={() => { saveSettings().catch(() => {}); }} onDiscard={discardChanges} />
      {leaveDialog}
    </div>
  );
}
