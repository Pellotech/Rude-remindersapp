import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  Crown,
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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Navigation from "@/components/Navigation";
import ReminderForm from "@/components/ReminderForm";
import RemindersList from "@/components/RemindersList";
import { RichReminderNotification } from "@/components/RichReminderNotification";
import { HelpMenu } from "@/components/HelpMenu";
import { NotificationTest } from "@/components/NotificationTest";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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
  const { user } = useAuth();
  const { toast } = useToast();
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [currentReminder, setCurrentReminder] = useState<Reminder | null>(null);
  const [showRichNotification, setShowRichNotification] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [graphTab, setGraphTab] = useState<"week" | "year" | "tenWeeks">("week");

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ["/api/reminders"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
  });

  const { data: voices = [] } = useQuery({
    queryKey: ["/api/voices"],
  });

  const { data: graphData } = useQuery({
    queryKey: ["/api/stats/completion-graph"],
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
      setShowRichNotification(false);
      setCurrentReminder(null);
      toast({
        title: "Reminder Completed",
        description: "Excellent work! Your premium motivation is paying off!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark reminder as complete",
        variant: "destructive",
      });
    }
  };

  const activeReminders = (reminders as any[]).filter((r: any) => !r.completed);
  const completedToday = (reminders as any[]).filter((r: any) => 
    r.completed && 
    new Date(r.completedAt).toDateString() === new Date().toDateString()
  );



  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Welcome Header - Mobile Optimized */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-1 flex flex-wrap items-center gap-2">
                <span className="truncate">Hey {user?.firstName || user?.username || 'there'}</span>
                <Badge className="bg-gradient-to-r from-red-700 to-red-600 text-white text-xs flex-shrink-0">
                  <Crown className="h-3 w-3 mr-1" />
                  Premium
                </Badge>
              </h1>
            </div>
          </div>
        </div>



        {/* Main Content Tabs */}
        <Tabs defaultValue="create" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 overflow-x-auto flex-shrink-0">
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Create
            </TabsTrigger>
            <TabsTrigger value="manage" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Manage
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6">
            <ReminderForm 
              isFreePlan={false}
              currentReminderCount={reminders.length}
              maxReminders={999999}
            />
          </TabsContent>

          <TabsContent value="manage" className="space-y-6 w-full overflow-x-hidden">
            <RemindersList />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            {/* ── COMPLETION GRAPH ── */}
            <Card className="border border-[#C9A063]">
              <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-[#C9A063]" />
                  <CardTitle className="text-sm font-semibold text-gray-900">Completions</CardTitle>
                </div>
                {/* Graph tab switcher */}
                <div className="flex rounded-xl border-2 border-[#C9A063] overflow-hidden">
                  {(["week", "year", "tenWeeks"] as const).map((t, i) => {
                    const labels = ["This Week", "This Year", "10 Weeks"];
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setGraphTab(t)}
                        className={`flex-1 py-1 text-[11px] font-semibold transition-all ${
                          graphTab === t
                            ? "bg-[#C9A063] text-white"
                            : "bg-white text-[#C9A063] hover:bg-[#FDF8F0]"
                        } ${i !== 0 ? "border-l border-[#C9A063]" : ""}`}
                      >
                        {labels[i]}
                      </button>
                    );
                  })}
                </div>
              </CardHeader>
              <CardContent className="px-2 pb-3">
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart
                    data={(graphData as any)?.[graphTab] ?? []}
                    margin={{ top: 8, right: 12, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0E8D8" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                    <Tooltip
                      contentStyle={{ borderColor: "#C9A063", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: any) => [v, "Completed"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#C53B3B"
                      strokeWidth={2}
                      dot={{ fill: "#C53B3B", r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* ── ENCOURAGEMENT ── */}
            {(() => {
              const total = (reminders as any[]).length;
              const done = (reminders as any[]).filter((r: any) => r.completed).length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              let msg = "Every expert was once a beginner. Set your first reminder! 💪";
              if (pct >= 76) msg = "Absolute legend. Nothing stops you 👑";
              else if (pct >= 51) msg = "Over halfway there — you're crushing it! ⚡";
              else if (pct >= 26) msg = "Solid progress! You're building a great habit 🎯";
              else if (pct >= 1) msg = "You're getting started — keep that momentum going! 🔥";
              return (
                <Card className="border border-[#C9A063] bg-[#FDF8F0]">
                  <CardContent className="py-3 px-4 text-center">
                    <p className="text-sm text-gray-700 font-medium">{msg}</p>
                  </CardContent>
                </Card>
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
          onPlayVoice={handleVoicePlay}
          isPlayingVoice={isPlayingVoice}
        />
      )}

      {/* Floating Help Button */}
      <div className="fixed bottom-4 right-4 z-50">
        <HelpMenu />
      </div>

      {/* Test Notification Button - dev only */}
      {import.meta.env.DEV && <NotificationTest />}
    </div>
  );
}