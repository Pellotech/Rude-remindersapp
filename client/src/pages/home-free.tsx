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
} from "lucide-react";
import Navigation from "@/components/Navigation";
import ReminderForm from "@/components/ReminderForm";
import RemindersList from "@/components/RemindersList";
import { useToast } from "@/hooks/use-toast";

// Free plan limits
const FREE_LIMITS = {
  reminders: 5,
  voiceCharacters: 3,
  attachments: 1,
};

export default function HomeFree() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);

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
          if (data.type === "reminder") {
            const { reminder } = data;

            if (reminder.browserNotification && "Notification" in window) {
              if (Notification.permission === "granted") {
                new Notification(`Rude Reminder: ${reminder.title}`, {
                  body: reminder.rudeMessage,
                  icon: "/favicon.ico",
                });
              }
            }

            toast({
              title: `⏰ ${reminder.title}`,
              description: reminder.rudeMessage,
              duration: 8000,
            });
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

  // Calculate free usage
  const freeUsage = {
    reminders: activeReminders.length,
    voiceCharacters: Math.min(voices.length, FREE_LIMITS.voiceCharacters),
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Welcome Header - identical to premium */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                Welcome back{user?.firstName ? `, ${user.firstName}` : ""}! 
                <Badge className="bg-gradient-to-r from-blue-600 to-green-600 text-white">
                  <Star className="h-4 w-4 mr-1" />
                  Free
                </Badge>
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Get started with AI-powered reminders and motivation
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">Free Features Active</span>
            </div>
          </div>
        </div>



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
              maxReminders={FREE_LIMITS.reminders}
            />
            {/* Notification Settings Info */}
            <div className="text-center text-sm text-muted-foreground p-3 bg-blue-50 rounded-lg">
              <p>Notifications will use your preferences from Settings → Notifications</p>
              <Button
                type="button"
                variant="link"
                className="text-blue-600 hover:text-blue-800 p-0 h-auto text-sm"
                onClick={() => window.location.href = '/settings/notifications'}
              >
                Change notification settings
              </Button>
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
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                        onClick={() => window.location.href = '/subscribe'}
                        data-testid="button-upgrade-premium-analytics"
                      >
                        <Crown className="h-4 w-4 mr-2" />
                        Upgrade to Premium - From $4/month
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
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      onClick={() => window.location.href = '/subscribe'}
                      data-testid="button-upgrade-premium-main"
                    >
                      <Crown className="h-4 w-4 mr-2" />
                      Choose Your Plan
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}