import { useEffect } from "react";
import { 
  LocalNotifications, 
  ScheduleOptions,
  ActionPerformed,
  LocalNotificationSchema
} from "@capacitor/local-notifications";
import { useToast } from "@/hooks/use-toast";

// Convert UUID string to numeric ID for LocalNotifications
// Uses a simple hash function to generate consistent numeric IDs from UUID strings
function uuidToNumericId(uuid: string): number {
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    const char = uuid.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

interface MobileNotificationService {
  scheduleReminder: (reminder: {
    id: string; // Changed from number to string to accept UUID
    title: string;
    body: string;
    scheduledFor: Date;
    attachments?: string[];
    motivationalQuote?: string;
    voiceNotification?: boolean;
    voiceCharacter?: string;
  }) => Promise<void>;
  cancelReminder: (id: string) => Promise<void>; // Changed from number to string
  requestPermissions: () => Promise<boolean>;
}

export function useMobileNotifications(): MobileNotificationService {
  const { toast } = useToast();

  useEffect(() => {
    // Listen for notification actions when user taps notification
    LocalNotifications.addListener('localNotificationActionPerformed', 
      (notification: ActionPerformed) => {
        console.log('Notification action performed:', notification);
        
        // Handle notification tap - app just opened, play voice if enabled
        if (notification.actionId === 'tap') {
          const extra = notification.notification.extra;
          
          // Play voice when user taps notification and app opens
          if (extra?.shouldPlayVoice && extra?.voiceCharacter && window.speechSynthesis) {
            // Small delay to ensure app is fully in foreground
            setTimeout(() => {
              playVoiceNotification(notification.notification.body, extra.voiceCharacter);
            }, 500);
          }
          
          toast({
            title: "Reminder opened",
            description: notification.notification.title,
          });
        }
      }
    );

    // Listen for notifications that are received while app is open
    LocalNotifications.addListener('localNotificationReceived', 
      (notification: LocalNotificationSchema) => {
        console.log('Notification received while app is open:', notification);
        
        // Play voice if enabled (when app is open and notification fires)
        const extra = notification.extra;
        if (extra?.shouldPlayVoice && extra?.voiceCharacter && window.speechSynthesis) {
          playVoiceNotification(notification.body, extra.voiceCharacter);
        }
      }
    );

    return () => {
      LocalNotifications.removeAllListeners();
    };
  }, [toast]);

  // Play voice using browser's speech synthesis (works when app is open)
  const playVoiceNotification = (text: string, voiceCharacter: string) => {
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Voice character settings (matches backend settings)
      const voiceSettings: Record<string, { rate: number, pitch: number, voiceType: string }> = {
        'default': { rate: 1.0, pitch: 1.2, voiceType: 'female' },
        'drill-sergeant': { rate: 1.3, pitch: 0.7, voiceType: 'male' },
        'robot': { rate: 0.8, pitch: 0.6, voiceType: 'male' },
        'british-butler': { rate: 0.85, pitch: 0.8, voiceType: 'male' },
        'mom': { rate: 1.0, pitch: 1.3, voiceType: 'female' },
        'confident-leader': { rate: 1.1, pitch: 0.8, voiceType: 'male' }
      };

      const settings = voiceSettings[voiceCharacter] || voiceSettings.default;
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;

      // Try to find appropriate voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        settings.voiceType === 'female' ? voice.name.toLowerCase().includes('female') || voice.name.toLowerCase().includes('woman') :
        settings.voiceType === 'male' ? voice.name.toLowerCase().includes('male') || voice.name.toLowerCase().includes('man') :
        voice.name.toLowerCase().includes('en')
      );

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      window.speechSynthesis.speak(utterance);
      console.log(`🔊 Playing voice notification with character: ${voiceCharacter}`);
    } catch (error) {
      console.error('Error playing voice notification:', error);
    }
  };

  const requestPermissions = async (): Promise<boolean> => {
    try {
      const permission = await LocalNotifications.requestPermissions();
      return permission.display === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  };

  const scheduleReminder = async (reminder: {
    id: string;
    title: string;
    body: string;
    scheduledFor: Date;
    attachments?: string[];
    motivationalQuote?: string;
    voiceNotification?: boolean;
    voiceCharacter?: string;
  }) => {
    try {
      // Ensure permissions are granted
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        toast({
          title: "Permission required",
          description: "Please enable notifications to receive reminders",
          variant: "destructive",
        });
        return;
      }

      // Convert UUID to numeric ID for LocalNotifications
      const numericId = uuidToNumericId(reminder.id);

      // Prepare notification body with motivation
      let notificationBody = reminder.body;
      if (reminder.motivationalQuote) {
        notificationBody += `\n\n💪 ${reminder.motivationalQuote}`;
      }

      const options: ScheduleOptions = {
        notifications: [
          {
            title: reminder.title,
            body: notificationBody,
            id: numericId,
            schedule: { at: reminder.scheduledFor },
            sound: 'beep.wav',
            attachments: reminder.attachments?.map(url => ({
              id: `attachment_${Date.now()}`,
              url: url,
              options: {
                iosUNNotificationAttachmentOptionsTypeHintKey: 'public.jpeg',
              }
            })),
            actionTypeId: 'OPEN_REMINDER',
            extra: {
              reminderId: reminder.id,
              hasMotivation: !!reminder.motivationalQuote,
              hasAttachments: !!(reminder.attachments?.length),
              shouldPlayVoice: reminder.voiceNotification,
              voiceCharacter: reminder.voiceCharacter || 'default'
            }
          }
        ]
      };

      await LocalNotifications.schedule(options);
      
      toast({
        title: "Reminder scheduled",
        description: `Mobile notification set for ${reminder.scheduledFor.toLocaleDateString()}`,
      });

    } catch (error) {
      console.error('Error scheduling notification:', error);
      toast({
        title: "Scheduling failed",
        description: "Could not schedule mobile notification",
        variant: "destructive",
      });
    }
  };

  const cancelReminder = async (id: string) => {
    try {
      // Convert UUID to numeric ID to match the scheduled notification
      const numericId = uuidToNumericId(id);
      await LocalNotifications.cancel({ notifications: [{ id: numericId }] });
      console.log(`Cancelled notification with ID: ${id} (numeric: ${numericId})`);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  };

  return {
    scheduleReminder,
    cancelReminder,
    requestPermissions
  };
}