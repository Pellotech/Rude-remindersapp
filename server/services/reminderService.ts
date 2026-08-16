import { storage } from "../storage";
import { notificationService } from "./notificationService";
import { smartResponseService } from "./smartResponseService";
import { moderationService } from "./moderationService";
import { log as slog } from "../utils/logger";
import type { Reminder } from "@shared/schema";

// Helper functions for reminder management
const createReminder = async (userId: string, reminder: Reminder): Promise<Reminder> => {
  return await storage.createReminder(userId, reminder);
};

const scheduleNotification = async (reminder: Reminder): Promise<void> => {
  console.log(`Scheduling notification for reminder: ${reminder.title}`);
  // Notification scheduling is handled by the ReminderService class
};

const generateReminder = async (reminder: Reminder): Promise<Reminder> => {
  return await generateReminderResponse(reminder);
};

const getMoreResponses = async (reminderId: string, userId: string): Promise<string[]> => {
  const reminder = await storage.getReminder(reminderId, userId);
  if (reminder) {
    return await smartResponseService.getPersonalizedResponse(reminder, true);
  }
  return ["More response 1", "More response 2"];
};

const followUpService = {
  scheduleFollowUps: async (reminder: Reminder): Promise<void> => {
    console.log(`Scheduling follow-ups for reminder: ${reminder.originalMessage}`);
    // Follow-up logic can be implemented here
  }
};


class ReminderService {
  private scheduledReminders = new Map<string, NodeJS.Timeout>();

  async initializeScheduler() {
    // Schedule all existing active reminders on startup
    const upcomingReminders = await storage.getUpcomingReminders();
    upcomingReminders.forEach(reminder => {
      this.scheduleReminder(reminder);
    });

    // Check for reminders every minute
    setInterval(async () => {
      await this.checkAndTriggerReminders();
    }, 60000);
  }

  scheduleReminder(reminder: Reminder) {
    const now = Date.now();
    const reminderTime = new Date(reminder.scheduledFor).getTime();
    const delay = reminderTime - now;

    if (delay > 0) {
      // Handle both short-term (minutes) and long-term reminders
      const timeout = setTimeout(async () => {
        await this.triggerReminder(reminder);
        this.scheduledReminders.delete(reminder.id);
      }, delay);

      this.scheduledReminders.set(reminder.id, timeout);
      
      const minutesFromNow = Math.round(delay / (1000 * 60));
      if (minutesFromNow <= 60) {
        console.log(`Scheduled quick reminder ${reminder.id} for ${minutesFromNow} minute(s) from now`);
      } else {
        console.log(`Scheduled reminder ${reminder.id} for ${reminder.scheduledFor}`);
      }
    } else {
      console.log(`Reminder ${reminder.id} is scheduled for the past, triggering immediately`);
      // If the reminder is scheduled for the past (edge case), trigger it immediately
      this.triggerReminder(reminder);
    }
  }

  unscheduleReminder(reminderId: string) {
    const timeout = this.scheduledReminders.get(reminderId);
    if (timeout) {
      clearTimeout(timeout);
      this.scheduledReminders.delete(reminderId);
      console.log(`Unscheduled reminder ${reminderId}`);
    }
  }

