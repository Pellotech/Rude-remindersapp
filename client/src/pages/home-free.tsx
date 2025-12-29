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
  Zap,
  Star,
  TrendingUp,
  Calendar,
  MessageSquare,
  CheckCircle,
  Camera,
  Volume2,
  Brain,
  BarChart3,
  Target,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import ReminderForm from "@/components/ReminderForm";
import RemindersList from "@/components/RemindersList";
import { RichReminderNotification } from "@/components/RichReminderNotification";
import { HelpMenu } from "@/components/HelpMenu";
import { AdMobManager } from "@/components/AdMobManager";
import { RewardAdBanner } from "@/components/RewardAdBanner";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Reminder, User } from "@shared/schema";
import { guestStorage } from "@/services/guestStorage";

// Free plan limits
const FREE_LIMITS = {
  reminders: 12, // 12 reminders per month
  voiceCharacters: 3,
  attachments: 1,
};

export default function HomeFree() {
  const { user, isGuest } = useAuth();
  const { toast } = useToast();
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [currentReminder, setCurrentReminder] = useState<Reminder | null>(null);
  const [showRichNotification, setShowRichNotification] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [rewardedFeatures, setRewardedFeatures] = useState({
    extraReminders: 0, // Extra reminders from watching ads
    premiumVoicesUntil: 0, // Timestamp when premium voices expire
  });


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
            if (reminder.voiceNotification && window.speechSynthesis) {
              const utterance = new SpeechSynthesisUtterance(reminder.rudeMessage);

              // Apply voice character settings
              const voices = window.speechSynthesis.getVoices();
              const voiceSettings = {
                'default': { rate: 1.0, pitch: 1.2, voiceType: 'female' },
                'drill-sergeant': { rate: 1.3, pitch: 0.7, voiceType: 'male' },
                'robot': { rate: 0.8, pitch: 0.6, voiceType: 'male' },
                'british-butler': { rate: 0.85, pitch: 0.8, voiceType: 'male' },
                'mom': { rate: 1.0, pitch: 1.3, voiceType: 'female' },
                'confident-leader': { rate: 1.1, pitch: 0.8, voiceType: 'male' }
              };

              const settings = voiceSettings[reminder.voiceCharacter as keyof typeof voiceSettings] || voiceSettings.default;
              utterance.rate = settings.rate;
              utterance.pitch = settings.pitch;

              // Try to find appropriate voice
              const preferredVoice = voices.find(voice => 
                settings.voiceType === 'female' ? voice.name.toLowerCase().includes('female') || voice.name.toLowerCase().includes('woman') :
                settings.voiceType === 'male' ? voice.name.toLowerCase().includes('male') || voice.name.toLowerCase().includes('man') :
                voice.name.toLowerCase().includes('en')
              );

              if (preferredVoice) {
                utterance.voice = preferredVoice;
              }

              window.speechSynthesis.speak(utterance);
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

    try {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(currentReminder.rudeMessage);

        // Apply voice character settings
        const voices = window.speechSynthesis.getVoices();
        const voiceSettings = {
          'default': { rate: 1.0, pitch: 1.2, voiceType: 'female' },
          'drill-sergeant': { rate: 1.3, pitch: 0.7, voiceType: 'male' },
          'robot': { rate: 0.8, pitch: 0.6, voiceType: 'male' },
          'british-butler': { rate: 0.85, pitch: 0.8, voiceType: 'male' },
          'mom': { rate: 1.0, pitch: 1.3, voiceType: 'female' },
          'confident-leader': { rate: 1.1, pitch: 0.8, voiceType: 'male' }
        };

        const settings = voiceSettings[currentReminder.voiceCharacter as keyof typeof voiceSettings] || voiceSettings.default;
        utterance.rate = settings.rate;
        utterance.pitch = settings.pitch;

        // Try to find appropriate voice
        const preferredVoice = voices.find(voice => 
          settings.voiceType === 'female' ? voice.name.toLowerCase().includes('female') || voice.name.toLowerCase().includes('woman') :
          settings.voiceType === 'male' ? voice.name.toLowerCase().includes('male') || voice.name.toLowerCase().includes('man') :
          voice.name.toLowerCase().includes('en')
        );

        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        utterance.onend = () => setIsPlayingVoice(false);
        utterance.onerror = () => setIsPlayingVoice(false);

        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      setIsPlayingVoice(false);
      toast({
        title: "Voice Error",
        description: "Failed to play voice notification",
        variant: "destructive",
      });
    }
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
        description: "Great job getting it done!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark reminder as complete",
        variant: "destructive",
      });
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
  const hasTemporaryPremiumVoices = rewardedFeatures.premiumVoicesUntil > Date.now();

  const freeUsage = {
    reminders: monthlyUsage,
    voiceCharacters: Math.min(voices.length, FREE_LIMITS.voiceCharacters),
    effectiveLimit: effectiveReminderLimit,
  };



  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Guest Mode Banner */}
        {isGuest && (
          <Card className="mb-6 bg-gray-100 border-gray-300">
            <CardContent className="pt-6">
              <p className="text-sm text-gray-700">
                Register and subscribe for premium, just press Sign In above.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Welcome Header - Mobile Optimized */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-1 flex flex-wrap items-center gap-2">
                <span className="truncate">{isGuest ? "Welcome Guest" : `Hey ${(user as any)?.name || 'Developer'}`}</span>
                <Badge className="bg-gradient-to-r from-yellow-700 to-yellow-600 text-white text-xs flex-shrink-0">
                  <Star className="h-3 w-3 mr-1" />
                  Free
                </Badge>
              </h1>
            </div>
          </div>
        </div>



        {/* Reward Ad Banner */}
        <RewardAdBanner 
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
          currentReminders={freeUsage.reminders}
          maxReminders={freeUsage.effectiveLimit}
          hasTemporaryPremiumVoices={hasTemporaryPremiumVoices}
        />

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
            <TabsTrigger value="upgrade" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Upgrade
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6">
            <ReminderForm 
              isFreePlan={true} 
              currentReminderCount={freeUsage.reminders}
              maxReminders={freeUsage.effectiveLimit}
            />
          </TabsContent>

          <TabsContent value="manage" className="space-y-6">
            <RemindersList />
          </TabsContent>

          <TabsContent value="upgrade" className="space-y-6">
            <Card className="bg-white border-[#EAEAEA] rounded-[24px] shadow-[var(--rr-card-shadow)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#111827]">
                  <Crown className="h-5 w-5 text-[#C53B3B]" />
                  Upgrade to Premium
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-[#6B7280]">
                  Unlock unlimited reminders, premium voice characters, personalized responses, and more!
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-[#111827]">Premium Features:</h3>
                    <ul className="space-y-2 text-sm text-[#6B7280]">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-[#C53B3B]" />
                        Unlimited reminders
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-[#C53B3B]" />
                        10 premium voice characters
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-[#C53B3B]" />
                        Up to 5 photos/videos per reminder
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-[#C53B3B]" />
                        Personalized responses
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-[#C53B3B]" />
                        Detailed analytics
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <div className="text-center p-4 bg-[#F9FAFB] rounded-[16px] border border-[#EAEAEA]">
                      <div className="text-2xl font-bold text-[#111827]">From $5.99/month</div>
                      <div className="text-sm text-[#6B7280]">$44.99 yearly or $5.99 monthly</div>
                    </div>
                    <Button 
                      className="w-full bg-[#C53B3B] hover:bg-[#A83232] text-white text-sm px-6 py-3 rounded-[14px] h-[52px]"
                      onClick={() => window.location.href = '/subscribe'}
                      data-testid="button-upgrade-premium-main"
                    >
                      <Crown className="h-4 w-4 mr-2" />
                      <span className="whitespace-nowrap">Choose Your Plan</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
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
                onClick={() => window.location.href = '/subscribe'}
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

      {/* Floating Help Button */}
      <div className="fixed bottom-4 right-4 z-50 flex gap-2">
        <HelpMenu />
      </div>
    </div>
  );
}