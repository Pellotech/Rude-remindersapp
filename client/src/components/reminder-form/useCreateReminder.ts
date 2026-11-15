// Create Reminder form: saving a reminder, then the success / error steps
// (Reem's animation, phone notifications, messages).
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { formValueToInstant } from "@/lib/timeZone";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { supportsNotifications } from "@/utils/platformDetection";
import { useMobileNotifications } from "../MobileNotifications";
import { incrementFreeReminderCount } from "./schema";

export function useCreateReminder({ isFreePlan, getAttachments, onReminderCreated, startCarry, onSaved }: {
  isFreePlan: boolean;
  /** Photos to send (read when saving). */
  getAttachments: () => string[];
  onReminderCreated?: () => void;
  /** Start Reem's "push the button away" animation. */
  startCarry: () => void;
  /** Clear the form back to the user's defaults. */
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { scheduleReminder: scheduleNativeNotification, requestPermissions } = useMobileNotifications();

  return useMutation({
    mutationFn: async (data: any) => {
      const submissionData = {
        ...data,
        title: data.originalMessage, // Use the original message as the title
        scheduledFor: data.scheduledFor ? formValueToInstant(data.scheduledFor).toISOString() : undefined,
        attachments: getAttachments(), // Ensure attachments are included
      };

      return await apiRequest("/api/reminders", {
        method: "POST",
        body: submissionData as any
      });
    },
    onSuccess: async (result) => {
      // Handle both single reminder and multi-day reminder responses
      const isMultiDayResult = result.count && result.reminders;

      if (isFreePlan) {
        incrementFreeReminderCount();
      }

      console.log('Ad action counter incremented: reminder created');
      onReminderCreated?.();

      // Kick off Reem's "steal the button" animation
      // (Runs for normal AND Quick Reminders — both use this same save step.)
      startCarry();

      toast({
        title: "Success!",
        description: isMultiDayResult
          ? `Created ${result.count} recurring reminders!`
          : `Your reminder has been created!`,
      });

      // Schedule native iOS/Android notifications if on mobile platform
      const notificationsSupported = supportsNotifications();
      console.log('🔔 Notifications supported:', notificationsSupported);

      if (notificationsSupported) {
        try {
          // Request notification permissions first
          console.log('📱 Requesting notification permissions...');
          const hasPermission = await requestPermissions();
          console.log('🔐 Permission granted:', hasPermission);

          if (hasPermission) {
            // Handle both single and multi-day reminders
            const remindersToSchedule = isMultiDayResult ? result.reminders : [result];
            console.log('📋 Reminders to schedule:', remindersToSchedule.length);

            for (const reminder of remindersToSchedule) {
              console.log('⏰ Scheduling notification for:', {
                id: reminder.id,
                title: reminder.title || reminder.originalMessage,
                scheduledFor: new Date(reminder.scheduledFor)
              });

              await scheduleNativeNotification({
                id: reminder.id,
                title: reminder.title || reminder.originalMessage,
                body: reminder.rudeMessage || reminder.originalMessage,
                scheduledFor: new Date(reminder.scheduledFor),
                attachments: reminder.attachments || [],
                motivationalQuote: reminder.motivationalQuote,
                voiceNotification: reminder.voiceNotification,
                voiceCharacter: reminder.voiceCharacter
              });
            }

            console.log(`✅ Scheduled ${remindersToSchedule.length} native notification(s)`);
          } else {
            console.warn('⚠️ No notification permission - showing toast');
            toast({
              title: "Notification Permissions Required",
              description: "Please enable notifications in Settings to receive reminders when the app is closed.",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error('❌ Failed to schedule native notifications:', error);
          // Don't block the success flow, just log the error
        }
      } else {
        console.log('ℹ️ Notifications not supported on this platform');
      }

      // Reset the form while preserving user defaults
      onSaved();

      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
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
      // Handle specific error codes
      try {
        // apiRequest throws "403: {json}" — strip the status prefix before parsing
        const rawMsg = error.message || '';
        const jsonStart = rawMsg.indexOf('{');
        let errorData: any = null;
        try {
          errorData = JSON.parse(jsonStart >= 0 ? rawMsg.slice(jsonStart) : rawMsg);
        } catch {
          // apiRequest cuts long messages at 200 characters, which can break the
          // JSON — pull the code and message out by pattern instead.
          const code = rawMsg.match(/"code"\s*:\s*"([A-Z_]+)"/)?.[1];
          const text = rawMsg.match(/"error"\s*:\s*"((?:[^"\\]|\\.)*)"/)?.[1];
          if (code) errorData = { code, error: text };
        }
        if (errorData?.code === 'REMINDER_LIMIT_EXCEEDED') {
          toast({
            title: "Reminder Limit Reached",
            description: errorData.error || `You've reached your reminder limit for this month. Your limit resets on ${errorData.resetDate || 'the 1st of next month'}.`,
            variant: "destructive",
          });
        } else if (errorData?.code === 'CONTENT_BLOCKED') {
          toast({
            title: "Can't Create This Reminder",
            description: errorData.error || "This reminder can't be created because it may reference harmful or illegal content. Please rephrase it.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to create reminder. Please try again.",
            variant: "destructive",
          });
        }
      } catch (e) {
        // Fallback for non-JSON error messages
        toast({
          title: "Error",
          description: "Failed to create reminder. Please try again.",
          variant: "destructive",
        });
      }
    },
  });
}
