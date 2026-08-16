import { useState, useEffect, useRef, createContext, useContext, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RichReminderNotification } from "@/components/RichReminderNotification";
import { NOTIFICATION_RECEIVED_EVENT, NotificationReceivedDetail } from "@/components/MobileNotifications";
import { Reminder } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { speakWithCallback } from "@/services/ttsService";

function findPreferredVoice(voices: SpeechSynthesisVoice[], voiceType: string): SpeechSynthesisVoice | undefined {
  console.log(`🎙️ [TTS-DIAG] findPreferredVoice called | voiceType="${voiceType}" | available voices: ${voices.length}`);
  if (voices.length > 0) {
    console.log(`🎙️ [TTS-DIAG] Voice list:`, voices.map(v => `${v.name} (${v.lang})`).join(', '));
  } else {
    console.warn(`🎙️ [TTS-DIAG] ⚠️ NO VOICES available from getVoices()`);
  }
  let result: SpeechSynthesisVoice | undefined;
  if (voiceType === 'british-male') {
    result = voices.find(v => v.name.includes('Google UK English Male')) ||
      voices.find(v => v.lang.includes('en-GB') && (v.name.toLowerCase().includes('male') || v.name.includes('Oliver') || v.name.includes('Arthur'))) ||
      voices.find(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('man'));
  } else if (voiceType === 'male') {
    result = voices.find(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('man') || v.name.includes('David') || v.name.includes('Daniel'));
  } else if (voiceType === 'female') {
    result = voices.find(v => v.name.includes('Google US English') && v.name.includes('Female')) ||
      voices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman') || v.name.includes('Samantha') || v.name.includes('Victoria'));
  } else {
    result = voices.find(v => v.lang.includes('en'));
  }
  console.log(`🎙️ [TTS-DIAG] Selected voice: ${result ? `${result.name} (${result.lang})` : 'NONE - using default'}`);
  return result;
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
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const autoPlayedRef = useRef<string | null>(null);

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
  }, [showNotification, queryClient, toast]);

  useEffect(() => {
    if (showRichNotification && currentReminder && currentReminder.rudeMessage) {
      if (autoPlayedRef.current === currentReminder.id) {
        console.log(`🎙️ [TTS-DIAG] Auto-play skipped — already played for reminder ${currentReminder.id}`);
        return;
      }
      console.log(`🎙️ [TTS-DIAG] Auto-play triggered for reminder "${currentReminder.title}" | character="${currentReminder.voiceCharacter}" | id=${currentReminder.id}`);
      autoPlayedRef.current = currentReminder.id;
      const timer = setTimeout(() => {
        handleVoicePlay();
      }, 600);
      return () => clearTimeout(timer);
    }
    if (!showRichNotification) {
      autoPlayedRef.current = null;
    }
  }, [showRichNotification, currentReminder]);

  const handleVoicePlay = async () => {
    console.log(`🎙️ [TTS-DIAG] NotificationProvider.handleVoicePlay called | reminder="${currentReminder?.title}" | character="${currentReminder?.voiceCharacter}" | hasMessage=${!!currentReminder?.rudeMessage}`);
    if (!currentReminder?.rudeMessage) {
      console.warn(`🎙️ [TTS-DIAG] handleVoicePlay aborted — no rudeMessage`);
      return;
    }

    setIsPlayingVoice(true);

    const variations = currentReminder.responses && currentReminder.responses.length > 0
      ? currentReminder.responses.slice(0, 2)
      : [currentReminder.rudeMessage];
    const fullText = variations.join(' ... ');
    const character = currentReminder.voiceCharacter || 'default';

    speakWithCallback(fullText, character, () => setIsPlayingVoice(false), () => setIsPlayingVoice(false));
  };

  const handleCompleteReminder = async () => {
    if (!currentReminder) return;

    try {
      await apiRequest(`/api/reminders/${currentReminder.id}/complete`, { method: 'PATCH' });

      await queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });

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
    } finally {
      // Always close, even if the request failed — matches "Let you know
      // later" and "Didn't do it" below, and keeps the dialog from getting
      // stuck open if the network call errors.
      closeNotification();
    }
  };

  // "Didn't do it" — this was previously never wired up here, so the button
  // did nothing when the dialog was opened via a push/real-time notification
  // (as opposed to the in-app flow in home.tsx, which already had it).
  const handleMissedReminder = async () => {
    if (!currentReminder) return;

    try {
      await apiRequest(`/api/reminders/${currentReminder.id}/not-accomplished`, { method: 'PATCH' });

      await queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });

      toast({
        title: "Logged 💪",
        description: "Tomorrow is a new chance. This reminder clears in 24 hours.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log reminder",
        variant: "destructive",
      });
    } finally {
      closeNotification();
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
          onMissed={handleMissedReminder}
          onPlayVoice={handleVoicePlay}
          isPlayingVoice={isPlayingVoice}
        />
      )}
    </NotificationContext.Provider>
  );
}
