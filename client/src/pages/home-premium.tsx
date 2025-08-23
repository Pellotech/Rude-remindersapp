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

export default function HomePremium() {
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
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

        

        {/* Main Content Tabs - identical to free */}
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
            <TabsTrigger value="premium" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Premium Tools
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Create Premium Reminder
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReminderForm 
                  isFreePlan={false}
                  currentReminderCount={reminders.length}
                  maxReminders={999999}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage" className="space-y-6">
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
                      <span className="text-sm">Streak</span>
                      <Badge variant="outline">{stats?.currentStreak || 0} days</Badge>
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
                    {['work', 'health', 'personal', 'learning'].map((category) => {
                      const categoryReminders = reminders.filter((r: any) => 
                        r.context?.toLowerCase() === category
                      );
                      const completed = categoryReminders.filter((r: any) => r.completed).length;
                      const total = categoryReminders.length;
                      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
                      
                      return (
                        <div key={category} className="flex items-center justify-between">
                          <span className="text-sm capitalize">{category}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-600 transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-8">{percentage}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="premium" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    AI Response Generator
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    Generate unlimited fresh, personalized responses with advanced AI
                  </p>
                  <Button className="w-full">
                    <Brain className="h-4 w-4 mr-2" />
                    Open Response Lab
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Premium Voice Studio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    Test and customize all 10 premium voice characters
                  </p>
                  <Button className="w-full" variant="outline">
                    <Volume2 className="h-4 w-4 mr-2" />
                    Voice Studio
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}