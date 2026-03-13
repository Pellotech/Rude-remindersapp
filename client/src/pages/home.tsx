import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/Navigation";
import ReminderForm from "@/components/ReminderForm";
import { IntroTour, useIntroTour } from "@/components/IntroTour";
import Sidebar from "@/components/Sidebar";
import { ShareButton } from "@/components/ShareButton";
import { getFullApiUrl } from "@/lib/queryClient";

export default function Home() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const { showIntro, closeIntro } = useIntroTour();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        setLocation("/login");
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
              fetch(getFullApiUrl('/api/voices/test'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
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
                        voice.name.includes('Mark')
                      );
                      break;
                    case 'british-male':
                      selectedVoice = voices.find(voice => voice.name.includes('Google UK English Male')) ||
                        voices.find(voice => 
                          voice.lang.includes('en-GB') && 
                          (voice.name.toLowerCase().includes('male') || voice.name.includes('Oliver'))
                        ) ||
                        voices.find(voice => voice.name.toLowerCase().includes('male') || voice.name.toLowerCase().includes('man'));
                      break;
                    case 'female':
                      selectedVoice = voices.find(voice => 
                        voice.name.includes('Female') ||
                        voice.name.includes('Samantha') ||
                        voice.name.includes('Victoria')
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Rude Reminders
            </h1>
            <p className="text-muted-foreground">
              Get things done with the perfect amount of motivation
            </p>
          </div>
          <ShareButton
            title="Discover Rude Reminders!"
            message="Found this amazing productivity app that gives me just the right push to get things done! Check out Rude Reminders."
          />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form Section */}
            <div className="lg:col-span-2">
              <ReminderForm />
            </div>

            {/* Sidebar */}
            <div>
              <Sidebar />
            </div>
          </div>
        </div>
      
      {/* Intro Tour */}
      <IntroTour isOpen={showIntro} onClose={closeIntro} />
    </div>
  );
}