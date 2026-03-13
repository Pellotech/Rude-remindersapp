import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RichReminderNotification } from "@/components/RichReminderNotification";
import { NOTIFICATION_RECEIVED_EVENT, NotificationReceivedDetail } from "@/components/MobileNotifications";
import { Reminder } from "@shared/schema";
import { guestStorage } from "@/services/guestStorage";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function findPreferredVoice(voices: SpeechSynthesisVoice[], voiceType: string): SpeechSynthesisVoice | undefined {
  if (voiceType === 'british-male') {
    return voices.find(v => v.name.includes('Google UK English Male')) ||
      voices.find(v => v.lang.includes('en-GB') && (v.name.toLowerCase().includes('male') || v.name.includes('Oliver') || v.name.includes('Arthur'))) ||
      voices.find(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('man'));
  }
  if (voiceType === 'male') {
    return voices.find(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('man') || v.name.includes('David') || v.name.includes('Daniel'));
  }
  if (voiceType === 'female') {
    return voices.find(v => v.name.includes('Google US English') && v.name.includes('Female')) ||
      voices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman') || v.name.includes('Samantha') || v.name.includes('Victoria'));
  }
  return voices.find(v => v.lang.includes('en'));
}

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
        console.log('POPUP fetch reminderId:', reminderId);
        console.log('POPUP full URL:', `/api/reminders/${reminderId}`);
        const reminder = await apiRequest(`/api/reminders/${reminderId}`) as Reminder;
        console.log('POPUP reminder fetched:', reminder?.id);
        showNotification(reminder);
      } catch (error: any) {
        console.error('POPUP fetch error:', error?.message || error);
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

  const handleVoicePlay = async () => {
    if (!currentReminder?.rudeMessage) return;

    setIsPlayingVoice(true);

    try {
      const { getAuthToken, getFullApiUrl } = await import('@/lib/queryClient');
      const token = getAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(getFullApiUrl('/api/voices/test'), {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          voiceCharacter: currentReminder.voiceCharacter || 'default',
          testMessage: currentReminder.rudeMessage,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.audioUrl) {
          const audio = new Audio(data.audioUrl);
          audio.onended = () => setIsPlayingVoice(false);
          audio.onerror = () => {
            setIsPlayingVoice(false);
            playFallbackSpeech(currentReminder.rudeMessage, currentReminder.voiceCharacter || 'default');
          };
          await audio.play();
          return;
        }
      }
      playFallbackSpeech(currentReminder.rudeMessage, currentReminder.voiceCharacter || 'default');
    } catch {
      setIsPlayingVoice(false);
      playFallbackSpeech(currentReminder.rudeMessage, currentReminder.voiceCharacter || 'default');
    }
  };

  const playFallbackSpeech = (text: string, voiceCharacter: string) => {
    try {
      if (!('speechSynthesis' in window)) {
        setIsPlayingVoice(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      const voiceSettings: Record<string, { rate: number, pitch: number, voiceType: string }> = {
        'default': { rate: 1.0, pitch: 1.2, voiceType: 'female' },
        'confident-leader': { rate: 1.1, pitch: 0.8, voiceType: 'male' },
        'british-butler': { rate: 0.9, pitch: 0.6, voiceType: 'british-male' },
        'karen-nag': { rate: 1.25, pitch: 1.5, voiceType: 'female' }
      };
      const settings = voiceSettings[voiceCharacter] || voiceSettings.default;
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = findPreferredVoice(voices, settings.voiceType);
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      utterance.onend = () => setIsPlayingVoice(false);
      utterance.onerror = () => setIsPlayingVoice(false);
      window.speechSynthesis.speak(utterance);
    } catch {
      setIsPlayingVoice(false);
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
