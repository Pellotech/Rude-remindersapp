import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RichReminderNotification } from "@/components/RichReminderNotification";
import { NOTIFICATION_RECEIVED_EVENT, NotificationReceivedDetail } from "@/components/MobileNotifications";
import { Reminder } from "@shared/schema";
import { guestStorage } from "@/services/guestStorage";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface NotificationContextType {
  showNotification: (reminder: Reminder) => void;
  closeNotification: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotificationContext() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [currentReminder, setCurrentReminder] = useState<Reminder | null>(null);
  const [showRichNotification, setShowRichNotification] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const { isGuest, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const showNotification = useCallback((reminder: Reminder) => {
    console.log('📱 Global: Showing full-screen popup for reminder:', reminder.title);
    setCurrentReminder(reminder);
    setShowRichNotification(true);
  }, []);

  const closeNotification = useCallback(() => {
    setShowRichNotification(false);
    setCurrentReminder(null);
  }, []);

  useEffect(() => {
    const handleNotificationReceived = async (event: Event) => {
      const customEvent = event as CustomEvent<NotificationReceivedDetail>;
      console.log('📱 Global notification listener received event:', customEvent.detail);
      
      const { reminderId } = customEvent.detail;
      if (!reminderId) return;
      
      if (isGuest) {
        const guestReminders = guestStorage.getReminders();
        const reminder = guestReminders.find(r => r.id === reminderId);
        if (reminder) {
          showNotification(reminder);
        } else {
          toast({
            title: "Reminder not found",
            description: "The notification refers to a reminder that no longer exists",
            variant: "destructive",
          });
        }
        return;
      }
      
      try {
        // Use apiRequest to properly fetch with token + base URL for Capacitor
        const reminder = await apiRequest(`/api/reminders/${reminderId}`) as Reminder;
        showNotification(reminder);
      } catch (error) {
        console.error('Error fetching reminder for popup:', error);
        toast({
          title: "Could not load reminder",
          description: "Unable to display the reminder details",
          variant: "destructive",
        });
      }
    };
    
    window.addEventListener(NOTIFICATION_RECEIVED_EVENT, handleNotificationReceived);
    console.log('📱 Global notification listener registered');
    
    return () => {
      window.removeEventListener(NOTIFICATION_RECEIVED_EVENT, handleNotificationReceived);
    };
  }, [isGuest, showNotification, queryClient, toast]);

  const handleVoicePlay = () => {
    if (!currentReminder?.rudeMessage) return;

    setIsPlayingVoice(true);

    try {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(currentReminder.rudeMessage);

        const voices = window.speechSynthesis.getVoices();
        const voiceSettings: Record<string, { rate: number, pitch: number, voiceType: string }> = {
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

        const settings = voiceSettings[currentReminder.voiceCharacter as keyof typeof voiceSettings] || voiceSettings.default;
        utterance.rate = settings.rate;
        utterance.pitch = settings.pitch;

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

  const handleCompleteReminder = async () => {
    if (!currentReminder) return;

    try {
      if (isGuest) {
        guestStorage.completeReminder(currentReminder.id);
      } else {
        await apiRequest(`/api/reminders/${currentReminder.id}/complete`, { method: 'PATCH' });
      }
      
      await queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      await queryClient.invalidateQueries({ queryKey: ["guest-reminders"] });
      
      closeNotification();
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

  return (
    <NotificationContext.Provider value={{ showNotification, closeNotification }}>
      {children}
      
      {currentReminder && (
        <RichReminderNotification
          isOpen={showRichNotification}
          onClose={closeNotification}
          reminder={currentReminder}
          isPremium={isAuthenticated}
          features={{
            aiGeneratedResponses: isAuthenticated,
            aiGeneratedQuotes: isAuthenticated
          }}
          onComplete={handleCompleteReminder}
          onPlayVoice={handleVoicePlay}
          isPlayingVoice={isPlayingVoice}
        />
      )}
    </NotificationContext.Provider>
  );
}
