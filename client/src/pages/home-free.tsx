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

// Free plan limits
const FREE_LIMITS = {
  reminders: 12, // 12 reminders per month
  voiceCharacters: 3,
  attachments: 1,
};

export default function HomeFree() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [currentReminder, setCurrentReminder] = useState<Reminder | null>(null);
  const [showRichNotification, setShowRichNotification] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [rewardedFeatures, setRewardedFeatures] = useState({
    extraReminders: 0, // Extra reminders from watching ads
    premiumVoicesUntil: 0, // Timestamp when premium voices expire
  });
  

  const { data: reminders = [], isLoading } = useQuery<Reminder[]>({
    queryKey: ["/api/reminders"],
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
      await apiRequest('POST', `/api/reminders/${currentReminder.id}/complete`);
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
        {/* Welcome Header - Mobile Optimized */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-1 flex flex-wrap items-center gap-2">
                <span className="truncate">Welcome back{(user as User)?.firstName ? `, ${(user as User).firstName}` : ""}!</span>
                <Badge className="bg-gradient-to-r from-blue-600 to-green-600 text-white text-xs flex-shrink-0">
                  <Star className="h-3 w-3 mr-1" />
                  Free
                </Badge>
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                From funny to gentle warm reminders to get your goals done, with unlimited responses (in premium)
              </p>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              <span className="text-xs sm:text-sm font-medium text-blue-600 whitespace-nowrap">Free Features Active</span>
            </div>
          </div>
        </div>



        {/* Free Plan Usage Overview */}
        <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200 mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h3 className="font-semibold text-blue-800">Free Plan Usage</h3>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-blue-600" />
                    <span>{freeUsage.reminders}/{freeUsage.effectiveLimit} reminders this month</span>
                    {rewardedFeatures.extraReminders > 0 && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        +{rewardedFeatures.extraReminders} bonus
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-blue-600" />
                    <span>{freeUsage.voiceCharacters}/{FREE_LIMITS.voiceCharacters} voice characters</span>
                    {hasTemporaryPremiumVoices && (
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                        Premium active
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
                variant="outline" 
                className="border-blue-300 text-blue-700 hover:bg-blue-100 text-xs sm:text-sm px-2 sm:px-4"
                onClick={() => window.location.href = '/subscribe'}
              >
                <Crown className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="whitespace-nowrap">Upgrade</span>
              </Button>
            </div>
          </CardContent>
        </Card>

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

        {/* Main Content Tabs - analytics shows upgrade prompt for free users */}
        <Tabs defaultValue="create" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
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
              hasTemporaryPremiumVoices={hasTemporaryPremiumVoices}
            />
            {/* Free Plan Features Info */}
            <div className="text-center text-sm text-muted-foreground p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
              <div className="space-y-2">
                <p className="font-medium text-blue-800">✨ Free Plan Features Active</p>
                <p>• Template-based motivational responses</p>
                <p>• Browser & voice notifications</p>
                <p>• Up to {freeUsage.effectiveLimit} reminders per month (resets monthly)</p>
                {rewardedFeatures.extraReminders > 0 && (
                  <p className="text-green-700 font-medium">• +{rewardedFeatures.extraReminders} bonus reminders from watching ads!</p>
                )}
                {hasTemporaryPremiumVoices && (
                  <p className="text-purple-700 font-medium">• Premium voices unlocked for {Math.ceil((rewardedFeatures.premiumVoicesUntil - Date.now()) / 60000)} minutes!</p>
                )}
                <p>• Basic voice characters</p>
                <div className="pt-2 border-t border-blue-200 mt-3">
                  <p className="text-xs">Notifications use your settings from Settings → Notifications</p>
                  <Button
                    type="button"
                    variant="link"
                    className="text-blue-600 hover:text-blue-800 p-0 h-auto text-xs"
                    onClick={() => window.location.href = '/settings/notifications'}
                  >
                    Change notification settings
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="manage" className="space-y-6">
            <RemindersList />

            
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {/* Premium Upgrade Prompt for Analytics */}
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2 text-purple-800">
                  <TrendingUp className="h-6 w-6" />
                  Analytics - Premium Feature
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <p className="text-purple-700 mb-4">
                    Unlock detailed insights into your productivity patterns and reminder completion trends!
                  </p>

                  {/* Preview of what analytics would show */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 opacity-60 pointer-events-none">
                    <Card className="border-purple-100">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-purple-800">Completion Trends</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-purple-600">This Week</span>
                            <Badge variant="outline" className="text-purple-600 border-purple-300">? completed</Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-purple-600">Success Rate</span>
                            <Badge variant="outline" className="text-purple-600 border-purple-300">?%</Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-purple-600">Current Streak</span>
                            <Badge variant="outline" className="text-purple-600 border-purple-300">? days</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-purple-100">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-purple-800">Category Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {['Work', 'Health', 'Personal'].map((category) => (
                            <div key={category} className="flex items-center justify-between">
                              <span className="text-sm text-purple-600">{category}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-purple-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-purple-400 w-1/2" />
                                </div>
                                <span className="text-xs text-purple-500 w-6">?%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-purple-100 to-transparent z-10 rounded-lg"></div>
                    <div className="text-center py-8">
                      <Crown className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-purple-800 mb-2">Premium Analytics Include:</h3>
                      <ul className="text-sm text-purple-700 space-y-1 mb-6">
                        <li>• Detailed completion trends and streaks</li>
                        <li>• Category-wise performance breakdown</li>
                        <li>• Most productive days analysis</li>
                        <li>• Average rudeness level tracking</li>
                        <li>• Weekly and monthly progress reports</li>
                      </ul>
                      <Button 
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white w-full text-xs sm:text-sm px-3 sm:px-6"
                        onClick={() => window.location.href = '/subscribe'}
                        data-testid="button-upgrade-premium-analytics"
                      >
                        <Crown className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span className="whitespace-nowrap">Upgrade - From $4/mo</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upgrade" className="space-y-6">
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-800">
                  <Crown className="h-5 w-5" />
                  Upgrade to Premium
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-purple-700">
                  Unlock unlimited reminders, premium voice characters, advanced AI responses, and more!
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-purple-800">Premium Features:</h3>
                    <ul className="space-y-2 text-sm text-purple-700">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Unlimited reminders
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        10 premium voice characters
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Up to 5 photos/videos per reminder
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Advanced AI responses
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Detailed analytics
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <div className="text-center p-4 bg-white rounded-lg border border-purple-200">
                      <div className="text-2xl font-bold text-purple-800">From $4/month</div>
                      <div className="text-sm text-purple-600">$48 yearly or $6 monthly</div>
                    </div>
                    <Button 
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-xs sm:text-sm px-3 sm:px-6 py-2 sm:py-3"
                      onClick={() => window.location.href = '/settings/billing'}
                      data-testid="button-upgrade-premium-main"
                    >
                      <Crown className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
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
      <div className="fixed bottom-4 right-4 z-50">
        <HelpMenu />
      </div>
    </div>
  );
}