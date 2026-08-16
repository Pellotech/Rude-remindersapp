import { useState, useEffect, useRef } from "react";
import SplashScreen from "@/components/SplashScreen";
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

  const [rudyFloatingOn, setRudyFloatingOn] = useState(
    () => localStorage.getItem('rudy_widget_visible') !== 'false'
  );

  const handleRudyFloatingToggle = (checked: boolean) => {
    setRudyFloatingOn(checked);
    localStorage.setItem('rudy_widget_visible', checked ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('rudy_widget_visibility_changed', { detail: checked }));
    updateSetting('rudyWidgetVisible', checked);
  };

  const [textSize, setTextSize] = useState<'default' | 'larger' | 'blind'>(
    () => (localStorage.getItem('text_size_preference') as 'default' | 'larger' | 'blind') || 'default'
  );

  const handleTextSizeChange = (size: 'default' | 'larger' | 'blind') => {
    setTextSize(size);
    localStorage.setItem('text_size_preference', size);
    window.dispatchEvent(new CustomEvent('text_size_changed', { detail: size }));
    updateSetting("textSize", size);
  };

  const [backdropTheme, setBackdropTheme] = useState<'light' | 'dark' | 'auto'>(
    () => (localStorage.getItem('backdrop_theme') as 'light' | 'dark' | 'auto') || 'light'
  );

  const handleBackdropThemeChange = (theme: 'light' | 'dark' | 'auto') => {
    setBackdropTheme(theme);
    localStorage.setItem('backdrop_theme', theme);
    window.dispatchEvent(new CustomEvent('backdrop_theme_changed', { detail: theme }));
    updateSetting("backdropTheme", theme);
  };

  const { data: user, isLoading } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  // The dropdown/toggle state above only reads localStorage on first mount,
  // so on a fresh device/reinstall (empty localStorage) it was showing the
  // hardcoded fallback instead of the value actually saved on the account.
  // Once the real user record loads, pull it in as the source of truth.
  useEffect(() => {
    if (!user) return;
    if (user.defaultRudenessLevel != null && user.defaultRudenessLevel !== defaultRudeness) {
      setDefaultRudeness(user.defaultRudenessLevel);
      localStorage.setItem('default_rudeness_level', String(user.defaultRudenessLevel));
    }
    if (user.defaultVoiceCharacter && user.defaultVoiceCharacter !== defaultVoice) {
      setDefaultVoice(user.defaultVoiceCharacter);
      localStorage.setItem('default_voice_character', user.defaultVoiceCharacter);
    }
  }, [user?.defaultRudenessLevel, user?.defaultVoiceCharacter]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      return apiRequest("/api/settings", { method: "PUT", body: settings as any });
    },
    onSuccess: () => {
      if (localSettings.textSize !== undefined) {
        localStorage.setItem('text_size_preference', localSettings.textSize);
        window.dispatchEvent(new CustomEvent('text_size_changed', { detail: localSettings.textSize }));
      }
      if (localSettings.backdropTheme !== undefined) {
        localStorage.setItem('backdrop_theme', localSettings.backdropTheme);
        window.dispatchEvent(new CustomEvent('backdrop_theme_changed', { detail: localSettings.backdropTheme }));
      }
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
      <SplashScreen />
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
                  <p className="text-white text-[17px]">Nice Rudy Banner</p>
                  <p className="text-[#8E8E93] text-[13px] mt-0.5">Switch the floating Rudy banner to encouraging comments only</p>
                </div>
                <Toggle checked={niceModeOn} onChange={handleNiceModeToggle} />
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-white text-[17px]">Floating Rudy</p>
                  <p className="text-[#8E8E93] text-[13px] mt-0.5">Show Rudy pinned to the top while scrolling</p>
                </div>
                <Toggle checked={rudyFloatingOn} onChange={handleRudyFloatingToggle} />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-[13px] text-[#8E8E93] uppercase tracking-wide px-4 mb-2">Text Size</h2>
            <div className="bg-[#1C1C1E] rounded-xl overflow-hidden">
              <div className="px-4 py-3">
                <p className="text-white text-[17px] mb-3">Notification Text Size</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['default', 'larger', 'blind'] as const).map((size) => {
                    const labels = { default: 'Regular', larger: 'Large', blind: 'Billboard 😜' };
                    const previews = { default: 'Aa', larger: 'Aa', blind: 'Aa' };
                    const fontSizes = { default: 16, larger: 20, blind: 24 };
                    const isSelected = textSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => handleTextSizeChange(size)}
                        style={{
                          flex: 1,
                          background: isSelected ? '#C9A063' : '#38383A',
                          border: isSelected ? '2px solid #C9A063' : '2px solid transparent',
                          borderRadius: 12,
                          padding: '10px 6px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 6,
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{
                          fontSize: fontSizes[size],
                          fontWeight: 600,
                          color: isSelected ? '#111827' : '#ffffff',
                          lineHeight: 1,
                        }}>{previews[size]}</span>
                        <span style={{
                          fontSize: 11,
                          color: isSelected ? '#111827' : '#8E8E93',
                          fontWeight: 500,
                        }}>{labels[size]}</span>
                      </button>
                    );
                  })}
                </div>
                <p style={{ fontSize: 12, color: '#8E8E93', marginTop: 8 }}>
                  Affects reminder notification text and message display size.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-[13px] text-[#8E8E93] uppercase tracking-wide px-4 mb-2">Appearance</h2>
            <div className="bg-[#1C1C1E] rounded-xl overflow-hidden">
              <div className="px-4 py-3">
                <p className="text-white text-[17px] mb-3">Backdrop</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['light', 'dark', 'auto'] as const).map((theme) => {
                    const labels = { light: 'Light', dark: 'Zero Dark Thirty', auto: 'Auto' };
                    const swatches = { light: '#ffffff', dark: '#000000', auto: 'linear-gradient(135deg, #ffffff 50%, #000000 50%)' };
                    const isSelected = backdropTheme === theme;
                    return (
                      <button
                        key={theme}
                        type="button"
                        onClick={() => handleBackdropThemeChange(theme)}
                        style={{
                          flex: 1,
                          background: isSelected ? '#C9A063' : '#38383A',
                          border: isSelected ? '2px solid #C9A063' : '2px solid transparent',
                          borderRadius: 12,
                          padding: '10px 6px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 6,
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: swatches[theme],
                          border: '1px solid #8E8E93',
                        }} />
                        <span style={{
                          fontSize: 11,
                          color: isSelected ? '#111827' : '#8E8E93',
                          fontWeight: 500,
                          textAlign: 'center',
                        }}>{labels[theme]}</span>
                      </button>
                    );
                  })}
                </div>
                <p style={{ fontSize: 12, color: '#8E8E93', marginTop: 8 }}>
                  Changes the plain background on the main screen only — cards, buttons, and the header stay the same. Auto follows your device's light/dark setting.
                </p>
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
