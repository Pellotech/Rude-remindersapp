import { storage } from "../storage";
import { notificationService } from "./notificationService";
import type { Reminder } from "@shared/schema";

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

      // Send notifications based on reminder and user preferences
      if (reminder.browserNotification && user.browserNotifications) {
        await notificationService.sendBrowserNotification(reminder, user);
      }

      if (reminder.voiceNotification && user.voiceNotifications) {
        await notificationService.sendVoiceNotification(reminder, user);
      }

      if (reminder.emailNotification && user.emailNotifications && user.email) {
        await notificationService.sendEmailNotification(reminder, user);
      }

      // Send real-time notification via WebSocket
      await notificationService.sendRealtimeNotification(reminder, user);

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

export const reminderService = new ReminderService();
