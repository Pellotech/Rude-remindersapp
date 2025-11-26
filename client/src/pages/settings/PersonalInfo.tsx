import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ChevronLeft, Eye, EyeOff, Home } from "lucide-react";

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

const genderOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non-binary", label: "Non-binary" },
  { value: "other", label: "Other" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
];

export default function PersonalInfo() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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

  const [localSettings, setLocalSettings] = useState<any>({});
  const [showPassword, setShowPassword] = useState(false);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-lg mx-auto">
        <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-[#38383A]">
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

        <div className="py-6 px-4 space-y-6">
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
            <div className="px-4 py-3 border-b border-[#38383A]">
              <label className="text-[13px] text-[#8E8E93] uppercase tracking-wide">Age</label>
              <input
                type="number"
                min="13"
                max="120"
                value={currentSettings.age || ""}
                onChange={(e) => updateSetting("age", e.target.value ? parseInt(e.target.value) : null)}
                className="w-full bg-transparent text-white text-[17px] mt-1 outline-none placeholder-[#48484A]"
                placeholder="Enter age"
                data-testid="input-age"
              />
            </div>
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

          <div className="bg-[#1C1C1E] rounded-xl overflow-hidden">
            <div className="px-4 py-3">
              <label className="text-[13px] text-[#8E8E93] uppercase tracking-wide">Gender Identity</label>
              <select
                value={currentSettings.gender || ""}
                onChange={(e) => updateSetting("gender", e.target.value)}
                className="w-full bg-transparent text-white text-[17px] mt-1 outline-none appearance-none cursor-pointer"
                data-testid="select-gender"
              >
                <option value="" className="bg-[#1C1C1E]">Select gender</option>
                {genderOptions.map((option) => (
                  <option key={option.value} value={option.value} className="bg-[#1C1C1E]">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

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
      </div>
    </div>
  );
}
