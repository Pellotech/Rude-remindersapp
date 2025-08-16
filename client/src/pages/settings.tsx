import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User, Volume2, Bell, Mail, Users, Globe, UserCircle, Heart } from "lucide-react";

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
  
  const { data: user, isLoading } = useQuery<UserSettings>({
    queryKey: ["/api/auth/user"],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (settings: Partial<UserSettings>) =>
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

  const [localSettings, setLocalSettings] = useState<Partial<UserSettings>>({});

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

  const updateSetting = (key: keyof UserSettings, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
  };

  const saveSettings = () => {
    updateSettingsMutation.mutate(localSettings);
    setLocalSettings({});
  };

  const hasChanges = Object.keys(localSettings).length > 0;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="text-muted-foreground">Customize your reminder experience</p>
        </div>
        {hasChanges && (
          <Button 
            onClick={saveSettings} 
            disabled={updateSettingsMutation.isPending}
            className="bg-rude-red hover:bg-rude-red/90"
          >
            {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        )}
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5" />
            Personal Information
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Help us personalize your reminders and motivational content
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
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

          {/* Cultural Background */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Cultural Background</Label>
            <p className="text-sm text-muted-foreground">
              Choose your cultural background to receive motivational quotes from relevant historical figures and leaders
            </p>
            <Select
              value={currentSettings.ethnicity || ""}
              onValueChange={(value) => updateSetting("ethnicity", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select your cultural background" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {ethnicityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {currentSettings.ethnicity && (
              <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Cultural-specific motivational quotes</Label>
                  <p className="text-xs text-muted-foreground">
                    Receive quotes from historical figures and leaders from your cultural background
                  </p>
                </div>
                <Switch
                  checked={currentSettings.ethnicitySpecificQuotes || false}
                  onCheckedChange={(checked) => updateSetting("ethnicitySpecificQuotes", checked)}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Control how and when you receive reminder notifications
          </p>
        </CardHeader>
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
        </CardContent>
      </Card>

      {/* Rudeness Level */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Default Rudeness Level
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Set how brutally honest your reminders should be by default
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
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
        </CardContent>
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
    </div>
  );
}