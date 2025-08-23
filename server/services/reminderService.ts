import { storage } from "../storage";
import { notificationService } from "./notificationService";
import type { Reminder } from "@shared/schema";

// Assuming these functions are defined elsewhere and imported
// For demonstration purposes, let's define them as placeholders
const createReminder = async (reminder: Reminder): Promise<Reminder> => {
  console.log("Placeholder for createReminder");
  return reminder;
};
const scheduleNotification = async (reminder: Reminder): Promise<void> => {
  console.log("Placeholder for scheduleNotification");
};
const generateReminder = async (reminder: Reminder): Promise<Reminder> => {
  console.log("Placeholder for generateReminder");
  return reminder;
};
const getMoreResponses = async (reminderId: string): Promise<string[]> => {
  console.log("Placeholder for getMoreResponses");
  return ["More response 1", "More response 2"];
};

// Mocking smartResponseService and followUpService for completeness in this snippet
const smartResponseService = {
  getPersonalizedResponse: async (reminder: Reminder, isRude?: boolean): Promise<string[]> => {
    console.log(`Mock getPersonalizedResponse for reminder: ${reminder.originalMessage}, isRude: ${isRude}`);
    if (isRude) {
      return [`Don't forget to ${reminder.originalMessage}!`];
    }
    return [`Remember to ${reminder.originalMessage}.`];
  },
  getContextualRemarks: async (reminder: Reminder): Promise<string[]> => {
    console.log(`Mock getContextualRemarks for reminder: ${reminder.originalMessage}`);
    return ["Contextual remark 1"];
  }
};

const followUpService = {
  scheduleFollowUps: async (reminder: Reminder): Promise<void> => {
    console.log(`Mock scheduleFollowUps for reminder: ${reminder.originalMessage}`);
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
      const timeout = setTimeout(async () => {
        await this.triggerReminder(reminder);
        this.scheduledReminders.delete(reminder.id);
      }, delay);

      this.scheduledReminders.set(reminder.id, timeout);
      console.log(`Scheduled reminder ${reminder.id} for ${reminder.scheduledFor}`);
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
      const personalizedResponses = await smartResponseService.getPersonalizedResponse(reminder);
      const contextualRemarks = await smartResponseService.getContextualRemarks(reminder);

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
async function generateReminderResponse(reminder: Reminder): Promise<Reminder> {
  try {
    console.log(`Generating AI response for reminder: ${reminder.originalMessage}`);

    // Generate the rude/motivational message
    const responses = await smartResponseService.getPersonalizedResponse(reminder, true);
    const rudeMessage = responses[0] || `Time to ${reminder.originalMessage}!`;

    return {
      ...reminder,
      rudeMessage,
      responses,
      status: 'pending' as const,
      updatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error generating reminder response:', error);
    // Return reminder with basic response if AI fails
    return {
      ...reminder,
      rudeMessage: `Time to ${reminder.originalMessage}!`,
      responses: [`Time to ${reminder.originalMessage}!`],
      status: 'pending' as const,
      updatedAt: new Date().toISOString()
    };
  }
}

export const reminderService = {
  createReminder,
  scheduleNotification,
  generateReminder,
  getMoreResponses,
  generateReminderResponse
};