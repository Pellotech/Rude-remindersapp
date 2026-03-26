import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, clearAuthToken } from "@/lib/queryClient";
import { User, Volume2, Bell, Shield, Palette, CreditCard, Calendar, Crown, ChevronRight, ArrowLeft, Trash2, AlertTriangle, ExternalLink } from "lucide-react";
import { BackNavigation } from "@/components/BackNavigation";
import { usePremium } from "@/hooks/usePremium";
import { HelpMenu } from "@/components/HelpMenu";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";

interface UserSettings {
  id: string;
  defaultRudenessLevel: number;
  voiceNotifications: boolean;
  emailNotifications: boolean;
  browserNotifications: boolean;
  gender?: string;
  genderSpecificReminders: boolean;
  firstName?: string;
  lastName?: string;
  email?: string;
  theme?: string;
  snoozeTime?: number;
  subscriptionStatus?: string;
  subscriptionPlan?: string;
  subscriptionEndsAt?: string;
  simplifiedInterface?: boolean;
  alarmSound?: string;
  emailSummary?: boolean;
  defaultVoiceCharacter?: string;
}

type SettingsSection = 'personal' | 'notifications' | 'appearance' | 'billing' | 'privacy' | 'history' | 'account';

const alarmSoundOptions = [
  { value: "gentle-chime", label: "🎵 Gentle Chime" },
  { value: "soft-bell", label: "🔔 Soft Bell" },
  { value: "water-drop", label: "💧 Water Drop" },
  { value: "wind-chimes", label: "🎐 Wind Chimes" },
  { value: "bird-chirp", label: "🐦 Bird Chirp" },
  { value: "soft-piano", label: "🎹 Soft Piano" },
  { value: "music-box", label: "📦 Music Box" },
  { value: "ocean-wave", label: "🌊 Ocean Wave" },
];

