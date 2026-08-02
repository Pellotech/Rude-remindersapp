import { useState, useEffect, useRef } from "react";
import { getPlatformInfo } from "@/utils/platformDetection";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  TrendingUp,
  Calendar,
  MessageSquare,
  CheckCircle,
  Camera,
  Target,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import ReminderForm from "@/components/ReminderForm";
import RemindersList from "@/components/RemindersList";
import { RichReminderNotification } from "@/components/RichReminderNotification";
import { HelpMenu } from "@/components/HelpMenu";
import { NotificationTest } from "@/components/NotificationTest";
import { AdMobManager } from "@/components/AdMobManager";
import RudyWidget, { RudyEventType } from "@/components/RudyWidget";
import { RudenessSlider } from "@/components/RudenessSlider";
import { AnalyticsPanel } from "@/components/AnalyticsPanel";
import { MotivationalPopup } from "@/components/MotivationalPopup";
import { IntroTour, useIntroTour } from "@/components/IntroTour";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Reminder } from "@shared/schema";

function findPreferredVoice(voices: SpeechSynthesisVoice[], voiceType: string): SpeechSynthesisVoice | undefined {
  if (voiceType === 'british-male') {
    return voices.find(v => v.name.includes('Google UK English Male')) ||
      voices.find(v => v.lang.includes('en-GB') && (v.name.toLowerCase().includes('male') || v.name.includes('Oliver') || v.name.includes('Arthur'))) ||
      voices.find(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('man'));
  }
  if (voiceType === 'male') {
    return voices.find(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('man') || v.name.includes('David') || v.name.includes('Daniel'));
  }
  if (voiceType === 'female') {
    return voices.find(v => v.name.includes('Google US English') && v.name.includes('Female')) ||
      voices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman') || v.name.includes('Samantha') || v.name.includes('Victoria'));
  }
  return voices.find(v => v.lang.includes('en'));
}


