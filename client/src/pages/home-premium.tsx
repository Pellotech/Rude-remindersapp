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
  Eye,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import ReminderForm from "@/components/ReminderForm";
import RemindersList from "@/components/RemindersList";
import { useToast } from "@/hooks/use-toast";

export default function HomePremium() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [previewReminder, setPreviewReminder] = useState<any | null>(null);

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

            // Show browser notification if enabled
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

            // Show rich toast notification with full premium content
            const toastDescription = reminder.motivationalQuote 
              ? `${reminder.rudeMessage}\n\n💪 ${reminder.motivationalQuote}`
              : reminder.rudeMessage;

            toast({
              title: `⏰ ${reminder.title}`,
              description: toastDescription,
              duration: 15000, // Even longer duration for premium users
              className: "max-w-lg text-left" // Slightly larger for premium
            });

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

  const activeReminders = reminders.filter((r: any) => !r.completed);
  const completedToday = reminders.filter((r: any) => 
    r.completed && 
    new Date(r.completedAt).toDateString() === new Date().toDateString()
  );

  const previewOverdueReminder = (reminder: any) => {
    setPreviewReminder(reminder);

    // Show premium preview toast with full features
    const toastDescription = reminder.motivationalQuote 
      ? `${reminder.rudeMessage}\n\n💪 ${reminder.motivationalQuote}`
      : reminder.rudeMessage;

    toast({
      title: `Premium Preview: ${reminder.title}`,
      description: toastDescription,
      duration: 10000,
      className: "max-w-lg text-left whitespace-pre-line"
    });

    // Play voice preview with premium voice options
    if (reminder.voiceNotification && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(reminder.rudeMessage);
      
      // Premium voice character settings
      const voiceSettings = {
        'default': { rate: 1.0, pitch: 1.2, voiceType: 'female' },
        'drill-sergeant': { rate: 1.3, pitch: 0.7, voiceType: 'male' },
        'robot': { rate: 0.8, pitch: 0.6, voiceType: 'male' },
        'british-butler': { rate: 0.85, pitch: 0.8, voiceType: 'male' },
        'mom': { rate: 1.0, pitch: 1.3, voiceType: 'female' },
        'confident-leader': { rate: 1.1, pitch: 0.8, voiceType: 'male' },
        'therapist': { rate: 0.9, pitch: 1.1, voiceType: 'female' },
        'coach': { rate: 1.2, pitch: 0.9, voiceType: 'male' },
        'celebrity': { rate: 1.0, pitch: 1.0, voiceType: 'female' },
        'wise-elder': { rate: 0.8, pitch: 0.7, voiceType: 'male' }
      };

      const settings = voiceSettings[reminder.voiceCharacter] || voiceSettings.default;
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;

      speechSynthesis.speak(utterance);
    }
  };

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
            {/* Overdue Reminders Section for Premium Users */}
            {activeReminders.filter((r: any) => new Date(r.scheduledFor) < new Date()).length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-red-700 flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <Crown className="h-4 w-4 text-purple-600" />
                    Premium Overdue Reminders ({activeReminders.filter((r: any) => new Date(r.scheduledFor) < new Date()).length})
                  </CardTitle>
                  <p className="text-sm text-red-600">
                    Preview your overdue reminders with full premium features including AI responses and premium voice characters.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {activeReminders
                      .filter((r: any) => new Date(r.scheduledFor) < new Date())
                      .map((reminder: any) => (
                        <div key={reminder.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">{reminder.title}</h4>
                            <p className="text-sm text-gray-600 truncate">"{reminder.originalMessage}"</p>
                            <p className="text-xs text-red-600">
                              Due: {new Date(reminder.scheduledFor).toLocaleString()}
                            </p>
                            {reminder.voiceCharacter && reminder.voiceCharacter !== 'default' && (
                              <p className="text-xs text-purple-600">
                                Voice: {reminder.voiceCharacter.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                              onClick={() => previewOverdueReminder(reminder)}
                              title="Preview full premium reminder"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <RemindersList />

            {/* Premium Preview Modal */}
            {previewReminder && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Crown className="h-5 w-5 text-purple-600" />
                      Premium Overdue Preview
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewReminder(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-sm text-gray-600 mb-2">Title</h4>
                      <p className="font-semibold">{previewReminder.title}</p>
                    </div>

                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <h4 className="font-medium text-sm text-red-700 mb-2">Original Message</h4>
                      <p className="text-gray-800">"{previewReminder.originalMessage}"</p>
                    </div>

                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <h4 className="font-medium text-sm text-purple-700 mb-2 flex items-center gap-1">
                        <Sparkles className="h-4 w-4" />
                        Premium AI Response
                      </h4>
                      <p className="text-purple-800 font-medium whitespace-pre-line">
                        {previewReminder.rudeMessage}
                        {previewReminder.motivationalQuote && (
                          <span className="block mt-2 text-green-700">💪 {previewReminder.motivationalQuote}</span>
                        )}
                      </p>
                    </div>

                    {previewReminder.voiceCharacter && previewReminder.voiceCharacter !== 'default' && (
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="font-medium text-sm text-blue-700 mb-2">Premium Voice Character</h4>
                        <p className="text-blue-800 capitalize">
                          {previewReminder.voiceCharacter.replace('-', ' ')}
                        </p>
                      </div>
                    )}

                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <h4 className="font-medium text-sm text-yellow-700 mb-2">Scheduled For</h4>
                      <p className="text-yellow-800">
                        {new Date(previewReminder.scheduledFor).toLocaleString()}
                      </p>
                      <p className="text-xs text-red-600 mt-1">
                        ⚠️ This reminder is overdue
                      </p>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={() => previewOverdueReminder(previewReminder)}
                        className="flex items-center gap-2"
                        variant="outline"
                      >
                        <Eye className="h-4 w-4" />
                        Preview Again
                      </Button>
                      <Button
                        onClick={() => setPreviewReminder(null)}
                        variant="secondary"
                        className="flex-1"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
    </div>
  );
}