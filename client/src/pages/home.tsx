
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import ReminderForm from "@/components/ReminderForm";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calendar,
  CheckCircle,
  Volume2,
  Brain,
  Camera,
  BarChart3
} from "lucide-react";

export default function Home() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();

  const { data: reminders = [] } = useQuery({
    queryKey: ["/api/reminders"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
  });

  const { data: voices = [] } = useQuery({
    queryKey: ["/api/voices"],
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // WebSocket connection for real-time notifications
  useEffect(() => {
    if (!isAuthenticated) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('Connected to WebSocket');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'reminder') {
          const { reminder } = data;
          
          // Show browser notification if enabled
          if (reminder.browserNotification && 'Notification' in window) {
            if (Notification.permission === 'granted') {
              new Notification(`Rude Reminder: ${reminder.title}`, {
                body: reminder.rudeMessage,
                icon: '/favicon.ico',
              });
            } else if (Notification.permission !== 'denied') {
              Notification.requestPermission().then((permission) => {
                if (permission === 'granted') {
                  new Notification(`Rude Reminder: ${reminder.title}`, {
                    body: reminder.rudeMessage,
                    icon: '/favicon.ico',
                  });
                }
              });
            }
          }

          // Handle voice notification from WebSocket
          if (reminder.voiceNotification && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(reminder.rudeMessage);
            
            // Fetch voice settings from backend for consistency
            if (reminder.voiceCharacter) {
              fetch('/api/voices/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  voiceCharacter: reminder.voiceCharacter,
                  testMessage: reminder.rudeMessage
                })
              })
              .then(response => response.json())
              .then(data => {
                if (data.voiceSettings) {
                  utterance.rate = data.voiceSettings.rate;
                  utterance.pitch = data.voiceSettings.pitch;
                  
                  const voices = speechSynthesis.getVoices();
                  let selectedVoice = null;

                  // Map voice types to actual browser voices
                  switch (data.voiceSettings.voiceType) {
                    case 'male':
                    case 'upbeat-male':
                      selectedVoice = voices.find(voice => 
                        voice.name.includes('Male') || 
                        voice.name.includes('David') ||
                        voice.name.includes('Daniel') ||
                        voice.name.includes('Mark') ||
                        voice.gender === 'male'
                      );
                      break;
                    case 'british-male':
                      selectedVoice = voices.find(voice => 
                        voice.lang.includes('en-GB') || 
                        voice.name.includes('British') ||
                        voice.name.includes('Oliver')
                      );
                      break;
                    case 'female':
                      selectedVoice = voices.find(voice => 
                        voice.name.includes('Female') ||
                        voice.name.includes('Samantha') ||
                        voice.name.includes('Victoria') ||
                        voice.gender === 'female'
                      );
                      break;
                    case 'robotic':
                      selectedVoice = voices.find(voice => 
                        voice.name.includes('Microsoft') || 
                        voice.name.includes('Computer') ||
                        voice.name.includes('Robot')
                      );
                      break;
                  }

                  if (selectedVoice) {
                    utterance.voice = selectedVoice;
                  }
                }
                speechSynthesis.speak(utterance);
              })
              .catch(() => {
                // Fallback to default voice
                utterance.rate = 1.0;
                utterance.pitch = 1.0;
                speechSynthesis.speak(utterance);
              });
            } else {
              utterance.rate = 1.0;
              utterance.pitch = 1.0;
              speechSynthesis.speak(utterance);
            }
          }

          // Show toast notification
          toast({
            title: `Reminder: ${reminder.title}`,
            description: reminder.rudeMessage,
            variant: reminder.rudenessLevel >= 4 ? "destructive" : "default",
          });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    socket.onclose = () => {
      console.log('Disconnected from WebSocket');
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      socket.close();
    };
  }, [isAuthenticated, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rude-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your rude reminders...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  const activeReminders = reminders.filter((r: any) => !r.completed);
  const completedToday = reminders.filter((r: any) => 
    r.completed && 
    new Date(r.completedAt).toDateString() === new Date().toDateString()
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ""}! 
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Create AI-powered reminders and stay motivated
          </p>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                Active Reminders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{activeReminders.length}</div>
              <p className="text-xs text-gray-500">{activeReminders.length}/5 used</p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Completed Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completedToday.length}</div>
              <p className="text-xs text-gray-500">Great progress!</p>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-purple-600" />
                Voice Characters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{voices.length}</div>
              <p className="text-xs text-gray-500">{voices.length} available</p>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950 dark:to-yellow-950">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Brain className="h-4 w-4 text-orange-600" />
                AI Response Quality
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">Premium</div>
              <p className="text-xs text-gray-500">Fresh responses</p>
            </CardContent>
          </Card>
        </div>

        {/* Feature Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Camera className="h-4 w-4 text-blue-600" />
                Photo Attachments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Add visual context with photos and videos
              </p>
            </CardContent>
          </Card>

          <Card className="border-purple-200">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-purple-600" />
                Voice Characters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Choose from unique voice personalities
              </p>
            </CardContent>
          </Card>

          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-green-600" />
                Basic Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Track your progress with completion metrics
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form Section */}
          <div className="lg:col-span-2">
            <ReminderForm 
              isFreePlan={false}
              currentReminderCount={activeReminders.length}
              maxReminders={999}
            />
          </div>
          
          {/* Sidebar */}
          <div>
            <Sidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