export default function Settings() {
  const { toast } = useToast();
  const { isPremium } = usePremium();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteScreen, setShowDeleteScreen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [activeSection, setActiveSection] = useState<SettingsSection>('personal');

  const { data: user, isLoading } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (settings: any) =>
      apiRequest("/api/settings", "PUT", settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Settings updated",
        description: "Your preferences have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => apiRequest("/api/account", "DELETE"),
    onSuccess: async () => {
      await clearAuthToken();
      queryClient.clear();
      toast({
        title: "Account deleted.",
      });
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

  const openLegalLink = async (url: string) => {
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url, presentationStyle: "popover" });
    } else {
      window.open(url, "_blank");
    }
  };

  const [localSettings, setLocalSettings] = useState<any>({});

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  const currentSettings = { ...user, ...localSettings };

  const updateSetting = (key: string, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
  };

  const saveSettings = () => {
    updateSettingsMutation.mutate(localSettings);
    setLocalSettings({});
  };

  const hasChanges = Object.keys(localSettings).length > 0;

  const menuItems = [
    { id: 'personal' as SettingsSection, label: 'Personal Info', icon: User },
    { id: 'notifications' as SettingsSection, label: 'Notifications', icon: Bell },
    { id: 'appearance' as SettingsSection, label: 'Appearance', icon: Palette },
    { id: 'billing' as SettingsSection, label: 'Billing', icon: CreditCard },
    { id: 'history' as SettingsSection, label: 'History', icon: Calendar },
    { id: 'privacy' as SettingsSection, label: 'Privacy', icon: Shield },
    { id: 'account' as SettingsSection, label: 'Account', icon: Shield },
  ];

  const renderDeleteScreen = () => (
    <div className="space-y-6">
      <div>
        <button onClick={() => { setShowDeleteScreen(false); setDeleteConfirmText(""); }} className="flex items-center text-gray-400 hover:text-white mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          <span className="text-sm">Back</span>
        </button>
        <h2 className="text-2xl font-semibold text-red-400 mb-2 flex items-center gap-2">
          <AlertTriangle className="h-6 w-6" />
          Delete Account
        </h2>
      </div>

      <div className="bg-gray-900 rounded-lg p-6 space-y-5 border border-red-900">
        <p className="text-gray-300 text-sm leading-relaxed">
          This will permanently delete your account and all associated data, including your reminders. This action cannot be undone.
        </p>

        <div className="space-y-2">
          <Label className="text-gray-400 text-sm">Type DELETE to confirm</Label>
          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="DELETE"
            className="bg-gray-800 border-gray-700 text-white"
          />
        </div>

        <AlertDialog open={showDeleteConfirm} onOpenChange={(open) => { setShowDeleteConfirm(open); if (!open) setDeleteConfirmText(""); }}>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              className="w-full"
              disabled={deleteConfirmText !== "DELETE" || deleteAccountMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-gray-900 border-gray-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-400">Delete Account</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                This will permanently delete your account and all associated data, including your reminders. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-gray-800 border-gray-700 text-white">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteAccountMutation.mutate()}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );

  const renderContent = () => {
    if (showDeleteScreen) {
      return renderDeleteScreen();
    }

    switch (activeSection) {
      case 'personal':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-white mb-2">Personal Information</h2>
              <p className="text-gray-400 text-sm">Manage your profile and preferences</p>
            </div>

            <div className="bg-gray-900 rounded-lg p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300 text-sm mb-2 block">First Name</Label>
                  <Input
                    value={currentSettings.firstName || ""}
                    onChange={(e) => updateSetting("firstName", e.target.value)}
                    placeholder="Enter first name"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 text-sm mb-2 block">Last Name</Label>
                  <Input
                    value={currentSettings.lastName || ""}
                    onChange={(e) => updateSetting("lastName", e.target.value)}
                    placeholder="Enter last name"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-300 text-sm mb-2 block">Email</Label>
                <Input
                  value={currentSettings.email || ""}
                  onChange={(e) => updateSetting("email", e.target.value)}
                  placeholder="Enter email"
                  type="email"
                  className="bg-gray-800 border-gray-700 text-white"
                  autoComplete="off"
                />
              </div>

              <Separator className="bg-gray-800" />

              <div>
                <Label className="text-gray-300 text-sm mb-2 block">Gender Identity</Label>
                <Select
                  value={currentSettings.gender || ""}
                  onValueChange={(value) => updateSetting("gender", value)}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {currentSettings.gender && (
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-gray-300 text-sm">Gender-specific reminders</Label>
                    <p className="text-gray-500 text-xs">Personalized content</p>
                  </div>
                  <Switch
                    checked={currentSettings.genderSpecificReminders || false}
                    onCheckedChange={(checked) => updateSetting("genderSpecificReminders", checked)}
                  />
                </div>
              )}
            </div>

            <div className="bg-gray-900 rounded-lg p-6 space-y-4">
              <h3 className="text-white font-medium">Account Management</h3>
              <Separator className="bg-gray-800" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm font-medium">Email</p>
                  <p className="text-gray-500 text-xs">{user?.email || 'Not set'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm font-medium">Account Status</p>
                  <p className="text-gray-500 text-xs">{user?.subscriptionPlan === 'premium' ? 'Premium' : 'Free'}</p>
                </div>
              </div>
              <Separator className="bg-gray-800" />
              <Button
                variant="destructive"
                onClick={() => setShowDeleteScreen(true)}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-white mb-2">Notifications</h2>
              <p className="text-gray-400 text-sm">Control how you receive reminders</p>
            </div>

            <div className="bg-gray-900 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-gray-300 text-sm">Browser Notifications</Label>
                  <p className="text-gray-500 text-xs">Push notifications</p>
                </div>
                <Switch
                  checked={currentSettings.browserNotifications || false}
                  onCheckedChange={(checked) => updateSetting("browserNotifications", checked)}
                />
              </div>

              <Separator className="bg-gray-800" />

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-gray-300 text-sm">Voice Notifications</Label>
                  <p className="text-gray-500 text-xs">Spoken reminders</p>
                </div>
                <Switch
                  checked={currentSettings.voiceNotifications || false}
                  onCheckedChange={(checked) => updateSetting("voiceNotifications", checked)}
                />
              </div>

              <Separator className="bg-gray-800" />

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-gray-300 text-sm">Email Notifications</Label>
                  <p className="text-gray-500 text-xs">Email reminders</p>
                </div>
                <Switch
                  checked={currentSettings.emailNotifications || false}
                  onCheckedChange={(checked) => updateSetting("emailNotifications", checked)}
                />
              </div>

              <Separator className="bg-gray-800" />

              <div>
                <Label className="text-gray-300 text-sm mb-2 block">Default Rudeness Level</Label>
                <div className="flex justify-between text-xs text-gray-500 mb-2">
                  <span>Gentle</span>
                  <span>Level {currentSettings.defaultRudenessLevel || 3}</span>
                  <span>Brutal</span>
                </div>
                <Slider
                  value={[currentSettings.defaultRudenessLevel || 3]}
                  onValueChange={([value]) => updateSetting("defaultRudenessLevel", value)}
                  max={5}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-white mb-2">Appearance</h2>
              <p className="text-gray-400 text-sm">Customize the look and feel</p>
            </div>

            <div className="bg-gray-900 rounded-lg p-6 space-y-4">
              <div>
                <Label className="text-gray-300 text-sm mb-2 block">Theme</Label>
                <Select
                  value={currentSettings.theme || "dark"}
                  onValueChange={(value) => updateSetting("theme", value)}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator className="bg-gray-800" />

              <div>
                <Label className="text-gray-300 text-sm mb-2 block">Alarm Sound</Label>
                <Select
                  value={currentSettings.alarmSound || "gentle-chime"}
                  onValueChange={(value) => updateSetting("alarmSound", value)}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {alarmSoundOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator className="bg-gray-800" />

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-gray-300 text-sm">Simplified Interface</Label>
                  <p className="text-gray-500 text-xs">Hide advanced options</p>
                </div>
                <Switch
                  checked={currentSettings.simplifiedInterface || false}
                  onCheckedChange={(checked) => updateSetting("simplifiedInterface", checked)}
                />
              </div>
            </div>
          </div>
        );

      case 'billing':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-white mb-2">Billing & Subscription</h2>
              <p className="text-gray-400 text-sm">Manage your subscription</p>
            </div>

            <div className="bg-gray-900 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">
                    {currentSettings.subscriptionPlan === "premium" ? "Premium Plan" : "Free Plan"}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {currentSettings.subscriptionPlan === "premium" 
                      ? "Full access to premium features" 
                      : "Basic features only"
                    }
                  </p>
                </div>
                {currentSettings.subscriptionPlan === "premium" && <Crown className="h-6 w-6 text-yellow-500" />}
              </div>

              <Separator className="bg-gray-800" />

              <Button
                variant="outline"
                onClick={() => setLocation('/subscribe')}
                className="w-full bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
              >
                {currentSettings.subscriptionPlan === "premium" ? "Manage Subscription" : "Upgrade to Premium"}
              </Button>
            </div>
          </div>
        );

      case 'history':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-white mb-2">Reminder History</h2>
              <p className="text-gray-400 text-sm">View past reminders</p>
            </div>

            <div className="bg-gray-900 rounded-lg p-6">
              <Button
                variant="outline"
                onClick={() => setLocation('/settings/history')}
                className="w-full bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
              >
                View Full History
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-white mb-2">Privacy & Security</h2>
              <p className="text-gray-400 text-sm">Manage your data and privacy</p>
            </div>

            <div className="bg-gray-900 rounded-lg p-6 space-y-4">
              <Button
                variant="outline"
                onClick={() => openLegalLink("https://app.termly.io/policy-viewer/policy.html?policyUUID=378d9c6b-c46e-44ed-83a2-d8770229969c")}
                className="w-full justify-between bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
              >
                <span>Privacy Policy</span>
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => openLegalLink("https://app.termly.io/policy-viewer/policy.html?policyUUID=34f340a5-79a7-4f66-b4f9-81f1e9693176")}
                className="w-full justify-between bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
              >
                <span>Terms of Service</span>
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 'account':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-white mb-2">Account</h2>
              <p className="text-gray-400 text-sm">Manage your account settings</p>
            </div>

            <div className="bg-gray-900 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm font-medium">Email</p>
                  <p className="text-gray-500 text-xs">{user?.email || 'Not set'}</p>
                </div>
              </div>

              <Separator className="bg-gray-800" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm font-medium">Account Status</p>
                  <p className="text-gray-500 text-xs">{user?.subscriptionPlan === 'premium' ? 'Premium' : 'Free'}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-6 border border-red-900">
              <h3 className="text-red-400 font-medium mb-2">Danger Zone</h3>
              <p className="text-gray-500 text-xs mb-4">Permanently delete your account and all data.</p>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteScreen(true)}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <BackNavigation customBackLabel="Back to Home" />

      <div className="flex flex-col md:flex-row max-w-6xl mx-auto">
        {/* Sidebar - horizontal scroll on mobile, vertical on desktop */}
        <div className="md:w-64 md:border-r border-b md:border-b-0 border-gray-800 md:min-h-screen p-4">
          <h1 className="text-xl font-semibold mb-4 md:mb-6 px-2">Settings</h1>
          <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveSection(item.id); setShowDeleteScreen(false); }}
                  className={`flex-shrink-0 flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                    activeSection === item.id
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-400 hover:bg-gray-900 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 md:gap-3">
                    <Icon className="h-5 w-5" />
                    <span className="text-sm whitespace-nowrap">{item.label}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 hidden md:block" />
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 md:p-8">
          {renderContent()}

          {/* Save Button */}
          {hasChanges && (
            <div className="mt-8 flex justify-end">
              <Button
                onClick={saveSettings}
                disabled={updateSettingsMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Help Button */}
      <div className="fixed bottom-20 right-4 z-50">
        <HelpMenu />
      </div>
    </div>
  );
}