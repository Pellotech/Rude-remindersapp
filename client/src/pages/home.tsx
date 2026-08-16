import { useState, useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { getPlatformInfo } from "@/utils/platformDetection";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, TrendingUp, Target } from "lucide-react";
import Navigation from "@/components/Navigation";
import ReminderForm from "@/components/ReminderForm";
import RemindersList from "@/components/RemindersList";
import { RichReminderNotification } from "@/components/RichReminderNotification";
import { HelpMenu } from "@/components/HelpMenu";
import { NotificationTest } from "@/components/NotificationTest";
import { AdMobManager } from "@/components/AdMobManager";
import { RudyEventType } from "@/components/RudyWidget";
import { HomeHeader } from "@/components/HomeHeader";
import { RudenessSlider } from "@/components/RudenessSlider";
import { AnalyticsPanel } from "@/components/AnalyticsPanel";
import { AnalyticsLocked } from "@/components/AnalyticsLocked";
import { FreePlanUsage } from "@/components/FreePlanUsage";
import { CreateTooltip, useCreateTooltip } from "@/components/CreateTooltip";
import { MotivationalPopup } from "@/components/MotivationalPopup";
import { IntroTour, useIntroTour } from "@/components/IntroTour";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Reminder } from "@shared/schema";

/**
 * Home — the single home page for both plans.
 *
 * Replaces the old home-free.tsx / home-premium.tsx pair. Every difference
 * between the two plans is an explicit `isPremium` branch below, so the
 * complete list of what premium unlocks can be found by searching this file
 * for "isPremium".
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT PREMIUM UNLOCKS (the full list — keep this comment in sync)
 * ─────────────────────────────────────────────────────────────────────────
 *  1. Analytics tab      premium: real AnalyticsPanel (chart, stats, levels)
 *                        free:    blurred AnalyticsLocked teaser + upgrade CTA
 *  2. Rudy reactions     premium: Rudy reacts to slider moves, tab switches,
 *                                 typing, date picks, voice/photo/quote taps,
 *                                 reminder creation, and list actions
 *                        free:    Rudy is static, with an Upgrade button
 *  3. Reminder limit     premium: unlimited
 *                        free:    15/month (+3 per rewarded ad watched)
 *  4. Ads                premium: none
 *                        free:    banner + interstitial + rewarded ads
 *  5. Usage card         free only: "Free Plan Usage" card at page bottom
 *  6. AI in notification premium: aiGeneratedResponses + aiGeneratedQuotes
 *                        free:    both off
 *  7. Motivational popup premium only
 *  8. Rudeness in form   free: slider is page-owned (form follows it)
 *                        premium: same — both pass externalRudenessLevel
 *
 * Deliberately preserved plan differences (these existed before the merge
 * and were kept as-is rather than unified):
 *  - completion/missed toast wording differs per plan
 *  - free refreshes /api/stats after complete/missed; premium doesn't
 *  - free closes the notification in a `finally`; premium only on success
 *  - premium's reminders query uses staleTime: 0 / refetchOnMount
 * ─────────────────────────────────────────────────────────────────────────
 */

// Free plan limits
const FREE_LIMITS = {
  reminders: 15, // 15 reminders per month
  voiceCharacters: 3,
  attachments: 1,
};

interface HomeProps {
  /** Which plan to render. Supplied by the router from the user's subscription. */
  isPremium: boolean;
}

