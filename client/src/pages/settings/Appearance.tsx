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
import { Palette, Volume2, Eye } from "lucide-react";

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

export default function Appearance() {
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
        title: "Appearance settings updated",
        description: "Your preferences have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update appearance settings. Please try again.",
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

  const playAlarmPreview = (soundType: string) => {
    // Create a simple audio preview using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Different frequencies for different sounds
    const soundFreqs: { [key: string]: number } = {
      "gentle-chime": 523.25,     // C5
      "soft-bell": 659.25,       // E5
      "water-drop": 783.99,      // G5
      "wind-chimes": 440.00,     // A4
      "bird-chirp": 880.00,      // A5
      "soft-piano": 261.63,      // C4
      "music-box": 1046.50,      // C6
      "ocean-wave": 196.00,      // G3
    };

    oscillator.frequency.setValueAtTime(soundFreqs[soundType] || 440, audioContext.currentTime);
    oscillator.type = soundType.includes("chime") || soundType.includes("bell") ? "sine" : "triangle";

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.8);

    toast({
      title: "🔊 Playing preview",
      description: `${alarmSoundOptions.find(opt => opt.value === soundType)?.label}`,
    });
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Appearance</h1>
          <p className="text-muted-foreground">Customize your app's look and feel</p>
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
            <Palette className="h-5 w-5" />
            Theme Selection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="theme">Color Theme</Label>
            <Select
              value={currentSettings.theme || "system"}
              onValueChange={(value) => updateSetting("theme", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light Mode</SelectItem>
                <SelectItem value="dark">Dark Mode</SelectItem>
                <SelectItem value="system">System Default</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Interface Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Simplified Interface</Label>
              <p className="text-sm text-muted-foreground">
                Hide advanced features and show only essential options
              </p>
            </div>
            <Switch
              checked={currentSettings.simplifiedInterface || false}
              onCheckedChange={(checked) => updateSetting("simplifiedInterface", checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Alarm Sound
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="alarmSound">Sound Selection</Label>
            <Select
              value={currentSettings.alarmSound || "gentle-chime"}
              onValueChange={(value) => updateSetting("alarmSound", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {alarmSoundOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            {alarmSoundOptions.map((option) => (
              <Button
                key={option.value}
                variant="outline"
                size="sm"
                onClick={() => playAlarmPreview(option.value)}
                className="text-xs"
              >
                Play {option.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}