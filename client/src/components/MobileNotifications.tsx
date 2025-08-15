import { useEffect } from "react";
import { 
  LocalNotifications, 
  ScheduleOptions,
  ActionPerformed,
  LocalNotificationSchema
} from "@capacitor/local-notifications";
import { useToast } from "@/hooks/use-toast";

interface MobileNotificationService {
  scheduleReminder: (reminder: {
    id: number;
    title: string;
    body: string;
    scheduledFor: Date;
    attachments?: string[];
    motivationalQuote?: string;
  }) => Promise<void>;
  cancelReminder: (id: number) => Promise<void>;
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
    id: number;
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
            id: reminder.id,
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

  const cancelReminder = async (id: number) => {
    try {
      await LocalNotifications.cancel({ notifications: [{ id }] });
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