import { Reminder } from "@shared/schema";
import { nanoid } from "nanoid";

const GUEST_REMINDERS_KEY = "guest_reminders";

export interface GuestReminder {
  id: string;
  title: string;
  scheduledFor: string;
  rudeMessage: string;
  motivationLevel: number;
  completed: boolean;
  completedAt?: string | null;
  isMultiDay?: boolean;
  selectedDays?: string[];
  voiceCharacter?: string;
  browserNotification?: boolean;
  voiceNotification?: boolean;
}

// Convert GuestReminder to Reminder format for compatibility
function toReminder(guestReminder: GuestReminder): Reminder {
  return {
    id: guestReminder.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: "guest",
    title: guestReminder.title,
    rudeMessage: guestReminder.rudeMessage,
    originalMessage: guestReminder.title, // Use title as original
    context: null,
    rudenessLevel: guestReminder.motivationLevel || 3,
    scheduledFor: new Date(guestReminder.scheduledFor),
    completed: guestReminder.completed,
    completedAt: guestReminder.completedAt ? new Date(guestReminder.completedAt) : null,
    isMultiDay: guestReminder.isMultiDay || false,
    selectedDays: guestReminder.selectedDays || [],
    notAccomplished: false,
    notAccomplishedAt: null,
    voiceCharacter: guestReminder.voiceCharacter || "default",
    browserNotification: guestReminder.browserNotification ?? true,
    voiceNotification: guestReminder.voiceNotification || false,
    emailNotification: false,
    motivationalQuote: null,
    daySpecificMessages: null,
    attachments: [],
    responses: [],
  };
}

export const guestStorage = {
  // Get all guest reminders
  getReminders(): Reminder[] {
    try {
      const data = localStorage.getItem(GUEST_REMINDERS_KEY);
      if (!data) return [];
      const guestReminders: GuestReminder[] = JSON.parse(data);
      return guestReminders.map(toReminder);
    } catch (error) {
      console.error("Error reading guest reminders:", error);
      return [];
    }
  },

  // Add a new reminder
  addReminder(reminder: Omit<GuestReminder, "id" | "completed">): Reminder {
    try {
      const reminders = this.getReminders();
      const newReminder: GuestReminder = {
        id: nanoid(),
        ...reminder,
        completed: false,
        completedAt: null,
      };
      
      reminders.push(toReminder(newReminder));
      localStorage.setItem(GUEST_REMINDERS_KEY, JSON.stringify(reminders));
      
      return toReminder(newReminder);
    } catch (error) {
      console.error("Error adding guest reminder:", error);
      throw error;
    }
  },

  // Update a reminder
  updateReminder(id: string, updates: Partial<GuestReminder>): Reminder | null {
    try {
      const reminders = this.getReminders();
      const index = reminders.findIndex(r => r.id === id);
      
      if (index === -1) return null;
      
      // Apply updates while preserving the Reminder structure
      const current = reminders[index];
      const updated: Reminder = {
        ...current,
        ...updates,
        scheduledFor: updates.scheduledFor ? new Date(updates.scheduledFor) : current.scheduledFor,
        completedAt: updates.completedAt ? new Date(updates.completedAt) : current.completedAt,
        updatedAt: new Date(),
      };
      reminders[index] = updated;
      
      localStorage.setItem(GUEST_REMINDERS_KEY, JSON.stringify(reminders));
      return updated;
    } catch (error) {
      console.error("Error updating guest reminder:", error);
      return null;
    }
  },

  // Delete a reminder
  deleteReminder(id: string): boolean {
    try {
      const reminders = this.getReminders();
      const filtered = reminders.filter(r => r.id !== id);
      
      if (filtered.length === reminders.length) return false;
      
      localStorage.setItem(GUEST_REMINDERS_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error("Error deleting guest reminder:", error);
      return false;
    }
  },

  // Complete a reminder
  completeReminder(id: string): Reminder | null {
    return this.updateReminder(id, {
      completed: true,
      completedAt: new Date().toISOString(),
    });
  },

  // Get stats
  getStats() {
    const reminders = this.getReminders();
    const now = new Date();
    
    const completed = reminders.filter(r => r.completed).length;
    const pending = reminders.filter(r => !r.completed && new Date(r.scheduledFor) > now).length;
    const overdue = reminders.filter(r => !r.completed && new Date(r.scheduledFor) <= now).length;
    
    return {
      total: reminders.length,
      completed,
      pending,
      overdue,
    };
  },

  // Clear all guest reminders (useful for testing)
  clearAll() {
    localStorage.removeItem(GUEST_REMINDERS_KEY);
  },
};