  private async triggerReminder(reminder: Reminder) {
    console.log(`Triggering reminder: ${reminder.title}`);

    try {
      // Get user for notification preferences
      const user = await storage.getUser(reminder.userId);
      if (!user) return;

      // Import smart response service
      // const { smartResponseService } = await import('./smartResponseService');
      // const { followUpService } = await import('./followupService');

      // Get personalized and contextual responses
      let personalizedResponses = await smartResponseService.getPersonalizedResponse(reminder);
      const contextualRemarks = await smartResponseService.getContextualRemarks(reminder);

      // This regenerates a FRESH response independent of whatever was checked
      // at creation time, so it needs its own moderation pass before it goes
      // out in a real notification. Falls back to the already-approved
      // rudeMessage from creation time rather than blocking the notification
      // entirely — the user still gets reminded, just with safe text.
      if (personalizedResponses[0]) {
        const outputCheck = await moderationService.checkContent(personalizedResponses[0]);
        if (outputCheck.flagged) {
          slog.warn('content_blocked', {
            reminderId: reminder.id,
            categories: outputCheck.categories,
            stage: 'trigger_regeneration',
          });
          personalizedResponses = [reminder.rudeMessage || `Time to ${reminder.originalMessage}!`];
        }
      }

      // Create enhanced reminder with multiple response options
      const enhancedReminder = {
        ...reminder,
        responseVariations: personalizedResponses,
        contextualRemarks: contextualRemarks,
        currentResponse: personalizedResponses[0] || reminder.rudeMessage
      };

      // Send notifications based on reminder and user preferences
      if (reminder.browserNotification && user.browserNotifications) {
        await notificationService.sendBrowserNotification(enhancedReminder, user);
      }

      if (reminder.voiceNotification && user.voiceNotifications) {
        await notificationService.sendVoiceNotification(enhancedReminder, user);
      }

      if (reminder.emailNotification && user.emailNotifications && user.email) {
        await notificationService.sendEmailNotification(enhancedReminder, user);
      }

      // Send real-time notification via WebSocket
      await notificationService.sendRealtimeNotification(enhancedReminder, user);

      // Schedule follow-up responses
      await followUpService.scheduleFollowUps(reminder);

    } catch (error) {
      console.error(`Error triggering reminder ${reminder.id}:`, error);
    }
  }

  private async checkAndTriggerReminders() {
    try {
      const upcomingReminders = await storage.getUpcomingReminders();
      const now = new Date();

      for (const reminder of upcomingReminders) {
        const reminderTime = new Date(reminder.scheduledFor);
        if (reminderTime <= now && !this.scheduledReminders.has(reminder.id)) {
          await this.triggerReminder(reminder);
        }
      }
    } catch (error) {
      console.error("Error checking reminders:", error);
    }
  }
}

// Generate AI response for an existing reminder
async function generateReminderResponse(reminder: Reminder, clientLocalTime?: string): Promise<Reminder> {
  try {
    console.log(`Generating AI response for reminder: ${reminder.originalMessage}`);

    // Generate the personalized AI responses
    const responses = await smartResponseService.getPersonalizedResponse(reminder, true, clientLocalTime);
    console.log(`✅ Received ${responses.length} responses for "${reminder.originalMessage}":`, responses);

    // Defense-in-depth: screen the AI's own output too, in case it produces
    // something harmful despite clean input. Falls back to the safe template
    // message rather than blocking reminder creation entirely.
    const safeFallback = `Time to ${reminder.originalMessage}!`;
    let rudeMessage = responses[0] || safeFallback;
    let safeResponses = responses.length > 0 ? responses : [safeFallback];

    const outputCheck = await moderationService.checkContent(rudeMessage);
    if (outputCheck.flagged) {
      slog.warn('content_blocked', {
        reminderId: reminder.id,
        categories: outputCheck.categories,
        stage: 'output',
      });
      rudeMessage = safeFallback;
      safeResponses = [safeFallback];
    }

    const updatedReminder = {
      ...reminder,
      rudeMessage,
      responses: safeResponses, // Store all AI-generated response options
      updatedAt: new Date()
    };

    console.log(`✅ Returning reminder with ${updatedReminder.responses.length} responses`);
    return updatedReminder;
  } catch (error) {
    console.error('Error generating reminder response:', error);
    // Return reminder with basic response if AI fails
    return {
      ...reminder,
      rudeMessage: `Time to ${reminder.originalMessage}!`,
      responses: [`Time to ${reminder.originalMessage}!`], // Always include responses array
      updatedAt: new Date()
    };
  }
}

// Create an instance of the ReminderService class
const reminderServiceInstance = new ReminderService();

export const reminderService = {
  // Class methods
  initializeScheduler: () => reminderServiceInstance.initializeScheduler(),
  scheduleReminder: (reminder: Reminder) => reminderServiceInstance.scheduleReminder(reminder),
  unscheduleReminder: (reminderId: string) => reminderServiceInstance.unscheduleReminder(reminderId),
  
  // Function methods
  createReminder,
  scheduleNotification,
  generateReminder,
  getMoreResponses,
  generateReminderResponse
};