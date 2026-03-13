import { useState, useEffect, useRef, createContext, useContext, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RichReminderNotification } from "@/components/RichReminderNotification";
import { NOTIFICATION_RECEIVED_EVENT, NotificationReceivedDetail } from "@/components/MobileNotifications";
import { Reminder } from "@shared/schema";
import { guestStorage } from "@/services/guestStorage";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  const { isGuest, isAuthenticated } = useAuth();
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

    playFallbackSpeech(fullText, currentReminder.voiceCharacter || 'default');
  };

  const playFallbackSpeech = (text: string, voiceCharacter: string) => {
    console.log(`🎙️ [TTS-DIAG] NotificationProvider.playFallbackSpeech called | character="${voiceCharacter}" | speechSynthesis in window: ${'speechSynthesis' in window}`);
    try {
      if (!('speechSynthesis' in window)) {
        console.error(`🎙️ [TTS-DIAG] ❌ speechSynthesis NOT available in this WebView/browser`);
        setIsPlayingVoice(false);
        return;
      }
      console.log(`🎙️ [TTS-DIAG] speechSynthesis.speaking=${window.speechSynthesis.speaking}, pending=${window.speechSynthesis.pending}, paused=${window.speechSynthesis.paused}`);
      const utterance = new SpeechSynthesisUtterance(text);
      const voiceSettings: Record<string, { rate: number, pitch: number, voiceType: string }> = {
        'default': { rate: 0.85, pitch: 0.9, voiceType: 'female' },
        'confident-leader': { rate: 0.9, pitch: 0.6, voiceType: 'male' },
        'british-butler': { rate: 0.7, pitch: 0.2, voiceType: 'british-male' },
        'karen-nag': { rate: 1.2, pitch: 1.3, voiceType: 'female' }
      };
      const settings = voiceSettings[voiceCharacter] || voiceSettings.default;
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;
      console.log(`🎙️ [TTS-DIAG] NotificationProvider settings: rate=${settings.rate}, pitch=${settings.pitch}, voiceType="${settings.voiceType}"`);
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = findPreferredVoice(voices, settings.voiceType);
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      utterance.onstart = () => console.log(`🎙️ [TTS-DIAG] ✅ NotificationProvider utterance STARTED speaking`);
      utterance.onend = () => { console.log(`🎙️ [TTS-DIAG] ✅ NotificationProvider utterance ENDED`); setIsPlayingVoice(false); };
      utterance.onerror = (e) => { console.error(`🎙️ [TTS-DIAG] ❌ NotificationProvider utterance ERROR:`, e.error, e); setIsPlayingVoice(false); };
      window.speechSynthesis.speak(utterance);
      console.log(`🎙️ [TTS-DIAG] NotificationProvider: speechSynthesis.speak() called`);
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
