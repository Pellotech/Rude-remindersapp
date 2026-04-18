import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { ChevronLeft, Home } from "lucide-react";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-[51px] h-[31px] rounded-full transition-colors ${
        checked ? 'bg-[#34C759]' : 'bg-[#39393D]'
      }`}
    >
      <div
        className={`absolute top-[2px] w-[27px] h-[27px] bg-white rounded-full shadow transition-transform ${
          checked ? 'translate-x-[22px]' : 'translate-x-[2px]'
        }`}
      />
    </button>
  );
}

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

  const [niceModeOn, setNiceModeOn] = useState(
    () => localStorage.getItem('rudy_nice_mode') === 'true'
  );

  const handleNiceModeToggle = (checked: boolean) => {
    setNiceModeOn(checked);
    localStorage.setItem('rudy_nice_mode', checked ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('rudy_nice_mode_changed', { detail: checked }));
  };
  
  const { data: user, isLoading } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  useEffect(() => {
    if ((user as any)?.niceMode !== undefined) {
      setNiceModeOn((user as any).niceMode);
      localStorage.setItem('rudy_nice_mode', (user as any).niceMode ? 'true' : 'false');
    }
  }, [(user as any)?.niceMode]);

  const updateSettingsMutation = useMutation({
    mutationFn: (settings: any) =>
      apiRequest("/api/settings", "PUT", settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
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
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const soundFreqs: { [key: string]: number } = {
      "gentle-chime": 523.25,
      "soft-bell": 659.25,
      "water-drop": 783.99,
      "wind-chimes": 440.00,
      "bird-chirp": 880.00,
      "soft-piano": 261.63,
      "music-box": 1046.50,
      "ocean-wave": 196.00,
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
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
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
          <h1 className="text-[34px] font-bold text-white px-4 pb-2">Appearance</h1>
        </div>

        <div className="py-6 px-4 space-y-8">
          <div>
            <h2 className="text-[13px] text-[#8E8E93] uppercase tracking-wide px-4 mb-2">Theme</h2>
            <div className="bg-[#1C1C1E] rounded-xl overflow-hidden">
              <div className="px-4 py-3">
                <label className="text-[13px] text-[#8E8E93] uppercase tracking-wide">Color Theme</label>
                <select
                  value={currentSettings.theme || "system"}
                  onChange={(e) => updateSetting("theme", e.target.value)}
                  className="w-full bg-transparent text-white text-[17px] mt-1 outline-none"
                  data-testid="select-theme"
                >
                  <option value="light" className="bg-black text-white">Light Mode</option>
                  <option value="dark" className="bg-black text-white">Dark Mode</option>
                  <option value="system" className="bg-black text-white">System Default</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-[13px] text-[#8E8E93] uppercase tracking-wide px-4 mb-2">Alarm Sound</h2>
            <div className="bg-[#1C1C1E] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#38383A]">
                <label className="text-[13px] text-[#8E8E93] uppercase tracking-wide">Sound Selection</label>
                <select
                  value={currentSettings.alarmSound || "gentle-chime"}
                  onChange={(e) => updateSetting("alarmSound", e.target.value)}
                  className="w-full bg-transparent text-white text-[17px] mt-1 outline-none"
                  data-testid="select-alarm-sound"
                >
                  {alarmSoundOptions.map((option) => (
                    <option key={option.value} value={option.value} className="bg-black text-white">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="px-4 py-3">
                <p className="text-white text-[17px] mb-3">Preview Sounds</p>
                <div className="grid grid-cols-2 gap-2">
                  {alarmSoundOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => playAlarmPreview(option.value)}
                      className="bg-[#38383A] text-white text-[13px] py-2 px-3 rounded-lg active:bg-[#48484A]"
                      data-testid={`button-play-${option.value}`}
                    >
                      Play {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-[13px] text-[#8E8E93] uppercase tracking-wide px-4 mb-2">Rudy Behaviour</h2>
            <div className="bg-[#1C1C1E] rounded-xl overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-white text-[17px]">Nice Rudy Mode</p>
                  <p className="text-[#8E8E93] text-[13px] mt-0.5">Switch Rudy to encouraging comments only</p>
                </div>
                <Toggle checked={niceModeOn} onChange={handleNiceModeToggle} />
              </div>
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
