import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/Navigation";
import ReminderForm from "@/components/ReminderForm";

import Sidebar from "@/components/Sidebar";

export default function Home() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

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

          // Speak reminder if voice notification is enabled
          if (reminder.voiceNotification && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(reminder.rudeMessage);
            
            // Apply voice character settings if available
            if (reminder.voiceCharacter) {
              const voices = speechSynthesis.getVoices();
              let selectedVoice = null;

              switch (reminder.voiceCharacter) {
                case 'drill-sergeant':
                  utterance.rate = 1.3;
                  utterance.pitch = 0.7;
                  // Select male voice for drill sergeant (Dan)
                  selectedVoice = voices.find(voice => 
                    voice.name.includes('Male') || 
                    voice.name.includes('David') ||
                    voice.name.includes('Mark') ||
                    voice.gender === 'male'
                  );
                  break;
                
                case 'motivational-coach':
                  utterance.rate = 1.4;
                  utterance.pitch = 0.9;
                  // Select upbeat male voice for coach (Dan)
                  selectedVoice = voices.find(voice => 
                    voice.name.includes('Male') || 
                    voice.name.includes('Daniel') ||
                    voice.gender === 'male'
                  );
                  break;
                
                case 'robot':
                  utterance.rate = 0.8;
                  utterance.pitch = 0.6;
                  selectedVoice = voices.find(voice => 
                    voice.name.includes('Microsoft') || 
                    voice.name.includes('Computer')
                  );
                  break;
                
                case 'british-butler':
                  utterance.rate = 0.85;
                  utterance.pitch = 0.8;
                  // British man voice
                  selectedVoice = voices.find(voice => 
                    voice.lang.includes('en-GB') || 
                    voice.name.includes('British') ||
                    voice.name.includes('Oliver')
                  );
                  break;
                
                case 'default':
                case 'mom':
                  utterance.rate = 1.0;
                  utterance.pitch = 1.2;
                  // Middle-aged woman voice (Scarlett)
                  selectedVoice = voices.find(voice => 
                    voice.name.includes('Female') ||
                    voice.name.includes('Samantha') ||
                    voice.name.includes('Victoria') ||
                    voice.gender === 'female'
                  );
                  break;
                
                default:
                  utterance.rate = 1.0;
                  utterance.pitch = 1.0;
              }

              if (selectedVoice) {
                utterance.voice = selectedVoice;
              }
            } else {
              utterance.rate = 1.0;
              utterance.pitch = 1.0;
            }
            
            speechSynthesis.speak(utterance);
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
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
    </div>
  );
}
