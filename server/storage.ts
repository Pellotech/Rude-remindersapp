import {
  users,
  reminders,
  rudePhrasesData,
  type User,
  type UpsertUser,
  type Reminder,
  type InsertReminder,
  type UpdateReminder,
  type RudePhrase,
  type InsertRudePhrase,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  
  // Reminder operations
  createReminder(userId: string, reminder: InsertReminder): Promise<Reminder>;
  getReminders(userId: string): Promise<Reminder[]>;
  getReminder(id: string, userId: string): Promise<Reminder | undefined>;
  updateReminder(id: string, userId: string, updates: UpdateReminder): Promise<Reminder>;
  deleteReminder(id: string, userId: string): Promise<void>;
  getActiveReminders(userId: string): Promise<Reminder[]>;
  getUpcomingReminders(): Promise<Reminder[]>;
  completeReminder(id: string, userId: string): Promise<Reminder>;
  
  // Rude phrases operations
  getRudePhrasesForLevel(level: number): Promise<RudePhrase[]>;
  seedRudePhrases(): Promise<void>;
  
  // Statistics
  getUserStats(userId: string): Promise<{
    activeReminders: number;
    completedToday: number;
    avgRudeness: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Reminder operations
  async createReminder(userId: string, reminder: InsertReminder): Promise<Reminder> {
    // Get a random rude phrase for the specified rudeness level
    const phrases = await this.getRudePhrasesForLevel(reminder.rudenessLevel);
    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
    const rudeMessage = `${reminder.originalMessage}${randomPhrase?.phrase || ', get it done!'}`;

    const [newReminder] = await db
      .insert(reminders)
      .values({
        ...reminder,
        userId,
        rudeMessage,
      })
      .returning();
    return newReminder;
  }

  async getReminders(userId: string): Promise<Reminder[]> {
    return await db
      .select()
      .from(reminders)
      .where(eq(reminders.userId, userId))
      .orderBy(desc(reminders.scheduledFor));
  }

  async getReminder(id: string, userId: string): Promise<Reminder | undefined> {
    const [reminder] = await db
      .select()
      .from(reminders)
      .where(and(eq(reminders.id, id), eq(reminders.userId, userId)));
    return reminder;
  }

  async updateReminder(id: string, userId: string, updates: UpdateReminder): Promise<Reminder> {
    let rudeMessage = undefined;
    
    // Regenerate rude message if originalMessage or rudenessLevel changed
    if (updates.originalMessage || updates.rudenessLevel) {
      const currentReminder = await this.getReminder(id, userId);
      if (currentReminder) {
        const message = updates.originalMessage || currentReminder.originalMessage;
        const level = updates.rudenessLevel || currentReminder.rudenessLevel;
        const phrases = await this.getRudePhrasesForLevel(level);
        const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
        rudeMessage = `${message}${randomPhrase?.phrase || ', get it done!'}`;
      }
    }

    const [reminder] = await db
      .update(reminders)
      .set({ 
        ...updates, 
        ...(rudeMessage && { rudeMessage }),
        updatedAt: new Date() 
      })
      .where(and(eq(reminders.id, id), eq(reminders.userId, userId)))
      .returning();
    return reminder;
  }

  async deleteReminder(id: string, userId: string): Promise<void> {
    await db
      .delete(reminders)
      .where(and(eq(reminders.id, id), eq(reminders.userId, userId)));
  }

  async getActiveReminders(userId: string): Promise<Reminder[]> {
    return await db
      .select()
      .from(reminders)
      .where(
        and(
          eq(reminders.userId, userId),
          eq(reminders.completed, false),
          gte(reminders.scheduledFor, new Date())
        )
      )
      .orderBy(reminders.scheduledFor);
  }

  async getUpcomingReminders(): Promise<Reminder[]> {
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    
    return await db
      .select()
      .from(reminders)
      .where(
        and(
          eq(reminders.completed, false),
          gte(reminders.scheduledFor, now),
          lte(reminders.scheduledFor, fiveMinutesFromNow)
        )
      );
  }

  async completeReminder(id: string, userId: string): Promise<Reminder> {
    const [reminder] = await db
      .update(reminders)
      .set({ 
        completed: true, 
        completedAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(eq(reminders.id, id), eq(reminders.userId, userId)))
      .returning();
    return reminder;
  }

  // Rude phrases operations
  async getRudePhrasesForLevel(level: number): Promise<RudePhrase[]> {
    return await db
      .select()
      .from(rudePhrasesData)
      .where(eq(rudePhrasesData.rudenessLevel, level));
  }

  async seedRudePhrases(): Promise<void> {
    const phrases = [
      // Level 1 - Gentle
      { rudenessLevel: 1, phrase: ", you've got this! 💪", category: "encouraging" },
      { rudenessLevel: 1, phrase: ", take your time but don't forget! ⏰", category: "gentle" },
      { rudenessLevel: 1, phrase: ", friendly reminder! 😊", category: "polite" },
      { rudenessLevel: 1, phrase: ", just a gentle nudge! 👋", category: "soft" },
      
      // Level 2 - Firm
      { rudenessLevel: 2, phrase: ", don't let this slip by!", category: "firm" },
      { rudenessLevel: 2, phrase: ", time to get moving!", category: "assertive" },
      { rudenessLevel: 2, phrase: ", no excuses now!", category: "direct" },
      { rudenessLevel: 2, phrase: ", make it happen!", category: "motivational" },
      
      // Level 3 - Sarcastic
      { rudenessLevel: 3, phrase: ", because apparently you need reminding...", category: "sarcastic" },
      { rudenessLevel: 3, phrase: ", shocking that you haven't done this yet!", category: "ironic" },
      { rudenessLevel: 3, phrase: ", what a surprise, still not done!", category: "witty" },
      { rudenessLevel: 3, phrase: ", let me guess, you 'forgot' again?", category: "cynical" },
      
      // Level 4 - Harsh
      { rudenessLevel: 4, phrase: ", stop procrastinating like a lazy sloth!", category: "harsh" },
      { rudenessLevel: 4, phrase: ", get your act together already!", category: "demanding" },
      { rudenessLevel: 4, phrase: ", quit being such a slacker!", category: "critical" },
      { rudenessLevel: 4, phrase: ", enough with the excuses!", category: "impatient" },
      
      // Level 5 - Savage
      { rudenessLevel: 5, phrase: ", you absolute couch potato!", category: "savage" },
      { rudenessLevel: 5, phrase: ", stop being such a useless lump!", category: "brutal" },
      { rudenessLevel: 5, phrase: ", what's wrong with you?!", category: "offensive" },
      { rudenessLevel: 5, phrase: ", you're pathetic at this point!", category: "insulting" },
    ];

    // Check if phrases already exist
    const existingPhrases = await db.select().from(rudePhrasesData).limit(1);
    if (existingPhrases.length === 0) {
      await db.insert(rudePhrasesData).values(phrases);
    }
  }

  // Statistics
  async getUserStats(userId: string): Promise<{
    activeReminders: number;
    completedToday: number;
    avgRudeness: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Active reminders
    const activeReminders = await db
      .select()
      .from(reminders)
      .where(
        and(
          eq(reminders.userId, userId),
          eq(reminders.completed, false),
          gte(reminders.scheduledFor, new Date())
        )
      );

    // Completed today
    const completedToday = await db
      .select()
      .from(reminders)
      .where(
        and(
          eq(reminders.userId, userId),
          eq(reminders.completed, true),
          gte(reminders.completedAt!, today),
          lte(reminders.completedAt!, tomorrow)
        )
      );

    // Average rudeness
    const allReminders = await db
      .select()
      .from(reminders)
      .where(eq(reminders.userId, userId));

    const avgRudeness = allReminders.length > 0
      ? allReminders.reduce((sum, r) => sum + r.rudenessLevel, 0) / allReminders.length
      : 0;

    return {
      activeReminders: activeReminders.length,
      completedToday: completedToday.length,
      avgRudeness: Math.round(avgRudeness * 10) / 10,
    };
  }
}

export const storage = new DatabaseStorage();
