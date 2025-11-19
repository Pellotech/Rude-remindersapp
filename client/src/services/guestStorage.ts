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

// Internal helper to get raw GuestReminder array from localStorage
function getRawReminders(): GuestReminder[] {
  try {
    const data = localStorage.getItem(GUEST_REMINDERS_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading guest reminders:", error);
    return [];
  }
}

// Internal helper to save GuestReminder array to localStorage
function saveRawReminders(reminders: GuestReminder[]): void {
  localStorage.setItem(GUEST_REMINDERS_KEY, JSON.stringify(reminders));
}

export const guestStorage = {
  // Get all guest reminders (converted to Reminder format)
  getReminders(): Reminder[] {
    const guestReminders = getRawReminders();
    return guestReminders.map(toReminder);
  },

  // Add a new reminder
  addReminder(reminder: Omit<GuestReminder, "id" | "completed">): Reminder {
    try {
      const reminders = getRawReminders();
      const newReminder: GuestReminder = {
        id: nanoid(),
        ...reminder,
        completed: false,
        completedAt: null,
      };
      
      reminders.push(newReminder);
      saveRawReminders(reminders);
      
      console.log("✅ Guest reminder saved to localStorage:", newReminder.id);
      return toReminder(newReminder);
    } catch (error) {
      console.error("Error adding guest reminder:", error);
      throw error;
    }
  },

  // Update a reminder
  updateReminder(id: string, updates: Partial<GuestReminder>): Reminder | null {
    try {
      const reminders = getRawReminders();
      const index = reminders.findIndex(r => r.id === id);
      
      if (index === -1) {
        console.error("Guest reminder not found:", id);
        return null;
      }
      
      // Apply updates to the GuestReminder object
      reminders[index] = {
        ...reminders[index],
        ...updates,
      };
      
      saveRawReminders(reminders);
      console.log("✅ Guest reminder updated in localStorage:", id, updates);
      return toReminder(reminders[index]);
    } catch (error) {
      console.error("Error updating guest reminder:", error);
      return null;
    }
  },

  // Delete a reminder
  deleteReminder(id: string): boolean {
    try {
      const reminders = getRawReminders();
      const filtered = reminders.filter(r => r.id !== id);
      
      if (filtered.length === reminders.length) {
        console.error("Guest reminder not found for deletion:", id);
        return false;
      }
      
      saveRawReminders(filtered);
      console.log("✅ Guest reminder deleted from localStorage:", id);
      return true;
    } catch (error) {
      console.error("Error deleting guest reminder:", error);
      return false;
    }
  },

  // Complete a reminder
  completeReminder(id: string): Reminder | null {
    console.log("🎯 Completing guest reminder:", id);
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