export default function HomePremium() {
  const { isAndroid } = getPlatformInfo();
  const { user } = useAuth();
  const { toast } = useToast();
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [currentReminder, setCurrentReminder] = useState<Reminder | null>(null);
  const [showRichNotification, setShowRichNotification] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [showCreateTooltip, setShowCreateTooltip] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (localStorage.getItem('create_form_tooltip_seen')) return false;
    let firstSeen = localStorage.getItem('create_form_tooltip_first_seen_at');
    if (!firstSeen) {
      firstSeen = String(Date.now());
      localStorage.setItem('create_form_tooltip_first_seen_at', firstSeen);
    }
    if (Date.now() - parseInt(firstSeen, 10) > 3 * 24 * 60 * 60 * 1000) {
      localStorage.setItem('create_form_tooltip_seen', 'true');
      return false;
    }
    return true;
  });

  // Dynamic badge color based on rudeness level
  const rudeLevelColors: Record<number, string> = {
    1: '#38BDF8', // Sky blue — Gentle
    2: '#22C55E', // Green — Motivational
    3: '#FDE047', // Sunshine yellow — Sarcastic
    4: '#F97316', // Orange — Harsh
    5: '#b70d0d', // Red — Savage
  };
  const [badgeRudenessLevel, setBadgeRudenessLevel] = useState<number>(
    (user as any)?.defaultRudenessLevel || parseInt(localStorage.getItem('default_rudeness_level') || '2')
  );
  const badgeColor = rudeLevelColors[badgeRudenessLevel] ?? rudeLevelColors[3];
  const badgeTextColor = [1, 3].includes(badgeRudenessLevel) ? '#111827' : '#FFFFFF';
  const [lastEvent, setLastEvent] = useState<RudyEventType>(null);
  const [eventKey, setEventKey] = useState(0);
  const fireEvent = (e: RudyEventType) => { console.log('[home-premium] fireEvent:', e); setLastEvent(e); setEventKey(k => k + 1); };
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFiredCreatingRef = useRef(false);
  const [activeTab, setActiveTab] = useState("create");
  // Sync badge level when user data loads (it's async)
  useEffect(() => {
    if ((user as any)?.defaultRudenessLevel) {
      setBadgeRudenessLevel((user as any).defaultRudenessLevel);
    }
  }, [(user as any)?.defaultRudenessLevel]);

  // Live-sync badge level when default changes from settings page
  useEffect(() => {
    const handler = (e: Event) => {
      setBadgeRudenessLevel((e as CustomEvent).detail);
    };
    window.addEventListener('default_rudeness_changed', handler);
    return () => window.removeEventListener('default_rudeness_changed', handler);
  }, []);

  // Watch badgeRudenessLevel — only fires when value actually changes, never on mount
  const sliderRudyRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevRudenessRef = useRef<number>(badgeRudenessLevel);

  const rudyRef = useRef<HTMLDivElement>(null);
  const [rudySticky, setRudySticky] = useState(false);
  const [rudyFloatingEnabled, setRudyFloatingEnabled] = useState(
    () => localStorage.getItem('rudy_widget_visible') !== 'false'
  );

  useEffect(() => {
    const handler = (e: Event) => {
      setRudyFloatingEnabled((e as CustomEvent).detail);
    };
    window.addEventListener('rudy_widget_visibility_changed', handler);
    return () => window.removeEventListener('rudy_widget_visibility_changed', handler);
  }, []);

  useEffect(() => {
    if (badgeRudenessLevel === prevRudenessRef.current) return;
    prevRudenessRef.current = badgeRudenessLevel;
    if (sliderRudyRef.current) clearTimeout(sliderRudyRef.current);
    sliderRudyRef.current = setTimeout(() => {
      setLastEvent(`slider_${badgeRudenessLevel}` as RudyEventType);
      setEventKey(k => k + 1);
    }, 800);
  }, [badgeRudenessLevel]);

  useEffect(() => {
    if (!rudyRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setRudySticky(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-60px 0px 0px 0px' }
    );
    observer.observe(rudyRef.current);
    return () => observer.disconnect();
  }, []);

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ["/api/reminders"],
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: voices = [] } = useQuery({
    queryKey: ["/api/voices"],
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log("Connected to WebSocket");
        setWsConnection(socket);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "reminder" || data.type === "browser_notification") {
            const { reminder } = data;

            // Set the current reminder and show rich notification
            setCurrentReminder(reminder);
            setShowRichNotification(true);

            // Show browser notification if enabled (as fallback)
            if (reminder.browserNotification && "Notification" in window) {
              if (Notification.permission === "granted") {
                const notificationBody = reminder.motivationalQuote 
                  ? `${reminder.rudeMessage}\n\n💪 ${reminder.motivationalQuote}`
                  : reminder.rudeMessage;

                new Notification(`Rude Reminder: ${reminder.title}`, {
                  body: notificationBody,
                  icon: "/favicon.ico",
                });
              }
            }

            // Play voice notification if enabled
            if (reminder.voiceNotification) {
              const voiceText = reminder.responses && reminder.responses.length > 0
                ? reminder.responses.slice(0, 2).join(' ... ')
                : reminder.rudeMessage;
              import('@/services/ttsService').then(({ speak }) => {
                speak(voiceText, reminder.voiceCharacter || 'default');
              });
            }
          }
        } catch (error) {
          console.error("WebSocket message error:", error);
        }
      };

      socket.onclose = () => {
        console.log("Disconnected from WebSocket");
        setWsConnection(null);
      };

      return () => {
        socket.close();
      };
    }
  }, [toast]);

  // Voice playback handler for premium
  const handleVoicePlay = () => {
    if (!currentReminder?.rudeMessage) return;

    setIsPlayingVoice(true);

    const voiceText = currentReminder.responses && currentReminder.responses.length > 0
      ? currentReminder.responses.slice(0, 2).join(' ... ')
      : currentReminder.rudeMessage;

    import('@/services/ttsService').then(({ speakWithCallback }) => {
      speakWithCallback(voiceText, currentReminder.voiceCharacter || 'default', () => setIsPlayingVoice(false), () => setIsPlayingVoice(false));
    }).catch(() => {
      setIsPlayingVoice(false);
    });
  };

  // Complete reminder handler
  const handleCompleteReminder = async () => {
    if (!currentReminder) return;
    try {
      await apiRequest(`/api/reminders/${currentReminder.id}/complete`, { method: 'PATCH' });
      queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
      setShowRichNotification(false);
      setCurrentReminder(null);
      toast({
        title: "Nice work! ✅",
        description: "Logged! This reminder will clear in 24 hours.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark reminder as complete",
        variant: "destructive",
      });
    }
  };

  // Missed reminder handler
  const handleMissedReminder = async () => {
    if (!currentReminder) return;
    try {
      await apiRequest(`/api/reminders/${currentReminder.id}/not-accomplished`, { method: 'PATCH' });
      queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
      setShowRichNotification(false);
      setCurrentReminder(null);
      toast({
        title: "Logged 💪",
        description: "Tomorrow is a new chance. This reminder clears in 24 hours.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log reminder",
        variant: "destructive",
      });
    }
  };

  const activeReminders = (reminders as any[]).filter((r: any) => !r.completed);
  const completedToday = (reminders as any[]).filter((r: any) => 
    r.completed && 
    new Date(r.completedAt).toDateString() === new Date().toDateString()
  );



  const { showIntro, closeIntro } = useIntroTour();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <IntroTour isOpen={showIntro} onClose={closeIntro} />
      <MotivationalPopup
        userName={user?.firstName || user?.username || "there"}
        blocked={showIntro || !!(currentReminder && showRichNotification)}
      />
      <Navigation />

      <div
        className="container mx-auto px-4 md:px-[20%] pt-8 max-w-7xl"
        style={{ paddingBottom: isAndroid ? '120px' : '80px' }}
      >
        {/* Welcome Header - Mobile Optimized */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-1 flex flex-wrap items-center gap-2">
                <span className="truncate">Hey {user?.firstName || user?.username || 'there'}</span>
                <Badge
                  className="text-xs flex-shrink-0"
                  style={{
                    backgroundColor: badgeColor,
                    color: badgeTextColor,
                    transition: 'background-color 0.3s ease, color 0.3s ease',
                  }}
                >
                  Premium 👑
                </Badge>
              </h1>
            </div>
          </div>
          <div ref={rudyRef} style={{ height: rudySticky ? '120px' : 'auto' }}>
            {!rudySticky && (
              <RudyWidget
                nudgeEvent={lastEvent}
                nudgeKey={eventKey}
                onNudgeHandled={() => setLastEvent(null)}
                borderColor={badgeColor}
              />
            )}
          </div>
          {rudySticky && rudyFloatingEnabled && (
            <div
              className="fixed top-[60px] left-0 right-0 z-50 px-4 md:px-[20%]"
              style={{
                backgroundColor: 'transparent',
                transition: 'transform 0.2s ease, opacity 0.2s ease',
                animation: 'rudySlideIn 0.2s ease',
                pointerEvents: 'none',
              }}>
              <div style={{ pointerEvents: 'auto' }}>
                <RudyWidget
                  nudgeEvent={lastEvent}
                  nudgeKey={eventKey}
                  onNudgeHandled={() => setLastEvent(null)}
                  borderColor={badgeColor}
                />
              </div>
            </div>
          )}
        </div>

        {/* Rudeness slider — page-level, sits right below Rudy */}
        <RudenessSlider
          value={badgeRudenessLevel}
          onChange={setBadgeRudenessLevel}
        />

        {/* Main Content Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v);
            if (v === "manage") fireEvent("manage_load");
            if (v === "analytics") fireEvent("analytics_this_week");
          }}
          className="space-y-6"
        >
          {/* One-time first-timer tip — same style as Manage/Analytics tooltips, persists dismissed */}
          {showCreateTooltip && (
            <div style={{
              background: 'white',
              border: '2px solid #C9A063',
              borderRadius: '12px',
              padding: '10px 12px',
              fontSize: '11px',
              color: '#333',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              position: 'relative',
            }} data-testid="card-create-tooltip">
              <img
                src="/rudy/Rudy_leaning_2_transparent.png"
                alt="Rudy"
                style={{ width: 36, height: 36, mixBlendMode: 'multiply', flexShrink: 0 }}
              />
              <span style={{ flex: 1, paddingRight: 16 }}>
                <strong>First reminder?</strong> Type what you want to be reminded about below, open the book to pick a date, hour and minute, slide the rudeness from Gentle to Savage, then add a photo, voice or quote if you want. Hit <strong>Create Reminder</strong> when you're ready.
              </span>
              <button
                onClick={() => {
                  localStorage.setItem('create_form_tooltip_seen', 'true');
                  setShowCreateTooltip(false);
                }}
                style={{ position: 'absolute', top: 6, right: 8, background: 'none', border: 'none', fontSize: '14px', cursor: 'pointer', color: '#999', lineHeight: 1 }}
                data-testid="button-dismiss-create-tooltip"
                aria-label="Dismiss tip"
              >✕</button>
            </div>
          )}

          <TabsList className="grid w-full grid-cols-3 overflow-x-auto flex-shrink-0">
            <TabsTrigger value="create" className="flex items-center gap-2 data-[state=inactive]:bg-[#FDF3E3]">
              <Bell className="h-4 w-4" />
              Create
            </TabsTrigger>
            <TabsTrigger value="manage" className="flex items-center gap-2 data-[state=inactive]:bg-[#FDF3E3]">
              <Target className="h-4 w-4" />
              Manage
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2 data-[state=inactive]:bg-[#FDF3E3]">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6">
            <ReminderForm
              isFreePlan={false}
              currentReminderCount={reminders.length}
              maxReminders={999999}
              onReminderCreated={() => { hasFiredCreatingRef.current = false; fireEvent("reminder_created"); }}
              onDateSelected={(type) => fireEvent(type)}
              onVoiceTap={() => fireEvent("voice")}
              onPhotoTap={() => fireEvent("photo")}
              onQuotesTap={() => fireEvent("quotes")}
              externalRudenessLevel={badgeRudenessLevel}
              onMultiDayToggle={(on) => fireEvent(on ? "multiple_days_on" : "multiple_days_off")}
              onTitleChange={(title) => {
                if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
                if (title.trim().length < 3) {
                  hasFiredCreatingRef.current = false;
                } else if (!hasFiredCreatingRef.current) {
                  titleDebounceRef.current = setTimeout(() => {
                    hasFiredCreatingRef.current = true;
                    fireEvent("creating_generic");
                  }, 800);
                }
              }}
            />
          </TabsContent>

          <TabsContent value="manage" className="space-y-6 w-full overflow-x-hidden">
            <RemindersList onEvent={(e) => fireEvent(e as RudyEventType)} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            {/* Analytics — standalone component, movable anywhere */}
            <AnalyticsPanel onRudyEvent={fireEvent} />
          </TabsContent>


        </Tabs>
      </div>

      {/* Rich Reminder Notification Modal */}
      {currentReminder && (
        <RichReminderNotification
          isOpen={showRichNotification}
          onClose={() => {
            setShowRichNotification(false);
            setCurrentReminder(null);
          }}
          reminder={currentReminder}
          isPremium={true} // Premium user
          features={{
            aiGeneratedResponses: true,
            aiGeneratedQuotes: true,
          }}
          onComplete={handleCompleteReminder}
          onMissed={handleMissedReminder}
          onPlayVoice={handleVoicePlay}
          isPlayingVoice={isPlayingVoice}
        />
      )}

      {/* Banner ad for premium users — no interstitial */}
      <AdMobManager isPremium={true} />

      {/* Floating Help Button — raised above banner */}
      <div
        className="fixed right-4 z-50"
        style={{ bottom: isAndroid ? '130px' : '90px' }}
      >
        <HelpMenu />
      </div>

      {/* Test Notification Button - dev only */}
      {import.meta.env.DEV && <NotificationTest />}
    </div>
  );
}
