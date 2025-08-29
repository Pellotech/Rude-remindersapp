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
  
} from "lucide-react";
import Navigation from "@/components/Navigation";
import ReminderForm from "@/components/ReminderForm";
import RemindersList from "@/components/RemindersList";
import { RichReminderNotification } from "@/components/RichReminderNotification";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Reminder } from "@shared/schema";

export default function HomePremium() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [currentReminder, setCurrentReminder] = useState<Reminder | null>(null);
  const [showRichNotification, setShowRichNotification] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ["/api/reminders"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
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

            // Play voice notification if enabled (premium gets all voice features)
            if (reminder.voiceNotification && window.speechSynthesis) {
              const utterance = new SpeechSynthesisUtterance(reminder.rudeMessage);
              
              // Apply voice character settings (premium has more options)
              const voices = window.speechSynthesis.getVoices();
              const voiceSettings = {
                'default': { rate: 1.0, pitch: 1.2, voiceType: 'female' },
                'drill-sergeant': { rate: 1.3, pitch: 0.7, voiceType: 'male' },
                'robot': { rate: 0.8, pitch: 0.6, voiceType: 'male' },
                'british-butler': { rate: 0.85, pitch: 0.8, voiceType: 'male' },
                'mom': { rate: 1.0, pitch: 1.3, voiceType: 'female' },
                'confident-leader': { rate: 1.1, pitch: 0.8, voiceType: 'male' },
                // Premium-only voice characters
                'therapist': { rate: 0.9, pitch: 1.1, voiceType: 'female' },
                'coach': { rate: 1.2, pitch: 0.9, voiceType: 'male' },
                'celebrity': { rate: 1.0, pitch: 1.0, voiceType: 'female' },
                'wise-elder': { rate: 0.8, pitch: 0.7, voiceType: 'male' }
              };

              const settings = voiceSettings[reminder.voiceCharacter] || voiceSettings.default;
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

  // Voice playback handler for premium
  const handleVoicePlay = () => {
    if (!currentReminder?.rudeMessage) return;
    
    setIsPlayingVoice(true);
    
    try {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(currentReminder.rudeMessage);
        
        // Apply voice character settings (premium has more options)
        const voices = window.speechSynthesis.getVoices();
        const voiceSettings = {
          'default': { rate: 1.0, pitch: 1.2, voiceType: 'female' },
          'drill-sergeant': { rate: 1.3, pitch: 0.7, voiceType: 'male' },
          'robot': { rate: 0.8, pitch: 0.6, voiceType: 'male' },
          'british-butler': { rate: 0.85, pitch: 0.8, voiceType: 'male' },
          'mom': { rate: 1.0, pitch: 1.3, voiceType: 'female' },
          'confident-leader': { rate: 1.1, pitch: 0.8, voiceType: 'male' },
          // Premium-only voice characters
          'therapist': { rate: 0.9, pitch: 1.1, voiceType: 'female' },
          'coach': { rate: 1.2, pitch: 0.9, voiceType: 'male' },
          'celebrity': { rate: 1.0, pitch: 1.0, voiceType: 'female' },
          'wise-elder': { rate: 0.8, pitch: 0.7, voiceType: 'male' }
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

  const activeReminders = reminders.filter((r: any) => !r.completed);
  const completedToday = reminders.filter((r: any) => 
    r.completed && 
    new Date(r.completedAt).toDateString() === new Date().toDateString()
  );

  

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      <div className="w-full px-4 py-8 max-w-none overflow-x-hidden">
        {/* Welcome Header - identical to free */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                Welcome back{user?.firstName ? `, ${user.firstName}` : ""}! 
                <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                  <Crown className="h-4 w-4 mr-1" />
                  Premium
                </Badge>
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Unleash the full power of AI-driven motivation with unlimited features
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-purple-600" />
              <span className="text-sm font-medium text-purple-600">All Features Unlocked</span>
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

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Completion Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">This Week</span>
                      <Badge variant="outline">{stats?.completedThisWeek || 0} completed</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Success Rate</span>
                      <Badge variant="outline">{stats?.successRate || 0}%</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Current Streak</span>
                      <Badge variant="outline">{stats?.currentStreak || 0} days</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Completed</span>
                      <Badge variant="outline">{completedToday.length} today</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Active Reminders</span>
                      <Badge variant="outline">{activeReminders.length} pending</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Category Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {['work', 'family', 'health', 'learning', 'household', 'finance', 'entertainment'].map((category) => {
                      const categoryReminders = reminders.filter((r: any) => 
                        r.context?.toLowerCase() === category
                      );
                      const completed = categoryReminders.filter((r: any) => r.completed).length;
                      const total = categoryReminders.length;
                      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
                      
                      // Only show categories that have reminders
                      if (total === 0) return null;
                      
                      return (
                        <div key={category} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm capitalize">{category}</span>
                            <span className="text-xs text-gray-400">({total} total)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-8">{percentage}%</span>
                          </div>
                        </div>
                      );
                    }).filter(Boolean)}
                    {reminders.length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        <p className="text-sm">No reminders yet. Create some to see your progress!</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Completion Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {reminders.length > 0 
                      ? Math.round((reminders.filter((r: any) => r.completed).length / reminders.length) * 100)
                      : 0
                    }%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {reminders.filter((r: any) => r.completed).length} of {reminders.length} completed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Most Productive Day
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(() => {
                      const dayCompletions = reminders
                        .filter((r: any) => r.completed && r.completedAt)
                        .reduce((acc: any, r: any) => {
                          const day = new Date(r.completedAt).toLocaleDateString('en-US', { weekday: 'long' });
                          acc[day] = (acc[day] || 0) + 1;
                          return acc;
                        }, {});
                      
                      const topDay = Object.entries(dayCompletions).reduce((a: any, b: any) => 
                        dayCompletions[a[0]] > dayCompletions[b[0]] ? a : b, ['None', 0]
                      );
                      
                      return topDay[0];
                    })()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Based on completion history
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Average Rudeness
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {reminders.length > 0 
                      ? (reminders.reduce((acc: number, r: any) => acc + (r.rudenessLevel || 3), 0) / reminders.length).toFixed(1)
                      : '3.0'
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Out of 5.0 max rudeness
                  </p>
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
    </div>
  );
}