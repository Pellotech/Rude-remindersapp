import { useState, useEffect } from "react";
import SplashScreen from "@/components/SplashScreen";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Home } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { getPlatformInfo } from "@/utils/platformDetection";
import { useLocation } from "wouter";
import { getTextSize, setTextSize, type TextSize } from "@/lib/textSize";
import { TextSizeTiles } from "@/components/settings/TextSizeTiles";

import { palette } from "@/lib/theme";
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

  // What's saved on this device (the app reads these). Every change on this page
  // saves straight away — there's no Save button.
  const readSaved = () => ({
    defaultRudenessLevel: parseInt(localStorage.getItem('default_rudeness_level') || '2'),
    defaultVoiceCharacter: localStorage.getItem('default_voice_character') || 'default',
    niceMode: localStorage.getItem('rudy_nice_mode') === 'true',
    reemPopIn: localStorage.getItem('reem_pop_in') !== 'false', // on unless turned off
    backdropTheme: ((localStorage.getItem('backdrop_theme') as 'light' | 'dark' | 'auto') || 'light'),
    textSize: getTextSize() as TextSize, // phone-only; same setting as Text Size & Time Zone
  });
  const [saved, setSaved] = useState(readSaved);

  const { data: user, isLoading } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  // A fresh device/reinstall has empty localStorage — take the account's saved
  // defaults as the starting point once the user record loads.
  useEffect(() => {
    if (!user) return;
    const next = { ...saved };
    if (user.defaultRudenessLevel != null) next.defaultRudenessLevel = user.defaultRudenessLevel;
    if (user.defaultVoiceCharacter) next.defaultVoiceCharacter = user.defaultVoiceCharacter;
    localStorage.setItem('default_rudeness_level', String(next.defaultRudenessLevel));
    localStorage.setItem('default_voice_character', next.defaultVoiceCharacter);
    setSaved(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.defaultRudenessLevel, user?.defaultVoiceCharacter]);

  // Changes made on this page so far (already saved — shown on top of the saved values)
  const [changed, setChanged] = useState<Record<string, any>>({});
  const currentSettings: Record<string, any> = { ...(user || {}), ...saved, ...changed };

  // Push saved values to the rest of the app (reminder form, Reem, pop-ups, theme)
  const applyLocally = (changes: Record<string, any>) => {
    if (changes.defaultRudenessLevel !== undefined) {
      localStorage.setItem('default_rudeness_level', String(changes.defaultRudenessLevel));
      window.dispatchEvent(new CustomEvent('default_rudeness_changed', { detail: changes.defaultRudenessLevel }));
    }
    if (changes.defaultVoiceCharacter !== undefined) {
      localStorage.setItem('default_voice_character', changes.defaultVoiceCharacter);
      window.dispatchEvent(new CustomEvent('default_voice_changed', { detail: changes.defaultVoiceCharacter }));
    }
    if (changes.niceMode !== undefined) {
      localStorage.setItem('rudy_nice_mode', changes.niceMode ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent('rudy_nice_mode_changed', { detail: changes.niceMode }));
    }
    if (changes.reemPopIn !== undefined) {
      localStorage.setItem('reem_pop_in', changes.reemPopIn ? 'true' : 'false');
    }
    if (changes.textSize !== undefined) {
      setTextSize(changes.textSize); // whole app + reminder popup
    }
    if (changes.backdropTheme !== undefined) {
      localStorage.setItem('backdrop_theme', changes.backdropTheme);
      window.dispatchEvent(new CustomEvent('backdrop_theme_changed', { detail: changes.backdropTheme }));
    }
  };

  // Save one setting to the account. If it fails, put it back and say so.
  const updateSettingsMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any; previous: any }) =>
      apiRequest("/api/settings", { method: "PUT", body: { [key]: value } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (_error, { key, previous }) => {
      applyLocally({ [key]: previous });
      setChanged((prev) => ({ ...prev, [key]: previous }));
      toast({ title: "Couldn't save", description: "Please check your connection and try again.", variant: "destructive" });
    },
  });

  // Every change applies and saves straight away (like iPhone Settings)
  const updateSetting = (key: string, value: any) => {
    const previous = currentSettings[key];
    if (previous === value) return;
    setChanged((prev) => ({ ...prev, [key]: value }));
    applyLocally({ [key]: value });          // the app uses it right away
    if (key === "textSize") return;          // text size is kept on the phone only
    updateSettingsMutation.mutate({ key, value, previous });
  };

  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <SplashScreen />
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-lg mx-auto">
        <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-ui-separator safe-area-header">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => setLocation("/settings")} className="flex items-center text-ui-link" data-testid="button-back">
              <ChevronLeft className="h-5 w-5" />
              <span className="text-body-lg">Settings</span>
            </button>
            <button onClick={() => setLocation("/")} className="text-ui-link" data-testid="button-home" aria-label="Home">
              <Home className="h-5 w-5" />
            </button>
          </div>
          <h1 className="text-title-lg font-bold text-white px-4">Notifications</h1>
          <p className="text-note text-ui-label-2 px-4 pb-2">Changes save automatically.</p>
        </div>

        <div className="py-6 px-4 space-y-8" style={{ paddingBottom: isAndroid ? 120 : isIOS ? 80 : 24 }}>
          <div>
            <h2 className="text-note text-ui-label-2 uppercase tracking-wide px-4 mb-2">Preferences</h2>
            <div className="bg-ui-card rounded-xl overflow-hidden divide-y divide-ui-separator">
              <div className="px-4 py-3">
                <div className="mb-2">
                  <p className="text-white text-body-lg">Default Rudeness Level</p>
                  <p className="text-ui-label-2 text-note mt-0.5">Your reminder slider starts here every time</p>
                </div>
                <select
                  value={currentSettings.defaultRudenessLevel}
                  onChange={(e) => updateSetting("defaultRudenessLevel", Number(e.target.value))}
                  style={{
                    width: '100%',
                    background: palette.uiRaised,
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
                  <option value={1}>1 — 🤗 Sympathy</option>
                  <option value={2}>2 — 🙂 Motivational</option>
                  <option value={3}>3 — 😏 Sarcastic</option>
                  <option value={4}>4 — 😤 Harsh</option>
                  <option value={5}>5 — 🤬 Savage</option>
                </select>
              </div>
              <div className="px-4 py-3">
                <div className="mb-2">
                  <p className="text-white text-body-lg">Default Voice Character</p>
                  <p className="text-ui-label-2 text-note mt-0.5">Voice used when reading your reminders aloud</p>
                </div>
                <select
                  value={currentSettings.defaultVoiceCharacter}
                  onChange={(e) => updateSetting("defaultVoiceCharacter", e.target.value)}
                  style={{
                    width: '100%',
                    background: palette.uiRaised,
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
                  <p className="text-white text-body-lg">Nice Reem Mode</p>
                  <p className="text-ui-label-2 text-note mt-0.5">Reem only says encouraging things — no roasts</p>
                </div>
                <Toggle checked={!!currentSettings.niceMode} onChange={(v) => updateSetting("niceMode", v)} />
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-white text-body-lg">Reem Walks In</p>
                  <p className="text-ui-label-2 text-note mt-0.5">Reem walks in from the side to react when you tap things. Off: he stays sitting on the banner (tap him to talk).</p>
                </div>
                <Toggle checked={!!currentSettings.reemPopIn} onChange={(v) => updateSetting("reemPopIn", v)} />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-note text-ui-label-2 uppercase tracking-wide px-4 mb-2">Text Size</h2>
            <div className="bg-ui-card rounded-xl overflow-hidden">
              <div className="px-4 py-3">
                <TextSizeTiles value={currentSettings.textSize} onChange={(size) => updateSetting("textSize", size)} />
                <p style={{ fontSize: 12, color: palette.uiLabel2, marginTop: 8 }}>
                  Makes the words bigger everywhere in the app, including your reminders.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-note text-ui-label-2 uppercase tracking-wide px-4 mb-2">Appearance</h2>
            <div className="bg-ui-card rounded-xl overflow-hidden">
              <div className="px-4 py-3">
                <p className="text-white text-body-lg mb-3">Backdrop</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['light', 'dark', 'auto'] as const).map((theme) => {
                    const labels = { light: 'Light', dark: 'Concrete Grey', auto: 'Auto' };
                    const swatches = { light: '#ffffff', dark: palette.concreteWall, auto: `linear-gradient(135deg, #ffffff 50%, ${palette.concreteWall} 50%)` };
                    const isSelected = currentSettings.backdropTheme === theme;
                    return (
                      <button
                        key={theme}
                        type="button"
                        onClick={() => updateSetting("backdropTheme", theme)}
                        style={{
                          flex: 1,
                          background: isSelected ? palette.gold : palette.uiSeparator,
                          border: isSelected ? `2px solid ${palette.gold}` : '2px solid transparent',
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
                          border: `1px solid ${palette.uiLabel2}`,
                        }} />
                        <span style={{
                          fontSize: 11,
                          color: isSelected ? palette.ink : palette.uiLabel2,
                          fontWeight: 500,
                          textAlign: 'center',
                        }}>{labels[theme]}</span>
                      </button>
                    );
                  })}
                </div>
                <p style={{ fontSize: 12, color: palette.uiLabel2, marginTop: 8 }}>
                  Concrete Grey gives the main screen a dark grey background, blue cards and a light grey banner. Auto switches to Concrete Grey from 7 PM to 7 AM, using your time zone.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-note text-ui-label-2 uppercase tracking-wide px-4 mb-2">Push Notifications</h2>
            <div className="bg-ui-card rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-white text-body-lg">Browser Notifications</span>
                <Toggle
                  checked={currentSettings.browserNotifications || false}
                  onChange={(checked) => updateSetting("browserNotifications", checked)}
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-note text-ui-label-2 uppercase tracking-wide px-4 mb-2">Playback</h2>
            <div className="bg-ui-card rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-white text-body-lg">Voice Announcements</span>
                <Toggle
                  checked={currentSettings.voiceNotifications || false}
                  onChange={(checked) => updateSetting("voiceNotifications", checked)}
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-note text-ui-label-2 uppercase tracking-wide px-4 mb-2">Email</h2>
            <div className="bg-ui-card rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-white text-body-lg">Notify me by Email</span>
                <Toggle
                  checked={currentSettings.emailNotifications || false}
                  onChange={(checked) => updateSetting("emailNotifications", checked)}
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