export default function Home({ isPremium }: HomeProps) {
  const { isAndroid } = getPlatformInfo();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [currentReminder, setCurrentReminder] = useState<Reminder | null>(null);
  const [showRichNotification, setShowRichNotification] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [activeTab, setActiveTab] = useState("create");

  // ── Free-only state ──
  const [rewardedFeatures, setRewardedFeatures] = useState({
    extraReminders: 0, // Extra reminders from watching ads
    premiumVoicesUntil: 0, // Timestamp when premium voices expire
  });
  const [adActionCount, setAdActionCount] = useState(0);

  // ── Rudeness level (page-owned; the form follows it on both plans) ──
  const [badgeRudenessLevel, setBadgeRudenessLevel] = useState<number>(
    (user as any)?.defaultRudenessLevel || parseInt(localStorage.getItem('default_rudeness_level') || '2')
  );

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

  // ── Premium-only: Rudy reaction event stream ──
  const [lastEvent, setLastEvent] = useState<RudyEventType>(null);
  const [eventKey, setEventKey] = useState(0);
  const fireEvent = (e: RudyEventType) => {
    if (!isPremium) return; // free Rudy is static
    console.log('[home] fireEvent:', e);
    setLastEvent(e);
    setEventKey(k => k + 1);
  };
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFiredCreatingRef = useRef(false);
  const sliderRudyRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevRudenessRef = useRef<number>(badgeRudenessLevel);

  // Watch badgeRudenessLevel — only fires when value actually changes, never on mount
  useEffect(() => {
    if (!isPremium) return;
    if (badgeRudenessLevel === prevRudenessRef.current) return;
    prevRudenessRef.current = badgeRudenessLevel;
    if (sliderRudyRef.current) clearTimeout(sliderRudyRef.current);
    sliderRudyRef.current = setTimeout(() => {
      setLastEvent(`slider_${badgeRudenessLevel}` as RudyEventType);
      setEventKey(k => k + 1);
    }, 800);
  }, [badgeRudenessLevel, isPremium]);

  // ── Data ──
  // Premium keeps staleTime/refetchOnMount (preserved from home-premium.tsx)
  const { data: reminders = [], isLoading } = useQuery<Reminder[]>({
    queryKey: ["/api/reminders"],
    ...(isPremium ? { staleTime: 0, refetchOnMount: true } : {}),
  });

  const { data: stats } = useQuery<{ total: number; completed: number; pending: number; overdue: number; monthlyReminderUsage?: Record<string, number> }>({
    queryKey: ["/api/stats"],
  });

  const { data: voices = [] } = useQuery<{ id: string; name: string; }[]>({
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

  // Voice playback handler
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
  // NOTE: toast copy and stats refresh still differ by plan, but the dialog
  // now always closes on these three actions (Got it done / Let you know
  // later / Didn't do it) regardless of plan or whether the API call
  // succeeded — it previously only closed unconditionally on the free plan,
  // leaving premium users stuck looking at the dialog if the request failed.
  const handleCompleteReminder = async () => {
    if (!currentReminder) return;
    try {
      await apiRequest(`/api/reminders/${currentReminder.id}/complete`, { method: 'PATCH' });
      queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
      if (isPremium) {
        toast({
          title: "Nice work! ✅",
          description: "Logged! This reminder will clear in 24 hours.",
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
        toast({
          title: "Reminder Completed",
          description: "Great job getting it done!",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark reminder as complete",
        variant: "destructive",
      });
    } finally {
      setShowRichNotification(false);
      setCurrentReminder(null);
    }
  };

  // Missed reminder handler
  const handleMissedReminder = async () => {
    if (!currentReminder) return;
    try {
      await apiRequest(`/api/reminders/${currentReminder.id}/not-accomplished`, { method: 'PATCH' });
      queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
      if (!isPremium) {
        queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      }
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
    } finally {
      setShowRichNotification(false);
      setCurrentReminder(null);
    }
  };

  const activeReminders = reminders.filter((r: Reminder) => !r.completed);
  const completedToday = reminders.filter((r: Reminder) =>
    r.completed && r.completedAt &&
    new Date(r.completedAt).toDateString() === new Date().toDateString()
  );

  // ── Free plan usage math ──
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
  const monthlyUsage = stats?.monthlyReminderUsage?.[currentMonth] || 0;
  const effectiveReminderLimit = FREE_LIMITS.reminders + rewardedFeatures.extraReminders;
  const freeUsage = {
    reminders: monthlyUsage,
    voiceCharacters: Math.min(voices.length, FREE_LIMITS.voiceCharacters),
    effectiveLimit: effectiveReminderLimit,
  };

  const { showIntro, closeIntro } = useIntroTour();
  const createTooltip = useCreateTooltip();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <IntroTour isOpen={showIntro} onClose={closeIntro} />

      {/* Premium-only: motivational popup */}
      {isPremium && (
        <MotivationalPopup
          userName={user?.firstName || user?.username || "there"}
          blocked={showIntro || !!(currentReminder && showRichNotification)}
        />
      )}

      <Navigation />

      <div
        className={isPremium
          ? "container mx-auto px-4 md:px-[20%] pt-8 max-w-7xl"
          : "container mx-auto px-4 md:px-[20%] py-8 max-w-7xl"}
        style={isPremium ? { paddingBottom: isAndroid ? '120px' : '80px' } : undefined}
      >
        {/* Welcome Header — standalone component, movable anywhere */}
        <HomeHeader
          isPremium={isPremium}
          rudenessLevel={badgeRudenessLevel}
          nudgeEvent={isPremium ? lastEvent : undefined}
          nudgeKey={isPremium ? eventKey : undefined}
          onNudgeHandled={isPremium ? () => setLastEvent(null) : undefined}
          onPremiumPress={!isPremium ? () => setLocation('/subscribe') : undefined}
          className={isPremium ? undefined : "mb-3 sm:mb-4"}
        />

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
          {/* One-time first-timer tip */}
          {createTooltip.visible && <CreateTooltip onDismiss={createTooltip.dismiss} />}

          <TabsList className="grid w-full grid-cols-3 overflow-x-auto flex-shrink-0">
            <TabsTrigger value="create" className="flex items-center gap-2 data-[state=inactive]:bg-[#FDF3E3]">
              <Bell className="h-4 w-4" />
              Create
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2 data-[state=inactive]:bg-[#FDF3E3]">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="manage" className="flex items-center gap-2 data-[state=inactive]:bg-[#FDF3E3]">
              <Target className="h-4 w-4" />
              Manage
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6">
            <ReminderForm
              isFreePlan={!isPremium}
              currentReminderCount={isPremium ? reminders.length : freeUsage.reminders}
              maxReminders={isPremium ? 999999 : freeUsage.effectiveLimit}
              externalRudenessLevel={badgeRudenessLevel}
              onReminderCreated={() => {
                if (isPremium) {
                  hasFiredCreatingRef.current = false;
                  fireEvent("reminder_created");
                } else {
                  setAdActionCount(prev => {
                    const next = prev + 1;
                    console.log('Ad action counter incremented:', next);
                    return next;
                  });
                }
              }}
              {...(isPremium ? {
                onDateSelected: (type: 'date_today' | 'date_tomorrow' | 'date_future') => fireEvent(type),
                onVoiceTap: () => fireEvent("voice"),
                onPhotoTap: () => fireEvent("photo"),
                onQuotesTap: () => fireEvent("quotes"),
                onMultiDayToggle: (on: boolean) => fireEvent(on ? "multiple_days_on" : "multiple_days_off"),
                onTitleChange: (title: string) => {
                  if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
                  if (title.trim().length < 3) {
                    hasFiredCreatingRef.current = false;
                  } else if (!hasFiredCreatingRef.current) {
                    titleDebounceRef.current = setTimeout(() => {
                      hasFiredCreatingRef.current = true;
                      fireEvent("creating_generic");
                    }, 800);
                  }
                },
              } : {})}
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            {isPremium
              ? <AnalyticsPanel onRudyEvent={fireEvent} />
              : <AnalyticsLocked onUpgrade={() => setLocation('/subscribe')} />}
          </TabsContent>

          <TabsContent value="manage" className="space-y-6 w-full overflow-x-hidden">
            {isPremium
              ? <RemindersList onEvent={(e) => fireEvent(e as RudyEventType)} />
              : <RemindersList />}
          </TabsContent>
        </Tabs>
      </div>

      {/* Rich Reminder Notification */}
      {currentReminder && (
        <RichReminderNotification
          isOpen={showRichNotification}
          onClose={() => {
            setShowRichNotification(false);
            setCurrentReminder(null);
          }}
          reminder={currentReminder}
          isPremium={isPremium}
          features={{
            aiGeneratedResponses: isPremium,
            aiGeneratedQuotes: isPremium,
          }}
          onComplete={handleCompleteReminder}
          onMissed={handleMissedReminder}
          onPlayVoice={handleVoicePlay}
          isPlayingVoice={isPlayingVoice}
        />
      )}

      {/* Free-only: usage card at the bottom */}
      {!isPremium && (
        <FreePlanUsage
          used={freeUsage.reminders}
          limit={freeUsage.effectiveLimit}
          bonusReminders={rewardedFeatures.extraReminders}
          onUpgrade={() => setLocation('/subscribe')}
        />
      )}

      {/* Ads — premium gets a banner only; free gets interstitials + rewards */}
      {isPremium ? (
        <AdMobManager isPremium={true} />
      ) : (
        <AdMobManager
          isPremium={false}
          showInterstitialOnAction={true}
          actionCount={adActionCount}
          onRewardEarned={() => {
            const rewardType = Math.random() > 0.5 ? 'reminders' : 'voices';

            if (rewardType === 'reminders') {
              setRewardedFeatures(prev => ({
                ...prev,
                extraReminders: prev.extraReminders + 3
              }));
              toast({
                title: "Reward Earned! 🎁",
                description: "You've earned 3 extra reminders this month! Watch more ads for additional rewards.",
              });
            } else {
              const premiumUntil = Date.now() + (30 * 60 * 1000); // 30 minutes
              setRewardedFeatures(prev => ({
                ...prev,
                premiumVoicesUntil: premiumUntil
              }));
              toast({
                title: "Reward Earned! 🔊",
                description: "You've unlocked premium voices for 30 minutes! Create reminders with advanced voice characters.",
              });
            }
          }}
        />
      )}

      {/* Floating Help Button — raised above banner on Android */}
      <div
        className={isPremium ? "fixed right-4 z-50" : "fixed right-4 z-50 flex gap-2"}
        style={{ bottom: (isPremium ? isAndroid : Capacitor.getPlatform() === 'android') ? '130px' : '90px' }}
      >
        <HelpMenu />
      </div>

      {/* Test Notification Button - dev only, premium page only */}
      {isPremium && import.meta.env.DEV && <NotificationTest />}
    </div>
  );
}
