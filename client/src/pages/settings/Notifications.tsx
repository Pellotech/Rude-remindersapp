import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BackNavigation } from "@/components/BackNavigation";
import { Bell, Volume2, Mail, Smartphone, Clock } from "lucide-react";

export default function Notifications() {
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
        title: "Notification settings updated",
        description: "Your preferences have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update notification settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const [localSettings, setLocalSettings] = useState<any>({});

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
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
  };

  const hasChanges = Object.keys(localSettings).length > 0;
  const currentSettings = { ...user, ...localSettings };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <BackNavigation customBackPath="/settings" customBackLabel="Back to Settings" showMainPageButton={true} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Notification Preferences</h1>
          <p className="text-muted-foreground">Choose how you want to receive reminders</p>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Browser Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications directly in your browser
              </p>
            </div>
            <Switch
              checked={currentSettings.browserNotifications || false}
              onCheckedChange={(checked) => updateSetting("browserNotifications", checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Voice Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Voice Announcements</Label>
              <p className="text-sm text-muted-foreground">
                Have reminders read aloud with voice characters
              </p>
            </div>
            <Switch
              checked={currentSettings.voiceNotifications || false}
              onCheckedChange={(checked) => updateSetting("voiceNotifications", checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Receive reminder notifications via email
              </p>
            </div>
            <Switch
              checked={currentSettings.emailNotifications || false}
              onCheckedChange={(checked) => updateSetting("emailNotifications", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Daily Email Summary</Label>
              <p className="text-sm text-muted-foreground">
                Get a daily summary of your reminders and progress
              </p>
            </div>
            <Switch
              checked={currentSettings.emailSummary || false}
              onCheckedChange={(checked) => updateSetting("emailSummary", checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Reminder Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="defaultRudenessLevel">Default Rudeness Level</Label>
            <Select
              value={currentSettings.defaultRudenessLevel?.toString() || "3"}
              onValueChange={(value) => updateSetting("defaultRudenessLevel", parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">⭐ Gentle - Polite and encouraging</SelectItem>
                <SelectItem value="2">⭐⭐ Motivational - Supportive with energy</SelectItem>
                <SelectItem value="3">⭐⭐⭐ Direct - Straightforward reminders</SelectItem>
                <SelectItem value="4">⭐⭐⭐⭐ Assertive - Firm and persistent</SelectItem>
                <SelectItem value="5">⭐⭐⭐⭐⭐ Savage - No mercy, pure energy</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              This will be the default rudeness level for new reminders
            </p>
          </div>

          <div>
            <Label htmlFor="defaultVoiceCharacter">Default Voice Character</Label>
            <Select
              value={currentSettings.defaultVoiceCharacter || "default"}
              onValueChange={(value) => updateSetting("defaultVoiceCharacter", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default - Standard reminder voice</SelectItem>
                <SelectItem value="drill-sergeant">Drill Sergeant - Military-style motivation</SelectItem>
                <SelectItem value="robot">Robot - Robotic and direct</SelectItem>
                <SelectItem value="british-butler">British Butler - Polite and proper</SelectItem>
                <SelectItem value="mom">Mom - Caring but persistent</SelectItem>
                <SelectItem value="confident-leader">Confident Leader - Authoritative motivation</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              This will be the default voice character for new reminders
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Reminder Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="defaultRudenessLevel">Default Rudeness Level</Label>
            <Select
              value={currentSettings.defaultRudenessLevel?.toString() || "3"}
              onValueChange={(value) => updateSetting("defaultRudenessLevel", parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">⭐ Gentle - Polite and encouraging</SelectItem>
                <SelectItem value="2">⭐⭐ Motivational - Supportive with energy</SelectItem>
                <SelectItem value="3">⭐⭐⭐ Direct - Straightforward reminders</SelectItem>
                <SelectItem value="4">⭐⭐⭐⭐ Assertive - Firm and persistent</SelectItem>
                <SelectItem value="5">⭐⭐⭐⭐⭐ Savage - No mercy, pure energy</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              This will be the default rudeness level for new reminders
            </p>
          </div>

          <div>
            <Label htmlFor="defaultVoiceCharacter">Default Voice Character</Label>
            <Select
              value={currentSettings.defaultVoiceCharacter || "default"}
              onValueChange={(value) => updateSetting("defaultVoiceCharacter", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default - Standard reminder voice</SelectItem>
                <SelectItem value="drill-sergeant">Drill Sergeant - Military-style motivation</SelectItem>
                <SelectItem value="robot">Robot - Robotic and direct</SelectItem>
                <SelectItem value="british-butler">British Butler - Polite and proper</SelectItem>
                <SelectItem value="mom">Mom - Caring but persistent</SelectItem>
                <SelectItem value="confident-leader">Confident Leader - Authoritative motivation</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              This will be the default voice character for new reminders
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Gender-Specific AI Responses</Label>
              <p className="text-sm text-muted-foreground">
                {currentSettings.gender === 'male' 
                  ? 'Use terms like "Big guy", "Chief", "Sir", "Mr" in AI responses' 
                  : currentSettings.gender === 'female'
                  ? 'Use friendly, encouraging terms in AI responses'
                  : 'Use respectful, gender-neutral terms in AI responses'
                }
              </p>
            </div>
            <Switch
              checked={currentSettings.genderSpecificReminders || false}
              onCheckedChange={(checked) => updateSetting("genderSpecificReminders", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-muted-foreground">Cultural Motivational Quotes</Label>
              <p className="text-sm text-muted-foreground">
                Include culturally relevant quotes from historical figures (Not available right now)
              </p>
            </div>
            <Switch
              disabled={true}
              checked={false}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timing Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="snoozeTime">Snooze Duration (minutes)</Label>
            <Select
              value={currentSettings.snoozeTime?.toString() || "5"}
              onValueChange={(value) => updateSetting("snoozeTime", parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 minute</SelectItem>
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="10">10 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}