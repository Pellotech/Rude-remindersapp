import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Bell,
  Crown,
  Lock,
  Zap,
  Star,
  TrendingUp,
  Calendar,
  MessageSquare,
  CheckCircle,
  Gift,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import ReminderForm from "@/components/ReminderForm";
import { useToast } from "@/hooks/use-toast";

const FREE_LIMITS = {
  reminders: 5,
  voiceCharacters: 1,
  attachments: 0,
  aiResponses: 3,
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
  const freeUsage = {
    reminders: Math.min(activeReminders.length, FREE_LIMITS.reminders),
    voiceCharacters: 1,
    attachments: 0,
    aiResponses: 3,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ""}! 
            <Badge variant="secondary" className="ml-2">Free Plan</Badge>
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Get motivated with personalized reminders. Upgrade for unlimited features!
          </p>
        </div>

        {/* Premium Upgrade Banner */}
        <Card className="mb-8 border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950 dark:to-yellow-950">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-6 w-6 text-orange-600" />
                <CardTitle className="text-orange-800 dark:text-orange-200">
                  Upgrade to Premium
                </CardTitle>
              </div>
              <Button className="bg-orange-600 hover:bg-orange-700">
                <Zap className="h-4 w-4 mr-2" />
                Upgrade Now
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-orange-600" />
                <span className="text-sm">Unlimited Reminders</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-orange-600" />
                <span className="text-sm">10 Voice Characters</span>
              </div>
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-orange-600" />
                <span className="text-sm">Photo Attachments</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-600" />
                <span className="text-sm">Advanced AI Responses</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Limits */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Reminders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{freeUsage.reminders} used</span>
                  <span>{FREE_LIMITS.reminders} limit</span>
                </div>
                <Progress 
                  value={(freeUsage.reminders / FREE_LIMITS.reminders) * 100} 
                  className="h-2"
                />
                {freeUsage.reminders >= FREE_LIMITS.reminders && (
                  <p className="text-xs text-orange-600">Limit reached! Upgrade for unlimited</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="opacity-60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Voice Characters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>1 available</span>
                  <span className="text-orange-600">Premium: 10</span>
                </div>
                <Progress value={10} className="h-2" />
                <p className="text-xs text-gray-500">Upgrade for more voices</p>
              </div>
            </CardContent>
          </Card>

          <Card className="opacity-60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Attachments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Not available</span>
                  <span className="text-orange-600">Premium only</span>
                </div>
                <Progress value={0} className="h-2" />
                <p className="text-xs text-gray-500">Photos & videos in Premium</p>
              </div>
            </CardContent>
          </Card>

          <Card className="opacity-60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4" />
                AI Responses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>3 per reminder</span>
                  <span className="text-orange-600">Premium: Unlimited</span>
                </div>
                <Progress value={30} className="h-2" />
                <p className="text-xs text-gray-500">More variety in Premium</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Create Reminder Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Create New Reminder
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReminderForm 
                isFreePlan={true} 
                currentReminderCount={freeUsage.reminders}
                maxReminders={FREE_LIMITS.reminders}
              />
            </CardContent>
          </Card>

          {/* Recent Activity & Stats */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Your Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Active Reminders</span>
                    <Badge variant="outline">{activeReminders.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Completed This Week</span>
                    <Badge variant="outline">{stats?.completedThisWeek || 0}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Success Rate</span>
                    <Badge variant="outline">{stats?.successRate || 0}%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Recent Reminders
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-sm text-gray-500">Loading...</p>
                ) : activeReminders.length === 0 ? (
                  <p className="text-sm text-gray-500">No active reminders. Create your first one!</p>
                ) : (
                  <div className="space-y-3">
                    {activeReminders.slice(0, 3).map((reminder: any) => (
                      <div key={reminder.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <div>
                          <p className="text-sm font-medium">{reminder.title}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(reminder.scheduledFor).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`
                            ${reminder.rudenessLevel <= 2 ? 'border-green-300 text-green-700' : ''}
                            ${reminder.rudenessLevel === 3 ? 'border-yellow-300 text-yellow-700' : ''}
                            ${reminder.rudenessLevel >= 4 ? 'border-red-300 text-red-700' : ''}
                          `}
                        >
                          Level {reminder.rudenessLevel}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}