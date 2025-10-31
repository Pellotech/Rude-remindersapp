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
  }) => Promise<void>;
  cancelReminder: (id: string) => Promise<void>; // Changed from number to string
  requestPermissions: () => Promise<boolean>;
}

export function useMobileNotifications(): MobileNotificationService {
  const { toast } = useToast();

  useEffect(() => {
    // Listen for notification actions
    LocalNotifications.addListener('localNotificationActionPerformed', 
      (notification: ActionPerformed) => {
        console.log('Notification action performed:', notification);
        
        // Handle notification tap - could open specific reminder
        if (notification.actionId === 'tap') {
          toast({
            title: "Reminder opened",
            description: notification.notification.title,
          });
        }
      }
    );

    return () => {
      LocalNotifications.removeAllListeners();
    };
  }, [toast]);

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
              hasAttachments: !!(reminder.attachments?.length)
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