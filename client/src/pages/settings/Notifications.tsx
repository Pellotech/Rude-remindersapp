import { useState, useEffect } from "react";
import SplashScreen from "@/components/SplashScreen";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Home } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { getPlatformInfo } from "@/utils/platformDetection";
import { SaveBar, SAVE_BAR_SPACE, useLeaveGuard } from "@/components/UnsavedChanges";
import { applyTextSize, getTextSize, setTextSize, type TextSize } from "@/lib/textSize";
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

  // What's currently saved on this device (the app reads these). Nothing here changes
  // until the user taps Save — so Discard / "Don't Save" can always put things back.
  const readSaved = () => ({
    defaultRudenessLevel: parseInt(localStorage.getItem('default_rudeness_level') || '2'),
    defaultVoiceCharacter: localStorage.getItem('default_voice_character') || 'default',
    niceMode: localStorage.getItem('rudy_nice_mode') === 'true',
    rudyWidgetVisible: localStorage.getItem('rudy_widget_visible') === 'true',
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

  // Only the things the user actually changed (changing something back removes it)
  const [localSettings, setLocalSettings] = useState<Record<string, any>>({});
  const baseline: Record<string, any> = { ...(user || {}), ...saved };
  const currentSettings: Record<string, any> = { ...baseline, ...localSettings };
  const hasChanges = Object.keys(localSettings).length > 0;

  const updateSetting = (key: string, value: any) => {
    setLocalSettings((prev) => {
      const next = { ...prev };
      if (baseline[key] === value || (baseline[key] == null && value === false)) delete next[key];
      else next[key] = value;
      return next;
    });
  };

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
    if (changes.rudyWidgetVisible !== undefined) {
      localStorage.setItem('rudy_widget_visible', changes.rudyWidgetVisible ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent('rudy_widget_visibility_changed', { detail: changes.rudyWidgetVisible }));
    }
    if (changes.textSize !== undefined) {
      setTextSize(changes.textSize); // whole app + reminder popup
    }
    if (changes.backdropTheme !== undefined) {
      localStorage.setItem('backdrop_theme', changes.backdropTheme);
      window.dispatchEvent(new CustomEvent('backdrop_theme_changed', { detail: changes.backdropTheme }));
    }
  };

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Record<string, any>) => {
      // Text size is kept on the phone only — don't send it to the server
      const { textSize: _textSize, ...serverSettings } = settings;
      return apiRequest("/api/settings", { method: "PUT", body: serverSettings });
    },
    onSuccess: (_res, settings) => {
      applyLocally(settings);
      setSaved(readSaved());
      setLocalSettings({});
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Saved", description: "Your preferences have been updated." });
    },
    onError: () => {
      toast({ title: "Couldn't save", description: "Please check your connection and try again.", variant: "destructive" });
    },
  });

  const saveSettings = () => updateSettingsMutation.mutateAsync(localSettings);
  const discardChanges = () => {
    setLocalSettings({});
    void applyTextSize(saved.textSize); // undo the text size preview
  };

  // Text size: tapping a tile shows it straight away (a preview); Save keeps it
  const previewTextSize = (size: TextSize) => {
    updateSetting("textSize", size);
    void applyTextSize(size);
  };

  // Leaving without saving (any way out) puts the saved text size back
  useEffect(() => () => { void applyTextSize(); }, []);
  const { leave, dialog: leaveDialog } = useLeaveGuard(hasChanges, saveSettings, discardChanges);

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
            <button onClick={() => leave("/settings")} className="flex items-center text-ui-link" data-testid="button-back">
              <ChevronLeft className="h-5 w-5" />
              <span className="text-body-lg">Settings</span>
            </button>
            <button onClick={() => leave("/")} className="text-ui-link" data-testid="button-home" aria-label="Home">
              <Home className="h-5 w-5" />
            </button>
          </div>
          <h1 className="text-title-lg font-bold text-white px-4 pb-2">Notifications</h1>
        </div>

        <div className="py-6 px-4 space-y-8" style={{ paddingBottom: (isAndroid ? 120 : isIOS ? 80 : 24) + SAVE_BAR_SPACE }}>
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
                  <p className="text-white text-body-lg">Floating Reem</p>
                  <p className="text-ui-label-2 text-note mt-0.5">Reem follows you as you scroll — tap him to send him back</p>
                </div>
                <Toggle checked={!!currentSettings.rudyWidgetVisible} onChange={(v) => updateSetting("rudyWidgetVisible", v)} />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-note text-ui-label-2 uppercase tracking-wide px-4 mb-2">Text Size</h2>
            <div className="bg-ui-card rounded-xl overflow-hidden">
              <div className="px-4 py-3">
                <TextSizeTiles value={currentSettings.textSize} onChange={previewTextSize} />
                <p style={{ fontSize: 12, color: palette.uiLabel2, marginTop: 8 }}>
                  Makes the words bigger everywhere in the app, including your reminders. Tap one to see it, then press Save to keep it.
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
                    const labels = { light: 'Light', dark: 'Zero Dark Thirty', auto: 'Auto' };
                    const swatches = { light: '#ffffff', dark: '#000000', auto: 'linear-gradient(135deg, #ffffff 50%, #000000 50%)' };
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
                  Changes the plain background on the main screen only — cards, buttons, and the header stay the same. Auto follows your device's light/dark setting.
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
      <SaveBar visible={hasChanges} saving={updateSettingsMutation.isPending} onSave={() => { saveSettings().catch(() => {}); }} onDiscard={discardChanges} />
      {leaveDialog}
    </div>
  );
}
