import { useState, useEffect, useRef } from "react";
import SplashScreen from "@/components/SplashScreen";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, clearAuthToken } from "@/lib/queryClient";
import { getPlatformInfo } from "@/utils/platformDetection";
import { ChevronLeft, Eye, EyeOff, Home, Trash2, AlertTriangle, ArrowLeft } from "lucide-react";

const countryOptions = [
  { value: "us", label: "United States" },
  { value: "uk", label: "United Kingdom" },
  { value: "ca", label: "Canada" },
  { value: "au", label: "Australia" },
  { value: "de", label: "Germany" },
  { value: "fr", label: "France" },
  { value: "es", label: "Spain" },
  { value: "it", label: "Italy" },
  { value: "jp", label: "Japan" },
  { value: "kr", label: "South Korea" },
  { value: "cn", label: "China" },
  { value: "in", label: "India" },
  { value: "br", label: "Brazil" },
  { value: "mx", label: "Mexico" },
  { value: "other", label: "Other" },
];

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
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Saved",
        description: "Your information has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save. Please try again.",
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
  const [showPassword, setShowPassword] = useState(false);
  const [showDeleteScreen, setShowDeleteScreen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const saveButtonRef = useRef<HTMLDivElement>(null);
  const prevHasChanges = useRef(false);

  useEffect(() => {
    if (user) {
      setLocalSettings({});
    }
  }, [user]);

  const saveSettings = () => {
    updateSettingsMutation.mutate(localSettings);
    setLocalSettings({});
  };

  const updateSetting = (key: string, value: any) => {
    setLocalSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  const hasChanges = Object.keys(localSettings).length > 0;
  const currentSettings = { ...user, ...localSettings };

  useEffect(() => {
    if (hasChanges && !prevHasChanges.current) {
      setTimeout(() => {
        saveButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        const bannerOffset = isAndroid ? 130 : isIOS ? 90 : 0;
        if (bannerOffset > 0) {
          setTimeout(() => {
            window.scrollBy({ top: bannerOffset, behavior: 'smooth' });
          }, 450);
        }
      }, 100);
    }
    prevHasChanges.current = hasChanges;
  }, [hasChanges, isAndroid, isIOS]);

  if (isLoading) {
    return (
      <SplashScreen />
    );
  }

  if (showDeleteScreen) {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-lg mx-auto">
          <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-[#38383A] safe-area-header">
            <div className="flex items-center px-4 py-3">
              <button onClick={() => { setShowDeleteScreen(false); setDeleteConfirmText(""); setShowDeleteDialog(false); }} className="flex items-center text-[#0A84FF] cursor-pointer">
                <ArrowLeft className="h-5 w-5" />
                <span className="text-[17px] ml-1">Back</span>
              </button>
            </div>
            <h1 className="text-[34px] font-bold text-red-400 px-4 pb-2 flex items-center gap-2">
              <AlertTriangle className="h-7 w-7" />
              Delete Account
            </h1>
          </div>

          <div className="py-6 px-4 space-y-6" style={{ paddingBottom: isAndroid ? '120px' : isIOS ? '80px' : '24px' }}>
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

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-lg mx-auto">
        <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-[#38383A] safe-area-header">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/settings">
              <div className="flex items-center text-[#0A84FF] cursor-pointer" data-testid="button-back">
                <ChevronLeft className="h-5 w-5" />
                <span className="text-[17px]">Settings</span>
              </div>
            </Link>
            <Link href="/">
              <div className="text-[#0A84FF] cursor-pointer" data-testid="button-home">
                <Home className="h-5 w-5" />
              </div>
            </Link>
          </div>
          <h1 className="text-[34px] font-bold text-white px-4 pb-2">Personal Information</h1>
        </div>

        <div className="py-6 px-4 space-y-6" style={{ paddingBottom: isAndroid ? '120px' : isIOS ? '80px' : '24px' }}>
          <div className="bg-[#1C1C1E] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#38383A]">
              <label className="text-[13px] text-[#8E8E93] uppercase tracking-wide">First Name</label>
              <input
                type="text"
                value={currentSettings.firstName || ""}
                onChange={(e) => updateSetting("firstName", e.target.value)}
                className="w-full bg-transparent text-white text-[17px] mt-1 outline-none placeholder-[#48484A]"
                placeholder="Enter first name"
                data-testid="input-first-name"
              />
            </div>
            <div className="px-4 py-3 border-b border-[#38383A]">
              <label className="text-[13px] text-[#8E8E93] uppercase tracking-wide">Last Name</label>
              <input
                type="text"
                value={currentSettings.lastName || ""}
                onChange={(e) => updateSetting("lastName", e.target.value)}
                className="w-full bg-transparent text-white text-[17px] mt-1 outline-none placeholder-[#48484A]"
                placeholder="Enter last name"
                data-testid="input-last-name"
              />
            </div>
            <div className="px-4 py-3">
              <label className="text-[13px] text-[#8E8E93] uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={currentSettings.email || ""}
                onChange={(e) => updateSetting("email", e.target.value)}
                className="w-full bg-transparent text-white text-[17px] mt-1 outline-none placeholder-[#48484A]"
                placeholder="Enter email"
                data-testid="input-email"
              />
            </div>
          </div>

          <div className="bg-[#1C1C1E] rounded-xl overflow-hidden">
            <div className="px-4 py-3">
              <label className="text-[13px] text-[#8E8E93] uppercase tracking-wide">Change Password</label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  value={currentSettings.newPassword || ""}
                  onChange={(e) => updateSetting("newPassword", e.target.value)}
                  className="w-full bg-transparent text-white text-[17px] outline-none placeholder-[#48484A] pr-10"
                  placeholder="New password (optional)"
                  autoComplete="new-password"
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-[#8E8E93]"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-[#1C1C1E] rounded-xl overflow-hidden">
            <div className="px-4 py-3">
              <label className="text-[13px] text-[#8E8E93] uppercase tracking-wide">Country</label>
              <select
                value={currentSettings.country || ""}
                onChange={(e) => updateSetting("country", e.target.value)}
                className="w-full bg-transparent text-white text-[17px] mt-1 outline-none appearance-none cursor-pointer"
                data-testid="select-country"
              >
                <option value="" className="bg-[#1C1C1E]">Select country</option>
                {countryOptions.map((option) => (
                  <option key={option.value} value={option.value} className="bg-[#1C1C1E]">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div ref={saveButtonRef}>
            {hasChanges && (
              <button
                onClick={saveSettings}
                disabled={updateSettingsMutation.isPending}
                className="w-full py-3.5 bg-white text-black font-semibold text-[17px] rounded-xl disabled:opacity-50"
                data-testid="button-save"
              >
                {updateSettingsMutation.isPending ? "Saving..." : "Save"}
              </button>
            )}
          </div>

          <div className="pt-4">
            <p className="text-[13px] text-[#8E8E93] uppercase tracking-wide px-4 mb-2">Account Management</p>
            <div className="bg-[#1C1C1E] rounded-xl overflow-hidden">
              <button
                onClick={() => setShowDeleteScreen(true)}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#2C2C2E] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Trash2 className="h-5 w-5 text-red-500" />
                  <span className="text-red-500 text-[15px]">Delete Account</span>
                </div>
                <ChevronLeft className="h-4 w-4 text-[#48484A] rotate-180" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
