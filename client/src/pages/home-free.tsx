import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  Zap,
  Star,
  TrendingUp,
  Calendar,
  MessageSquare,
  Camera,
  Volume2,
  Brain,
  Target,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import rudeRemindersLogo from '@assets/translusant_logo2_1767108484844.png';
import Navigation from "@/components/Navigation";
import ReminderForm from "@/components/ReminderForm";
import RemindersList from "@/components/RemindersList";
import { RichReminderNotification } from "@/components/RichReminderNotification";
import { HelpMenu } from "@/components/HelpMenu";
import { AdMobManager } from "@/components/AdMobManager";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Reminder, User } from "@shared/schema";
import { guestStorage } from "@/services/guestStorage";

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

const SLOGANS = [
  "We'll annoy you into becoming a better person.",
  "Started with a laugh. Built a habit.",
  "Your goals deserve more than a gentle nudge.",
  "Hilarious reminders. Real accountability. Actual results.",
  "Most apps remind you. We hold you accountable.",
  "We'll roast you into your best self.",
];

// Free plan limits
const FREE_LIMITS = {
  reminders: 15, // 15 reminders per month
  voiceCharacters: 3,
  attachments: 1,
};

export default function HomeFree() {
  const { user, isGuest } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [currentReminder, setCurrentReminder] = useState<Reminder | null>(null);
  const [showRichNotification, setShowRichNotification] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [rewardedFeatures, setRewardedFeatures] = useState({
    extraReminders: 0, // Extra reminders from watching ads
    premiumVoicesUntil: 0, // Timestamp when premium voices expire
  });
  const [adActionCount, setAdActionCount] = useState(0);
  const [sloganIndex, setSloganIndex] = useState(0);
  const [sloganVisible, setSloganVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setSloganVisible(false);
      setTimeout(() => {
        setSloganIndex(prev => (prev + 1) % SLOGANS.length);
        setSloganVisible(true);
      }, 350);
    }, 8000);
    return () => clearInterval(interval);
  }, []);


  // For guest users, use localStorage; for authenticated users, use API
  const { data: reminders = [], isLoading } = useQuery<Reminder[]>({
    queryKey: isGuest ? ["guest-reminders"] : ["/api/reminders"],
    queryFn: isGuest 
      ? async () => guestStorage.getReminders()
      : undefined, // Use default fetcher for authenticated users
    refetchInterval: isGuest ? 1000 : undefined, // Poll guest storage for updates
  });

  const { data: stats } = useQuery<{ total: number; completed: number; pending: number; overdue: number; monthlyReminderUsage?: Record<string, number> }>({
    queryKey: isGuest ? ["guest-stats"] : ["/api/stats"],
    queryFn: isGuest
      ? async () => guestStorage.getStats()
      : undefined, // Use default fetcher for authenticated users
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
  const handleCompleteReminder = async () => {
    console.log('[Reminder] handleCompleteReminder called, currentReminder:', currentReminder?.id ?? 'null');
    if (!currentReminder) return;

    try {
      console.log('[Reminder] Calling complete for:', currentReminder.id);
      await apiRequest(`/api/reminders/${currentReminder.id}/complete`, { method: 'PATCH' });
      setAdActionCount(prev => { console.log(`[AdMob] Action count: ${prev + 1} (complete)`); return prev + 1; });
      queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({
        title: "Reminder Completed",
        description: "Great job getting it done!",
      });
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

  const handleMissedReminder = async () => {
    console.log('[Reminder] handleMissedReminder called, currentReminder:', currentReminder?.id ?? 'null');
    if (!currentReminder) return;
    try {
      console.log('[Reminder] Calling not-accomplished for:', currentReminder.id);
      await apiRequest(`/api/reminders/${currentReminder.id}/not-accomplished`, { method: 'PATCH' });
      console.log('[Reminder] not-accomplished success');
      setAdActionCount(prev => { console.log(`[AdMob] Action count: ${prev + 1} (missed)`); return prev + 1; });
      queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({
        title: "Logged 💪",
        description: "Tomorrow is a new chance. This reminder clears in 24 hours.",
      });
    } catch (error) {
      console.error('[Reminder] not-accomplished error:', error);
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

  // Calculate monthly usage from stats
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
  const monthlyUsage = stats?.monthlyReminderUsage?.[currentMonth] || 0;

  // Calculate free usage with rewarded bonuses
  const effectiveReminderLimit = FREE_LIMITS.reminders + rewardedFeatures.extraReminders;

  const freeUsage = {
    reminders: monthlyUsage,
    voiceCharacters: Math.min(voices.length, FREE_LIMITS.voiceCharacters),
    effectiveLimit: effectiveReminderLimit,
  };



  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Welcome Header - Mobile Optimized */}
        <div className="mb-3 sm:mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-1 flex flex-wrap items-center gap-2">
                <span className="truncate">{isGuest ? "Hey Guest" : `Hey ${(user as any)?.firstName || (user as any)?.username || 'there'}`}</span>
                <Badge className="bg-green-400 text-white text-xs flex-shrink-0 border-0">
                  <Star className="h-3 w-3 mr-1" />
                  Free
                </Badge>
              </h1>
            </div>
          </div>
          {/* Rotating slogan banner */}
          <div
            className="flex items-center justify-between bg-[#FDF3E3] border border-[#C9A063] rounded-[12px] px-3 mt-2"
            style={{ height: '52px', overflow: 'hidden' }}
          >
            <p
              className="text-[11px] text-[#111827] flex-1 mr-3 leading-snug"
              style={{
                opacity: sloganVisible ? 1 : 0,
                transition: 'opacity 0.35s ease',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical' as const,
                overflow: 'hidden',
              }}
            >
              {SLOGANS[sloganIndex]}
            </p>
            <button
              onClick={() => setLocation('/subscribe')}
              className="text-xs font-semibold text-white bg-[#C53B3B] px-3 py-1 rounded-full hover:bg-[#A83232] transition-colors flex-shrink-0"
            >
              Go Premium 😤
            </button>
          </div>
        </div>



        {/* Main Content Tabs */}
        <Tabs defaultValue="create" className="space-y-6">
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
              isFreePlan={true} 
              currentReminderCount={freeUsage.reminders}
              maxReminders={freeUsage.effectiveLimit}
              onReminderCreated={() => {
                setAdActionCount(prev => {
                  const next = prev + 1;
                  console.log('Ad action counter incremented:', next);
                  return next;
                });
              }}
            />
          </TabsContent>

          <TabsContent value="manage" className="space-y-6 w-full overflow-x-hidden">
            <RemindersList />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="relative">
              {/* Blurred analytics preview */}
              <div className="blur-sm pointer-events-none select-none opacity-60 space-y-4">
                {/* Fake graph card */}
                <div className="border border-[#C9A063] rounded-xl p-4 bg-white">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-[#C9A063]" />
                    <span className="text-sm font-semibold text-gray-900">Completions</span>
                  </div>
                  <div className="flex rounded-xl border-2 border-[#C9A063] overflow-hidden mb-4">
                    {["This Week", "This Year", "10 Weeks"].map((label, i) => (
                      <div key={label} className={`flex-1 py-1 text-center text-[11px] font-semibold ${i === 0 ? "bg-[#C9A063] text-white" : "bg-white text-[#C9A063]"} ${i !== 0 ? "border-l border-[#C9A063]" : ""}`}>
                        {label}
                      </div>
                    ))}
                  </div>
                  {/* Fake chart bars */}
                  <div className="h-[140px] flex items-end justify-around gap-1 px-2">
                    {[3, -1, 4, -2, 5, 1, -1].map((v, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center justify-center gap-0.5">
                        {v > 0 && <div className="w-full rounded-sm bg-[#C53B3B]" style={{ height: `${v * 14}px` }} />}
                        <div className="w-full h-[2px] bg-gray-800" />
                        {v < 0 && <div className="w-full rounded-sm bg-[#9CA3AF]" style={{ height: `${Math.abs(v) * 14}px` }} />}
                      </div>
                    ))}
                  </div>
                </div>
                {/* Fake encouragement */}
                <div className="border border-[#C9A063] bg-[#FDF8F0] rounded-xl p-3 text-center">
                  <p className="text-sm text-gray-700 font-medium">You're crushing it — keep that line climbing! 🔥</p>
                </div>
                {/* Fake stats grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Completion Rate", "72%", "13 of 18 done"],
                    ["Current Streak", "5", "days in a row"],
                    ["Best Day", "Wed", "most completions"],
                    ["Total Done", "18", "all time"],
                    ["Active", "4", "upcoming reminders"],
                    ["Avg Rudeness", "3.6", "out of 5.0"],
                  ].map(([label, value, sub]) => (
                    <div key={label} className="border border-[#C9A063] rounded-xl p-3 bg-white">
                      <p className="text-[11px] text-gray-500 mb-1">{label}</p>
                      <p className="text-2xl font-bold text-gray-900">{value}</p>
                      <p className="text-[10px] text-gray-400">{sub}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upgrade overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="bg-white border-2 border-[#C9A063] rounded-2xl shadow-xl px-6 py-6 text-center max-w-xs mx-auto">
                  <img src={rudeRemindersLogo} alt="Rude Reminders" className="w-12 h-12 mx-auto object-contain mb-3" />
                  <h3 className="font-bold text-gray-900 text-base mb-1">Analytics Locked</h3>
                  <p className="text-sm text-gray-500 mb-4">Rude Reminders is the first of its kind habit-building app. These analytics show you exactly how consistent you're being — streaks, completion rates, and your best days. Because what gets measured, gets done.</p>
                  <button
                    onClick={() => setLocation('/subscribe')}
                    className="w-full bg-[#C53B3B] hover:bg-[#A83232] text-white font-semibold py-2.5 px-6 rounded-full text-sm transition-colors"
                  >
                    Unlock Analytics
                  </button>
                </div>
              </div>
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
          isPremium={false} // Free user
          features={{
            aiGeneratedResponses: false,
            aiGeneratedQuotes: false,
          }}
          onComplete={handleCompleteReminder}
          onMissed={handleMissedReminder}
          onPlayVoice={handleVoicePlay}
          isPlayingVoice={isPlayingVoice}
        />
      )}

      {/* Free Plan Usage Overview - Bottom Section */}
      <div className="container mx-auto px-4 pb-6 max-w-7xl">
        <Card className="bg-white border-[#EAEAEA] rounded-[20px] shadow-[var(--rr-card-shadow)]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h3 className="font-semibold text-[#111827]">Free Plan Usage</h3>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-[#C53B3B]" />
                    <span className="text-[#6B7280]">{freeUsage.reminders}/{freeUsage.effectiveLimit} reminders this month</span>
                    {rewardedFeatures.extraReminders > 0 && (
                      <span className="text-xs bg-[#F9FAFB] text-[#111827] px-2 py-1 rounded-full border border-[#EAEAEA]">
                        +{rewardedFeatures.extraReminders} bonus
                      </span>
                    )}
                  </div>
                </div>
                {/* Progress bar for reminders */}
                <div className="w-48">
                  <div className="flex justify-between text-xs text-blue-600 mb-1">
                    <span>Reminders Used</span>
                    <span>{Math.round((freeUsage.reminders / freeUsage.effectiveLimit) * 100)}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min((freeUsage.reminders / freeUsage.effectiveLimit) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
              <Button 
                className="bg-red-600 hover:bg-red-700 text-white flex-shrink-0 text-sm font-semibold shadow-lg border-2 border-red-700 px-6"
                onClick={() => setLocation('/subscribe')}
              >
                <span className="whitespace-nowrap">Upgrade</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AdMob Integration for Free Users */}
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

      {/* Floating Help Button — raised above banner on Android */}
      <div
        className="fixed right-4 z-50 flex gap-2"
        style={{ bottom: Capacitor.getPlatform() === 'android' ? '112px' : '80px' }}
      >
        <HelpMenu />
      </div>
    </div>
  );
}