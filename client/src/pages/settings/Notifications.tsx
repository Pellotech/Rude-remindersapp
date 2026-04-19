import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Home } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { getPlatformInfo } from "@/utils/platformDetection";

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

export default function Notifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAndroid, isIOS } = getPlatformInfo();

  const [defaultRudeness, setDefaultRudeness] = useState(
    () => parseInt(localStorage.getItem('default_rudeness_level') || '2')
  );

  const handleDefaultRudenessChange = (value: string) => {
    const level = Number(value);
    setDefaultRudeness(level);
    localStorage.setItem('default_rudeness_level', String(level));
    window.dispatchEvent(new CustomEvent('default_rudeness_changed', { detail: level }));
    updateSetting('defaultRudenessLevel', level);
  };

  const [defaultVoice, setDefaultVoice] = useState(
    () => localStorage.getItem('default_voice_character') || 'default'
  );

  const handleDefaultVoiceChange = (value: string) => {
    setDefaultVoice(value);
    localStorage.setItem('default_voice_character', value);
    window.dispatchEvent(new CustomEvent('default_voice_changed', { detail: value }));
    updateSetting('defaultVoiceCharacter', value);
  };

  const [niceModeOn, setNiceModeOn] = useState(
    () => localStorage.getItem('rudy_nice_mode') === 'true'
  );

  const handleNiceModeToggle = (checked: boolean) => {
    setNiceModeOn(checked);
    localStorage.setItem('rudy_nice_mode', checked ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('rudy_nice_mode_changed', { detail: checked }));
    updateSetting('niceMode', checked);
  };

  const { data: user, isLoading } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      return apiRequest("/api/settings", { method: "PUT", body: settings as any });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocalSettings({});
      toast({
        title: "Saved",
        description: "Your preferences have been updated.",
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
  const saveButtonRef = useRef<HTMLDivElement>(null);
  const prevHasChanges = useRef(false);

  useEffect(() => {
    if (user) {
      setLocalSettings({});
    }
  }, [user]);

  const saveSettings = () => {
    updateSettingsMutation.mutate(localSettings);
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
        // After scrollIntoView lands the button at viewport bottom, push the page
        // further down so the button rises above the ad banner + nav bar.
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
          <h1 className="text-[34px] font-bold text-white px-4 pb-2">Notifications</h1>
        </div>

        <div className="py-6 px-4 space-y-8" style={{ paddingBottom: isAndroid ? '120px' : isIOS ? '80px' : '24px' }}>
          <div>
            <h2 className="text-[13px] text-[#8E8E93] uppercase tracking-wide px-4 mb-2">Preferences</h2>
            <div className="bg-[#1C1C1E] rounded-xl overflow-hidden divide-y divide-[#38383A]">
              <div className="px-4 py-3">
                <div className="mb-2">
                  <p className="text-white text-[17px]">Default Rudeness Level</p>
                  <p className="text-[#8E8E93] text-[13px] mt-0.5">Your reminder slider starts here every time</p>
                </div>
                <select
                  value={defaultRudeness}
                  onChange={(e) => handleDefaultRudenessChange(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#2C2C2E',
                    color: 'white',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    fontSize: '15px',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value={1}>1 — 😊 Gentle</option>
                  <option value={2}>2 — 🙂 Motivational</option>
                  <option value={3}>3 — 😏 Sarcastic</option>
                  <option value={4}>4 — 😤 Harsh</option>
                  <option value={5}>5 — 🤬 Savage</option>
                </select>
              </div>
              <div className="px-4 py-3">
                <div className="mb-2">
                  <p className="text-white text-[17px]">Default Voice Character</p>
                  <p className="text-[#8E8E93] text-[13px] mt-0.5">Voice used when reading your reminders aloud</p>
                </div>
                <select
                  value={defaultVoice}
                  onChange={(e) => handleDefaultVoiceChange(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#2C2C2E',
                    color: 'white',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    fontSize: '15px',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="default">Scarlett (Free)</option>
                  <option value="confident-leader">Will (Premium)</option>
                  <option value="british-butler">Gerald (Premium)</option>
                  <option value="karen-nag">Karen (Premium)</option>
                </select>
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-white text-[17px]">Nice Rudy Mode</p>
                  <p className="text-[#8E8E93] text-[13px] mt-0.5">Switch Rudy to encouraging comments only</p>
                </div>
                <Toggle checked={niceModeOn} onChange={handleNiceModeToggle} />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-[13px] text-[#8E8E93] uppercase tracking-wide px-4 mb-2">Push Notifications</h2>
            <div className="bg-[#1C1C1E] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-white text-[17px]">Browser Notifications</span>
                <Toggle
                  checked={currentSettings.browserNotifications || false}
                  onChange={(checked) => updateSetting("browserNotifications", checked)}
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-[13px] text-[#8E8E93] uppercase tracking-wide px-4 mb-2">Playback</h2>
            <div className="bg-[#1C1C1E] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-white text-[17px]">Voice Announcements</span>
                <Toggle
                  checked={currentSettings.voiceNotifications || false}
                  onChange={(checked) => updateSetting("voiceNotifications", checked)}
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-[13px] text-[#8E8E93] uppercase tracking-wide px-4 mb-2">Email</h2>
            <div className="bg-[#1C1C1E] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-white text-[17px]">Notify me by Email</span>
                <Toggle
                  checked={currentSettings.emailNotifications || false}
                  onChange={(checked) => updateSetting("emailNotifications", checked)}
                />
              </div>
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
        </div>
      </div>
    </div>
  );
}
