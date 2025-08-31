import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User, Volume2, Bell, Mail, Users, Globe, UserCircle, Heart, ChevronDown, ChevronRight, Shield, Smartphone, Clock, Palette, Download, Trash2, Settings as SettingsIcon, CreditCard, Crown, Check, X, ArrowLeft, Home } from "lucide-react";
import { Link } from "wouter";
import { BackNavigation } from "@/components/BackNavigation";

interface UserSettings {
  id: string;
  defaultRudenessLevel: number;
  voiceNotifications: boolean;
  emailNotifications: boolean;
  browserNotifications: boolean;
  gender?: string;
  genderSpecificReminders: boolean;
  ethnicity?: string;
  ethnicitySpecificQuotes: boolean;
  // Additional settings
  firstName?: string;
  lastName?: string;
  email?: string;
  timezone?: string;
  language?: string;
  theme?: string;
  reminderFrequency?: string;
  snoozeTime?: number;
  autoCompleteReminders?: boolean;
  emailSummary?: boolean;
  dataRetention?: number;
  // Subscription fields
  subscriptionStatus?: string;
  subscriptionPlan?: string;
  subscriptionEndsAt?: string;
  simplifiedInterface?: boolean;
  alarmSound?: string;
}

// Comprehensive list of countries/ethnicities for cultural targeting
const ethnicityOptions = [
  { value: "american", label: "American" },
  { value: "african-american", label: "African American" },
  { value: "hispanic-latino", label: "Hispanic/Latino" },
  { value: "asian-american", label: "Asian American" },
  { value: "chinese", label: "Chinese" },
  { value: "indian", label: "Indian" },
  { value: "japanese", label: "Japanese" },
  { value: "korean", label: "Korean" },
  { value: "british", label: "British" },
  { value: "german", label: "German" },
  { value: "french", label: "French" },
  { value: "italian", label: "Italian" },
  { value: "spanish", label: "Spanish" },
  { value: "mexican", label: "Mexican" },
  { value: "brazilian", label: "Brazilian" },
  { value: "canadian", label: "Canadian" },
  { value: "australian", label: "Australian" },
  { value: "russian", label: "Russian" },
  { value: "middle-eastern", label: "Middle Eastern" },
  { value: "african", label: "African" },
  { value: "other", label: "Other" },
];

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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

  const [localSettings, setLocalSettings] = useState<any>({});
  
  // Collapsible section states
  const [openSections, setOpenSections] = useState({
    personal: true,
    billing: false,
    notifications: false,
    behavior: false,
    appearance: false,
    privacy: false,
    advanced: false,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const currentSettings = { ...user, ...localSettings };

  const updateSetting = (key: string, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
  };

  const playAlarmPreview = (soundName: string) => {
    // Create a gentle audio context for preview
    if ('AudioContext' in window || 'webkitAudioContext' in window) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      
      // Generate different tones for different sounds
      const frequency = getSoundFrequency(soundName);
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.type = getSoundWaveType(soundName);
      
      // Gentle volume and fade
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 1);
    }
  };

  const getSoundFrequency = (soundName: string): number => {
    const frequencies: { [key: string]: number } = {
      'gentle-chime': 523.25, // C5
      'soft-bell': 659.25,    // E5
      'water-drop': 783.99,   // G5
      'wind-chimes': 440,     // A4
      'bird-chirp': 880,      // A5
      'soft-piano': 523.25,   // C5
      'music-box': 659.25,    // E5
      'ocean-wave': 220,      // A3
    };
    return frequencies[soundName] || 523.25;
  };

  const getSoundWaveType = (soundName: string): OscillatorType => {
    const waveTypes: { [key: string]: OscillatorType } = {
      'gentle-chime': 'sine',
      'soft-bell': 'triangle',
      'water-drop': 'sine',
      'wind-chimes': 'triangle',
      'bird-chirp': 'square',
      'soft-piano': 'triangle',
      'music-box': 'square',
      'ocean-wave': 'sine',
    };
    return waveTypes[soundName] || 'sine';
  };

  const saveSettings = () => {
    updateSettingsMutation.mutate(localSettings);
    setLocalSettings({});
  };

  const hasChanges = Object.keys(localSettings).length > 0;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <BackNavigation customBackLabel="Back to Home" />

      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-muted-foreground">Choose a category to customize your experience</p>
      </div>

      {/* Personal Information */}
      <Card>
        <Collapsible open={openSections.personal} onOpenChange={() => toggleSection('personal')}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCircle className="h-5 w-5" />
                  Personal Information
                </div>
                {openSections.personal ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CardTitle>
              <p className="text-sm text-muted-foreground text-left">
                Help us personalize your reminders and motivational content
              </p>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">First Name</Label>
                  <Input
                    value={currentSettings.firstName || ""}
                    onChange={(e) => updateSetting("firstName", e.target.value)}
                    placeholder="Enter your first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Last Name</Label>
                  <Input
                    value={currentSettings.lastName || ""}
                    onChange={(e) => updateSetting("lastName", e.target.value)}
                    placeholder="Enter your last name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Age</Label>
                  <Input
                    type="number"
                    min="13"
                    max="120"
                    value={currentSettings.age || ""}
                    onChange={(e) => updateSetting("age", e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="Enter your age"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Country</Label>
                  <Input
                    value={currentSettings.country || ""}
                    onChange={(e) => updateSetting("country", e.target.value)}
                    placeholder="Enter your country"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Email Address</Label>
                <Input
                  value={currentSettings.email || ""}
                  onChange={(e) => updateSetting("email", e.target.value)}
                  placeholder="Enter your email address"
                  type="email"
                />
              </div>

              <Separator />

              {/* Gender Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Gender Identity</Label>
                <Select
                  value={currentSettings.gender || ""}
                  onValueChange={(value) => updateSetting("gender", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select your gender identity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
                
                {currentSettings.gender && currentSettings.gender !== "prefer-not-to-say" && (
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Gender-specific reminders</Label>
                      <p className="text-xs text-muted-foreground">
                        Receive reminders tailored to your gender identity
                      </p>
                    </div>
                    <Switch
                      checked={currentSettings.genderSpecificReminders || false}
                      onCheckedChange={(checked) => updateSetting("genderSpecificReminders", checked)}
                    />
                  </div>
                )}
              </div>

              <Separator />

              
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Billing & Subscription */}
      <Card>
        <Collapsible open={openSections.billing} onOpenChange={() => toggleSection('billing')}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Billing & Subscription
                </div>
                {openSections.billing ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CardTitle>
              <p className="text-sm text-muted-foreground text-left">
                Manage your subscription and billing preferences
              </p>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* Current Plan */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                      <Crown className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-medium">
                        {currentSettings.subscriptionPlan === "premium" ? "Premium Plan" : "Free Plan"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {currentSettings.subscriptionPlan === "premium" 
                          ? "Full access to all premium features" 
                          : "Basic reminders with limited features"
                        }
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">
                      {currentSettings.subscriptionPlan === "premium" ? "$9.99" : "$0"}
                    </p>
                    <p className="text-xs text-muted-foreground">per month</p>
                  </div>
                </div>

                {/* Plan Features */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Current Plan Includes:</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>Up to 10 reminders per month</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>Basic notifications</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <X className="h-4 w-4 text-red-500" />
                        <span>Limited voice characters</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <X className="h-4 w-4 text-red-500" />
                        <span>No multimedia attachments</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Premium Plan Includes:</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>Unlimited reminders</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>All notification types</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>Premium voice characters</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>Photo & video attachments</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>Cultural motivational quotes</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>Priority support</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upgrade/Manage Section */}
                {currentSettings.subscriptionPlan !== "premium" ? (
                  <div className="p-4 border-2 border-dashed border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50/50 dark:bg-blue-950/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-blue-900 dark:text-blue-100">Upgrade to Premium</h3>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Get unlimited reminders and premium features
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-xl text-blue-900 dark:text-blue-100">$9.99</p>
                        <p className="text-xs text-blue-700 dark:text-blue-300">per month</p>
                      </div>
                    </div>
                    <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700">
                      <Crown className="h-4 w-4 mr-2" />
                      Upgrade to Premium
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 border border-green-200 dark:border-green-800 rounded-lg bg-green-50/50 dark:bg-green-950/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
                          <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <h3 className="font-medium text-green-900 dark:text-green-100">Premium Active</h3>
                          <p className="text-sm text-green-700 dark:text-green-300">
                            {currentSettings.subscriptionEndsAt && `Renews ${new Date(currentSettings.subscriptionEndsAt).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Manage Subscription
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Payment Method */}
              <div className="space-y-4">
                <h3 className="font-medium">Payment Method</h3>
                <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">No payment method added</p>
                        <p className="text-xs text-muted-foreground">Add a payment method to upgrade</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Add Payment Method
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Billing History */}
              <div className="space-y-4">
                <h3 className="font-medium">Billing History</h3>
                <div className="p-4 border rounded-lg text-center text-muted-foreground">
                  <p className="text-sm">No billing history available</p>
                  <p className="text-xs">Invoices will appear here after your first payment</p>
                </div>
              </div>

              <Separator />

              {/* Billing Settings */}
              <div className="space-y-4">
                <h3 className="font-medium">Billing Settings</h3>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Auto-renewal</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically renew your subscription each month
                    </p>
                  </div>
                  <Switch
                    checked={true}
                    disabled={true}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Email receipts</Label>
                    <p className="text-xs text-muted-foreground">
                      Send payment receipts to your email address
                    </p>
                  </div>
                  <Switch
                    checked={currentSettings.emailNotifications || false}
                    onCheckedChange={(checked) => updateSetting("emailNotifications", checked)}
                  />
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <Collapsible open={openSections.notifications} onOpenChange={() => toggleSection('notifications')}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </div>
                {openSections.notifications ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CardTitle>
              <p className="text-sm text-muted-foreground text-left">
                Control how and when you receive reminder notifications
              </p>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Browser Notifications
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Desktop and mobile push notifications
                  </p>
                </div>
                <Switch
                  checked={currentSettings.browserNotifications || false}
                  onCheckedChange={(checked) => updateSetting("browserNotifications", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Volume2 className="h-4 w-4" />
                    Voice Notifications
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Spoken reminders with character voices
                  </p>
                </div>
                <Switch
                  checked={currentSettings.voiceNotifications || false}
                  onCheckedChange={(checked) => updateSetting("voiceNotifications", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Notifications
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Backup email reminders
                  </p>
                </div>
                <Switch
                  checked={currentSettings.emailNotifications || false}
                  onCheckedChange={(checked) => updateSetting("emailNotifications", checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Daily Email Summary
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Receive a daily summary of completed and upcoming reminders
                  </p>
                </div>
                <Switch
                  checked={currentSettings.emailSummary || false}
                  onCheckedChange={(checked) => updateSetting("emailSummary", checked)}
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Snooze Duration</Label>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>5 minutes</span>
                  <span>30 minutes</span>
                </div>
                <Slider
                  value={[currentSettings.snoozeTime || 10]}
                  onValueChange={([value]) => updateSetting("snoozeTime", value)}
                  max={30}
                  min={5}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground text-center">
                  How long to snooze reminders when dismissed: {currentSettings.snoozeTime || 10} minutes
                </p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* App Behavior */}
      <Card>
        <Collapsible open={openSections.behavior} onOpenChange={() => toggleSection('behavior')}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  App Behavior
                </div>
                {openSections.behavior ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CardTitle>
              <p className="text-sm text-muted-foreground text-left">
                Customize how the app behaves and interacts with you
              </p>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* Default Rudeness Level */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Default Rudeness Level</Label>
                <p className="text-sm text-muted-foreground">
                  Set how brutally honest your reminders should be by default
                </p>
                <div className="flex justify-between text-sm">
                  <span>Gentle</span>
                  <span className="font-medium">Level {currentSettings.defaultRudenessLevel || 3}</span>
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
                <div className="text-xs text-muted-foreground text-center">
                  This will be the default level for new reminders (you can still adjust each reminder individually)
                </div>
              </div>

              <Separator />

              {/* Default Voice Character */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Default Voice Character</Label>
                <p className="text-sm text-muted-foreground">
                  Choose the voice that will deliver your reminders by default
                </p>
                <Select
                  value={currentSettings.defaultVoiceCharacter || "default"}
                  onValueChange={(value) => updateSetting("defaultVoiceCharacter", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select voice character" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Scarlett - Professional</SelectItem>
                    <SelectItem value="drill-sergeant">Dan - Tough Motivator</SelectItem>
                    <SelectItem value="robot">Will - Robotic Assistant</SelectItem>
                    <SelectItem value="british-butler">Gerald - British Butler</SelectItem>
                    <SelectItem value="mom">Jane - Disappointed Mom</SelectItem>
                    <SelectItem value="confident-leader">Will - Executive Leader</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground text-center">
                  This will be the default voice for new reminders (you can still change it for each individual reminder)
                </div>
              </div>

              <Separator />

              {/* Auto-complete */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Auto-complete reminders</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically mark reminders as complete when interacted with
                  </p>
                </div>
                <Switch
                  checked={currentSettings.autoCompleteReminders || false}
                  onCheckedChange={(checked) => updateSetting("autoCompleteReminders", checked)}
                />
              </div>

              {/* Reminder Frequency */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Default Reminder Frequency</Label>
                <Select
                  value={currentSettings.reminderFrequency || "once"}
                  onValueChange={(value) => updateSetting("reminderFrequency", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">Once</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Language */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Language</Label>
                <Select
                  value={currentSettings.language || "en"}
                  onValueChange={(value) => updateSetting("language", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="it">Italiano</SelectItem>
                    <SelectItem value="pt">Português</SelectItem>
                    <SelectItem value="zh">中文</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Timezone */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Timezone</Label>
                <Select
                  value={currentSettings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
                  onValueChange={(value) => updateSetting("timezone", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    <SelectItem value="Europe/London">GMT (London)</SelectItem>
                    <SelectItem value="Europe/Paris">CET (Paris)</SelectItem>
                    <SelectItem value="Asia/Tokyo">JST (Tokyo)</SelectItem>
                    <SelectItem value="Asia/Shanghai">CST (Shanghai)</SelectItem>
                    <SelectItem value="Australia/Sydney">AEST (Sydney)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Appearance */}
      <Card>
        <Collapsible open={openSections.appearance} onOpenChange={() => toggleSection('appearance')}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Appearance
                </div>
                {openSections.appearance ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CardTitle>
              <p className="text-sm text-muted-foreground text-left">
                Customize the look and feel of your app
              </p>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* Theme */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Theme</Label>
                <Select
                  value={currentSettings.theme || "system"}
                  onValueChange={(value) => updateSetting("theme", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Alarm Sound */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Alarm Sound</Label>
                <p className="text-xs text-muted-foreground">
                  Choose a playful, non-jarring sound for your reminders
                </p>
                <Select
                  value={currentSettings.alarmSound || "gentle-chime"}
                  onValueChange={(value) => updateSetting("alarmSound", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select alarm sound" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gentle-chime">🎵 Gentle Chime</SelectItem>
                    <SelectItem value="soft-bell">🔔 Soft Bell</SelectItem>
                    <SelectItem value="water-drop">💧 Water Drop</SelectItem>
                    <SelectItem value="wind-chimes">🎐 Wind Chimes</SelectItem>
                    <SelectItem value="bird-chirp">🐦 Bird Chirp</SelectItem>
                    <SelectItem value="soft-piano">🎹 Soft Piano</SelectItem>
                    <SelectItem value="music-box">📦 Music Box</SelectItem>
                    <SelectItem value="ocean-wave">🌊 Ocean Wave</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => playAlarmPreview(currentSettings.alarmSound || "gentle-chime")}
                  >
                    Play Preview
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Simplified Interface */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Simplified Interface</Label>
                  <p className="text-xs text-muted-foreground">
                    Hide advanced options on the main page (voice characters, attachments, quotes)
                  </p>
                </div>
                <Switch
                  checked={currentSettings.simplifiedInterface || false}
                  onCheckedChange={(checked) => updateSetting("simplifiedInterface", checked)}
                />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Privacy & Security */}
      <Card>
        <Collapsible open={openSections.privacy} onOpenChange={() => toggleSection('privacy')}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Privacy & Security
                </div>
                {openSections.privacy ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CardTitle>
              <p className="text-sm text-muted-foreground text-left">
                Control your data privacy and security settings
              </p>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* Data Retention */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Data Retention Period</Label>
                <p className="text-sm text-muted-foreground">
                  How long to keep completed reminders and analytics data
                </p>
                <Select
                  value={currentSettings.dataRetention?.toString() || "90"}
                  onValueChange={(value) => updateSetting("dataRetention", parseInt(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select retention period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="180">6 months</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                    <SelectItem value="-1">Keep forever</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-red-600 dark:text-red-400">Danger Zone</h3>
                <div className="space-y-3 p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-950/20">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Clear All Data</Label>
                      <p className="text-xs text-muted-foreground">
                        Permanently delete all your reminders and settings
                      </p>
                    </div>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear Data
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <Collapsible open={openSections.advanced} onOpenChange={() => toggleSection('advanced')}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" />
                  Advanced Settings
                </div>
                {openSections.advanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CardTitle>
              <p className="text-sm text-muted-foreground text-left">
                Technical settings and data management
              </p>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* Export Data */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Export Data</Label>
                  <p className="text-xs text-muted-foreground">
                    Download all your reminder data and settings as JSON
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>

              <Separator />

              {/* App Version */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">App Information</Label>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Version: 2.1.0</p>
                  <p>Build: Mobile-Ready with Cultural Personalization</p>
                  <p>Platform: Web/iOS/Android</p>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Information Panel */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-1" />
            <div className="space-y-2">
              <h3 className="font-medium text-blue-900 dark:text-blue-100">
                Personalized Experience
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Your personal information helps us provide more relevant motivational quotes and culturally appropriate content. 
                We respect your privacy and only use this information to enhance your reminder experience.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button - Always visible but disabled when no changes */}
      <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4 -mx-6 -mb-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {hasChanges ? `${Object.keys(localSettings).length} unsaved changes` : "No changes to save"}
          </div>
          <Button
            onClick={saveSettings}
            disabled={updateSettingsMutation.isPending || !hasChanges}
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400"
          >
            {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}