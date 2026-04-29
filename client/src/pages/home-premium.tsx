import { useState, useEffect, useRef } from "react";
import { getPlatformInfo } from "@/utils/platformDetection";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  BarChart3,
  Target,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import Navigation from "@/components/Navigation";
import ReminderForm from "@/components/ReminderForm";
import RemindersList from "@/components/RemindersList";
import { RichReminderNotification } from "@/components/RichReminderNotification";
import { HelpMenu } from "@/components/HelpMenu";
import { NotificationTest } from "@/components/NotificationTest";
import { AdMobManager } from "@/components/AdMobManager";
import RudyWidget, { RudyEventType } from "@/components/RudyWidget";
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
  const [graphTab, setGraphTab] = useState<"week" | "year" | "tenWeeks">("week");
  const [showAnalyticsTooltip, setShowAnalyticsTooltip] = useState(() => !localStorage.getItem('analytics_tooltip_seen'));
  const graphScrollRef = useRef<HTMLDivElement>(null);

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
    if (graphTab !== "week" && graphScrollRef.current) {
      graphScrollRef.current.scrollLeft = graphScrollRef.current.scrollWidth;
    }
  }, [graphTab]);

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

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: voices = [] } = useQuery({
    queryKey: ["/api/voices"],
  });

  const { data: graphData } = useQuery({
    queryKey: ["/api/stats/completion-graph"],
    staleTime: 0,
    refetchOnMount: true,
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
        className="container mx-auto px-4 pt-8 max-w-7xl"
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
              />
            )}
          </div>
          {rudySticky && rudyFloatingEnabled && (
            <div style={{
              position: 'fixed',
              top: '60px',
              left: 0,
              right: 0,
              zIndex: 50,
              padding: '0 16px',
              backgroundColor: '#FDF3E3',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transition: 'transform 0.2s ease, opacity 0.2s ease',
              animation: 'rudySlideIn 0.2s ease',
            }}>
              <RudyWidget
                nudgeEvent={lastEvent}
                nudgeKey={eventKey}
                onNudgeHandled={() => setLastEvent(null)}
              />
            </div>
          )}
        </div>



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
              onRudenessChange={(level) => setBadgeRudenessLevel(level)}
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
            {/* One-time Rudy tooltip — first Analytics visit only */}
            {showAnalyticsTooltip && (
              <div style={{
                background: 'white',
                border: '2px solid #C9A063',
                borderRadius: '12px',
                padding: '10px 12px',
                fontSize: '11px',
                color: '#333',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                position: 'relative',
              }}>
                <img src="/rudy/Rudy_sitting_upright_transparent.png" alt="Rudy" style={{ width: 36, height: 36, mixBlendMode: 'multiply', flexShrink: 0 }} />
                <span style={{ flex: 1 }}>This is your habit journey. Every time you tap done or missed, it logs here. The 10 Weeks graph is where habits are built — science says day 66 is the magic number. 🔥</span>
                <button
                  onClick={() => { localStorage.setItem('analytics_tooltip_seen', 'true'); setShowAnalyticsTooltip(false); }}
                  style={{ position: 'absolute', top: 6, right: 8, background: 'none', border: 'none', fontSize: '14px', cursor: 'pointer', color: '#999', lineHeight: 1 }}
                >✕</button>
              </div>
            )}

            {/* ── COMPLETION GRAPH ── */}
            <Card className="border border-[#C9A063] bg-[#FDF3E3]">
              <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-[#C9A063]" />
                  <CardTitle className="text-sm font-semibold text-[#C9A063]">My Journey</CardTitle>
                </div>
                {/* Graph tab switcher */}
                <div className="flex rounded-xl border-2 border-[#C9A063] overflow-hidden">
                  {(["week", "tenWeeks", "year"] as const).map((t, i) => {
                    const labels = ["This Week", "10 Weeks", "This Year"];
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setGraphTab(t);
                          const evMap: Record<string, RudyEventType> = { week: "analytics_this_week", tenWeeks: "analytics_10_weeks", year: "analytics_this_year" };
                          const ev = evMap[t]; if (ev) fireEvent(ev);
                        }}
                        className={`flex-1 py-1 text-[11px] font-semibold transition-all ${
                          graphTab === t
                            ? "bg-[#C9A063] text-[#111827]"
                            : "bg-white text-[#111827] hover:bg-[#FDF8F0]"
                        } ${i !== 0 ? "border-l border-[#C9A063]" : ""}`}
                      >
                        {labels[i]}
                      </button>
                    );
                  })}
                </div>
              </CardHeader>
              <CardContent className="px-2 pb-1">
                <p className="text-[10px] text-gray-400 text-center mb-1">Blue = positive day · Red = missed day</p>
                {(() => {
                  const pts = ((graphData as any)?.[graphTab] ?? []).map((pt: any) => {
                    const completed = pt.completed ?? 0;
                    const missed = Math.abs(pt.incomplete ?? 0);
                    let net = completed + (pt.incomplete ?? 0);
                    // Ensure any active period renders a visible bar
                    // (a true net of 0 with activity would otherwise be invisible)
                    if (net === 0 && (completed > 0 || missed > 0)) {
                      net = completed >= missed ? 0.4 : -0.4;
                    }
                    return { ...pt, net };
                  });
                  const currentMonthAbbrev = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][new Date().getMonth()];
                  const needsScroll = graphTab !== "week";
                  const chartWidth = Math.max(320, pts.length * 48);
                  const margin = { top: 8, right: 12, left: -16, bottom: 0 };
                  const getBarColor = (entry: any) => {
                    // Positive net (more completed than missed) → blue
                    // Negative or zero net with activity → red
                    if (entry.net > 0) return '#0025CC';
                    if (entry.net < 0) return '#C53B3B';
                    return '#E5E7EB';
                  };
                  // Y-axis bounds: fixed ±40 for the year view (bars stay proportional
                  // across the whole year so growth is visible). Other tabs use a
                  // dynamic bound so short ranges still read clearly.
                  const maxCompleted = Math.max(0, ...pts.map((p: any) => p.completed ?? 0));
                  const maxMissed = Math.max(0, ...pts.map((p: any) => Math.abs(p.incomplete ?? 0)));
                  const yTop = graphTab === "year"
                    ? 25
                    : Math.max(6, Math.ceil(maxCompleted * 1.1));
                  const yBottom = graphTab === "year"
                    ? -15
                    : -Math.max(4, Math.ceil(maxMissed * 1.1));
                  const chartInternals = (w: number | undefined) => (
                    <BarChart width={w} height={290} data={pts} margin={margin}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0E8D8" />
                      <XAxis
                        dataKey="name"
                        tick={(props: any) => {
                          const { x, y, payload, index } = props;
                          const isHighlight = graphTab === "year" && payload.value === currentMonthAbbrev;
                          if (graphTab === "week") {
                            const todayNow = new Date();
                            const todayDow = todayNow.getDay();
                            const todayDiffToMon = (todayDow === 0 ? -6 : 1 - todayDow);
                            const weekStartDate = new Date(todayNow);
                            weekStartDate.setDate(todayNow.getDate() + todayDiffToMon);
                            weekStartDate.setHours(0, 0, 0, 0);
                            const dayDate = new Date(weekStartDate);
                            dayDate.setDate(weekStartDate.getDate() + index);
                            const monthAbbrevs = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                            const dateLabel = `${monthAbbrevs[dayDate.getMonth()]} ${dayDate.getDate()}`;
                            const isToday = dayDate.toDateString() === todayNow.toDateString();
                            return (
                              <g>
                                <text x={x} y={y + 10} textAnchor="middle" fontSize={10} fill={isToday ? "#C9A063" : "#9CA3AF"} fontWeight={isToday ? 700 : 400}>
                                  {payload.value}
                                </text>
                                <text x={x} y={y + 22} textAnchor="middle" fontSize={9} fill={isToday ? "#C9A063" : "#b0b7c3"}>
                                  {dateLabel}
                                </text>
                              </g>
                            );
                          }
                          return (
                            <text x={x} y={y + 10} textAnchor="middle" fontSize={10} fill={isHighlight ? "#C9A063" : "#9CA3AF"} fontWeight={isHighlight ? 700 : 400}>
                              {payload.value}
                            </text>
                          );
                        }}
                        height={36}
                      />
                      <YAxis
                        domain={[yBottom, yTop]}
                        allowDecimals={false}
                        tick={{ fontSize: 9, fill: "#9CA3AF" }}
                      />
                      <ReferenceLine y={0} stroke="#374151" strokeWidth={2} />
                      <Tooltip
                        cursor={false}
                        content={({ active, payload, label }: any) => {
                          if (!active || !payload?.[0]) return null;
                          const pt = payload[0].payload;
                          const completed = pt.completed ?? 0;
                          const missed = Math.abs(pt.incomplete ?? 0);
                          const net = pt.net ?? 0;
                          return (
                            <div style={{ border: '1.5px solid #C9A063', borderRadius: 8, background: 'white', padding: '8px 12px', fontSize: 12 }}>
                              <p style={{ fontWeight: 700, marginBottom: 4 }}>{label}</p>
                              <p>Completed: {completed} ✅</p>
                              <p>Missed: {missed} ❌</p>
                              <p>Net: {net > 0 ? `+${net}` : `${net}`}</p>
                            </div>
                          );
                        }}
                      />
                      <Bar
                        dataKey="net"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={25}
                      >
                        {pts.map((entry: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={getBarColor(entry)}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  );
                  if (needsScroll) {
                    return (
                      <div ref={graphScrollRef} style={{ overflowX: "auto", width: "100%", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
                        {chartInternals(chartWidth)}
                      </div>
                    );
                  }
                  return (
                    <ResponsiveContainer width="100%" height={290}>
                      {chartInternals(undefined) as any}
                    </ResponsiveContainer>
                  );
                })()}
                {/* Colour legend */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 10,
                  color: '#9CA3AF',
                  paddingLeft: 8,
                  paddingTop: 4,
                  paddingBottom: 2,
                }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#0025CC', display: 'inline-block' }} />
                    Positive
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#C53B3B', display: 'inline-block' }} />
                    Missed
                  </span>
                </div>
              </CardContent>
            </Card>
            {/* ── 66-DAY PROGRESS + LEVEL CARDS ── */}
            {(() => {
              const allReminders = reminders as any[];
              const firstReminderDate = allReminders.length > 0
                ? new Date(Math.min(...allReminders.map((r: any) => new Date(r.scheduledFor || r.createdAt).getTime())))
                : null;
              const daysActive = firstReminderDate
                ? Math.min(66, Math.floor((Date.now() - firstReminderDate.getTime()) / (1000 * 60 * 60 * 24)))
                : 0;
              const progressPct = Math.round((daysActive / 66) * 100);
              const ringCircumference = 2 * Math.PI * 18;

              const getHabitLevel = (days: number) => {
                if (days >= 66) return { label: 'Champion',      emoji: '🏆', color: '#C9A063', next: null as string | null,  nextAt: 66 };
                if (days >= 45) return { label: 'Habit Builder', emoji: '⚡', color: '#F97316', next: 'Champion' as string | null,    nextAt: 66 };
                if (days >= 21) return { label: 'Consistent',    emoji: '🔥', color: '#C53B3B', next: 'Habit Builder' as string | null, nextAt: 45 };
                if (days >= 7)  return { label: 'Getting There', emoji: '💪', color: '#22C55E', next: 'Consistent' as string | null,  nextAt: 21 };
                return            { label: 'Rookie',             emoji: '🌱', color: '#38BDF8', next: 'Getting There' as string | null, nextAt: 7 };
              };
              const level = getHabitLevel(daysActive);
              const prevAtMap: Record<string, number> = { Rookie: 0, 'Getting There': 7, Consistent: 21, 'Habit Builder': 45, Champion: 66 };
              const prevAt = prevAtMap[level.label] ?? 0;
              const levelPct = level.next
                ? Math.max(0, Math.min(100, Math.round(((daysActive - prevAt) / (level.nextAt - prevAt)) * 100)))
                : 100;

              const currentData: any[] = (graphData as any)?.[graphTab] ?? [];
              const totalNet = currentData.reduce((sum: number, pt: any) => sum + (pt.completed ?? 0) + (pt.incomplete ?? 0), 0);
              const hasData = currentData.some((pt: any) => (pt.completed ?? 0) !== 0 || (pt.incomplete ?? 0) !== 0);

              let msg = "Every expert was once a beginner. Set your first reminder! 💪";
              if (graphTab === "week") {
                if (!hasData) msg = "Every expert was once a beginner. Set your first reminder! 💪";
                else if (totalNet > 0) msg = "Strong week! You're above the line 🔥";
                else if (totalNet === 0) msg = "Balanced week — push for more completions 🎯";
                else msg = "Tough week — tomorrow is a fresh start 💪";
              } else if (graphTab === "tenWeeks") {
                const weeksActive = firstReminderDate
                  ? Math.floor((Date.now() - firstReminderDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
                  : 0;
                if (!hasData || weeksActive < 1) msg = "Every expert was once a beginner. Set your first reminder! 💪";
                else if (weeksActive < 5) msg = "You're in the early stages — consistency is everything right now 🌱";
                else if (weeksActive < 10) msg = "You're approaching the habit formation zone — science says day 66 is where it clicks! 🔥";
                else msg = "You've hit the 10 week mark — your habits are starting to form automatically ⚡";
              } else {
                const monthsActive = firstReminderDate
                  ? Math.floor((Date.now() - firstReminderDate.getTime()) / (30 * 24 * 60 * 60 * 1000))
                  : 0;
                if (!hasData || monthsActive < 1) msg = "Every journey starts with a single step. You're building something real 🌱";
                else if (monthsActive < 3) msg = "Every journey starts with a single step. You're building something real 🌱";
                else if (monthsActive < 6) msg = "3+ months of accountability. You're in the top 20% of people who stick with it 💪";
                else if (monthsActive < 9) msg = "Half a year of showing up. Your habits are genuinely changing who you are 👑";
                else if (monthsActive < 12) msg = "Almost a full year. You've built something most people only dream about 🏆";
                else msg = "One full year. You ARE the habit 🎯";
              }

              return (
                <>
                  {/* 66-day progress card — HIDDEN, saved for later
                  <div style={{
                    background: '#FDF3E3',
                    border: '1.5px solid #C9A063',
                    borderRadius: 12,
                    padding: '10px 14px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#6B3410' }}>66-Day Habit Challenge</span>
                        <span style={{ fontSize: 11, color: '#C9A063' }}>Day {daysActive} of 66</span>
                      </div>
                      <svg width="44" height="44" viewBox="0 0 44 44">
                        <circle cx="22" cy="22" r="18" fill="none" stroke="#E5E7EB" strokeWidth="4" />
                        <circle
                          cx="22" cy="22" r="18" fill="none"
                          stroke="#C9A063" strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={`${ringCircumference}`}
                          strokeDashoffset={`${ringCircumference * (1 - progressPct / 100)}`}
                          transform="rotate(-90 22 22)"
                          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                        />
                        <text x="22" y="26" textAnchor="middle" fontSize="10" fontWeight="700" fill="#6B3410">
                          {progressPct}%
                        </text>
                      </svg>
                    </div>
                    <div style={{
                      height: 6,
                      borderRadius: 3,
                      background: '#E5E7EB',
                      marginTop: 8,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${progressPct}%`,
                        background: 'linear-gradient(to right, #C9A063, #C53B3B)',
                        borderRadius: 3,
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                  </div>
                  */}

                  {/* Level / motivation card */}
                  <div style={{
                    background: 'white',
                    border: `1.5px solid ${level.color}`,
                    borderRadius: 12,
                    padding: '12px 14px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: level.color }}>
                        {level.emoji} {level.label}
                      </span>
                      <span style={{
                        background: `${level.color}26`,
                        color: level.color,
                        borderRadius: 20,
                        padding: '2px 10px',
                        fontSize: 11,
                        fontWeight: 600,
                      }}>
                        Day {daysActive}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: '#374151', marginTop: 6, marginBottom: 0 }}>{msg}</p>
                    {level.next && (
                      <>
                        <div style={{
                          height: 4,
                          borderRadius: 2,
                          background: '#E5E7EB',
                          marginTop: 10,
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${levelPct}%`,
                            background: level.color,
                            borderRadius: 2,
                            transition: 'width 0.6s ease',
                          }} />
                        </div>
                        <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4, marginBottom: 0 }}>
                          {levelPct}% to {level.next}
                        </p>
                      </>
                    )}
                  </div>
                </>
              );
            })()}

            {/* ── STATS GRID ── */}
            <div className="grid grid-cols-2 gap-3">
              {/* Completion Rate */}
              <Card className="border border-[#C9A063]">
                <CardContent className="p-3">
                  <p className="text-[11px] text-gray-500 mb-1">Completion Rate</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(reminders as any[]).length > 0
                      ? Math.round(((reminders as any[]).filter((r: any) => r.completed).length / (reminders as any[]).length) * 100)
                      : 0}%
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {(reminders as any[]).filter((r: any) => r.completed).length} of {(reminders as any[]).length} done
                  </p>
                </CardContent>
              </Card>

              {/* Current Streak */}
              <Card className="border border-[#C9A063]">
                <CardContent className="p-3">
                  <p className="text-[11px] text-gray-500 mb-1">Current Streak</p>
                  <p className="text-2xl font-bold text-gray-900">{(stats as any)?.currentStreak ?? 0}</p>
                  <p className="text-[10px] text-gray-400">days in a row</p>
                </CardContent>
              </Card>

              {/* Most Productive Day */}
              <Card className="border border-[#C9A063]">
                <CardContent className="p-3">
                  <p className="text-[11px] text-gray-500 mb-1">Best Day</p>
                  <p className="text-lg font-bold text-gray-900 truncate">
                    {(() => {
                      const dc = (reminders as any[])
                        .filter((r: any) => r.completed && r.completedAt)
                        .reduce((acc: any, r: any) => {
                          const day = new Date(r.completedAt).toLocaleDateString("en-US", { weekday: "short" });
                          acc[day] = (acc[day] || 0) + 1;
                          return acc;
                        }, {});
                      const entries = Object.entries(dc);
                      if (!entries.length) return "—";
                      return entries.reduce((a: any, b: any) => (a[1] > b[1] ? a : b))[0];
                    })()}
                  </p>
                  <p className="text-[10px] text-gray-400">most completions</p>
                </CardContent>
              </Card>

              {/* Total Completed */}
              <Card className="border border-[#C9A063]">
                <CardContent className="p-3">
                  <p className="text-[11px] text-gray-500 mb-1">Total Done</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(reminders as any[]).filter((r: any) => r.completed).length}
                  </p>
                  <p className="text-[10px] text-gray-400">all time</p>
                </CardContent>
              </Card>

              {/* Active Reminders */}
              <Card className="border border-[#C9A063]">
                <CardContent className="p-3">
                  <p className="text-[11px] text-gray-500 mb-1">Active</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(reminders as any[]).filter((r: any) => !r.completed && new Date(r.scheduledFor) >= new Date()).length}
                  </p>
                  <p className="text-[10px] text-gray-400">upcoming reminders</p>
                </CardContent>
              </Card>

              {/* Average Rudeness */}
              <Card className="border border-[#C9A063]">
                <CardContent className="p-3">
                  <p className="text-[11px] text-gray-500 mb-1">Avg Rudeness</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(reminders as any[]).length > 0
                      ? ((reminders as any[]).reduce((acc: number, r: any) => acc + (r.rudenessLevel || 3), 0) / (reminders as any[]).length).toFixed(1)
                      : "3.0"}
                  </p>
                  <p className="text-[10px] text-gray-400">out of 5.0</p>
                </CardContent>
              </Card>
            </div>
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
