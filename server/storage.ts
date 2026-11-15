import {
  users,
  reminders,
  reminderEvents,
  rudePhrasesData,
  premiumWhitelist,
  featureFlags,
  type User,
  type UpsertUser,
  type Reminder,
  type InsertReminder,
  type UpdateReminder,
  type RudePhrase,
  type InsertRudePhrase,
  type PremiumWhitelist,
  type InsertPremiumWhitelist,
  type ReminderEvent,
  type InsertReminderEvent,
  type FeatureFlag,
} from "@shared/schema";
import { db } from "./db";
import { zonedDayRange } from "./utils/userTime";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  // User accounts
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: string): Promise<void>;

  // Reminder operations
  createReminder(userId: string, reminder: InsertReminder): Promise<Reminder>;
  getReminders(userId: string): Promise<Reminder[]>;
  getReminder(id: string, userId: string): Promise<Reminder | undefined>;
  updateReminder(id: string, userId: string, updates: UpdateReminder): Promise<Reminder>;
  deleteReminder(id: string, userId: string): Promise<void>;
  getActiveReminders(userId: string): Promise<Reminder[]>;
  getUpcomingReminders(): Promise<Reminder[]>;
  completeReminder(id: string, userId: string): Promise<Reminder>;
  markReminderNotAccomplished(id: string, userId: string): Promise<Reminder>;
  markReminderHit(id: string, userId: string, hit: boolean, comment?: string): Promise<Reminder>;
  getHitReminders(): Promise<Reminder[]>;

  // Rude phrases operations
  getRudePhrasesForLevel(level: number): Promise<RudePhrase[]>;
  seedRudePhrases(): Promise<void>;

  // Statistics
  getUserStats(userId: string): Promise<{
    activeReminders: number;
    completedToday: number;
    avgRudeness: number;
  }>;

  // Reminder event log operations
  logReminderEvent(event: InsertReminderEvent): Promise<ReminderEvent>;
  getReminderEvents(userId: string): Promise<ReminderEvent[]>;

  // Premium whitelist operations
  getWhitelistEmails(): Promise<string[]>;
  addEmailToWhitelist(email: string, addedBy: string): Promise<boolean>;
  removeEmailFromWhitelist(email: string): Promise<boolean>;
  isEmailWhitelisted(email: string): Promise<boolean>;

  // Feature flag operations
  getFeatureFlags(): Promise<FeatureFlag[]>;
  setFeatureFlag(key: string, enabled: boolean, updatedBy: string, description?: string): Promise<FeatureFlag>;
  getFeatureFlag(key: string): Promise<FeatureFlag | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  // User accounts

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const normalizedEmail = email.toLowerCase().trim();
    const [user] = await db.select().from(users).where(sql`lower(trim(${users.email})) = ${normalizedEmail}`);
    return user;
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.emailVerificationToken, token));
    return user;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.resetToken, token));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    if (userData.email) {
      const email = userData.email.toLowerCase().trim();
      userData = { ...userData, email };
      const existingUserByEmail = await this.getUserByEmail(email);
      
      if (existingUserByEmail) {
        const [updatedUser] = await db
          .update(users)
          .set({ 
            ...userData, 
            id: existingUserByEmail.id,
            updatedAt: new Date() 
          })
          .where(eq(users.id, existingUserByEmail.id))
          .returning();
        return updatedUser;
      }
    }
    
    const [user] = await db
      .insert(users)
      // A brand-new user always arrives with an email (the column requires it)
      .values(userData as typeof users.$inferInsert)
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

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(reminders).where(eq(reminders.userId, id));
    await db.delete(users).where(eq(users.id, id));
  }

  // Reminder operations
  async createReminder(userId: string, reminder: InsertReminder): Promise<Reminder> {

    // Generate rude message with multiple variations
    let rudeMessage: string;
    let daySpecificMessages: string | null = null;
    let responseVariations: string[] = [];

    const phrases = await this.getRudePhrasesForLevel(reminder.rudenessLevel);

    // Generate 3-5 different response variations
    const numVariations = Math.min(phrases.length, 5);
    const shuffledPhrases = phrases.sort(() => 0.5 - Math.random()).slice(0, numVariations);

    responseVariations = shuffledPhrases.map(phrase => 
      `${reminder.originalMessage}${phrase?.phrase || ', get it done!'}`
    );

    if (reminder.isMultiDay && reminder.selectedDays && reminder.selectedDays.length > 0) {
      // Generate different rude messages for each selected day
      const dayMessages: { [key: string]: string } = {};

      for (const day of reminder.selectedDays) {
        const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
        dayMessages[day] = `${reminder.originalMessage}${randomPhrase?.phrase || ', get it done!'}`;
      }

      daySpecificMessages = JSON.stringify(dayMessages);
      // Use the first day's message as the default rudeMessage
      rudeMessage = dayMessages[reminder.selectedDays[0]] || reminder.originalMessage;
    } else {
      // Standard single-day reminder
      rudeMessage = responseVariations[0];
    }

    const [newReminder] = await db
      .insert(reminders)
      .values({
        ...reminder,
        userId,
        rudeMessage,
        daySpecificMessages,
        rudenessLevel: reminder.rudenessLevel,
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

  async getUpcomingReminders(): Promise<Reminder[]>{
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
    // CRITICAL: This writes to reminder_events — the permanent analytics record.
    // Never insert without checking for an existing (reminderId, action) row first.
    // Duplicates corrupt streak, completion rate, and graph data.
    const [reminder] = await db
      .update(reminders)
      .set({ 
        completed: true, 
        completedAt: new Date(),
        loggedAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(eq(reminders.id, id), eq(reminders.userId, userId)))
      .returning();
    // Log the event so it survives future reminder deletion — but only once per reminder.
    const existingCompleted = await db
      .select()
      .from(reminderEvents)
      .where(
        and(
          eq(reminderEvents.reminderId, id),
          eq(reminderEvents.action, 'completed')
        )
      )
      .limit(1);

    if (existingCompleted.length === 0) {
      await db.insert(reminderEvents).values({
        userId,
        reminderId: id,
        action: 'completed',
        scheduledFor: reminder.scheduledFor,
      });
    }
    return reminder;
  }

  async markReminderNotAccomplished(id: string, userId: string): Promise<Reminder> {
    // CRITICAL: This writes to reminder_events — the permanent analytics record.
    // Never insert without checking for an existing (reminderId, action) row first.
    // Duplicates corrupt streak, completion rate, and graph data.
    const [reminder] = await db
      .update(reminders)
      .set({ 
        notAccomplished: true, 
        notAccomplishedAt: new Date(),
        loggedAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(eq(reminders.id, id), eq(reminders.userId, userId)))
      .returning();
    // Log the event so it survives future reminder deletion — but only once per reminder.
    const existingMissed = await db
      .select()
      .from(reminderEvents)
      .where(
        and(
          eq(reminderEvents.reminderId, id),
          eq(reminderEvents.action, 'missed')
        )
      )
      .limit(1);

    if (existingMissed.length === 0) {
      await db.insert(reminderEvents).values({
        userId,
        reminderId: id,
        action: 'missed',
        scheduledFor: reminder.scheduledFor,
      });
    }
    return reminder;
  }

  async markReminderHit(id: string, userId: string, hit: boolean, comment?: string): Promise<Reminder> {
    // CRITICAL: This writes to reminder_events — the permanent analytics record.
    // Never insert without checking for an existing (reminderId, action) row first.
    // hitConfirmed stores the actual answer (true = "It Hit", false = "Nahh");
    // hitAt being set at all means the user responded either way. The admin
    // Hits review page only surfaces hitConfirmed = true rows.
    const [reminder] = await db
      .update(reminders)
      .set({
        hitConfirmed: hit,
        hitComment: comment || null,
        hitAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(reminders.id, id), eq(reminders.userId, userId)))
      .returning();
    const existingHit = await db
      .select()
      .from(reminderEvents)
      .where(
        and(
          eq(reminderEvents.reminderId, id),
          eq(reminderEvents.action, hit ? 'hit' : 'hit_nahh')
        )
      )
      .limit(1);

    if (existingHit.length === 0) {
      await db.insert(reminderEvents).values({
        userId,
        reminderId: id,
        action: hit ? 'hit' : 'hit_nahh',
        scheduledFor: reminder.scheduledFor,
      });
    }
    return reminder;
  }

  async getHitReminders(): Promise<Reminder[]> {
    return await db
      .select()
      .from(reminders)
      .where(eq(reminders.hitConfirmed, true))
      .orderBy(desc(reminders.hitAt));
  }

  async logReminderEvent(event: InsertReminderEvent): Promise<ReminderEvent> {
    // CRITICAL: This writes to reminder_events — the permanent analytics record.
    // Never insert without checking for an existing (reminderId, action) row first.
    // Duplicates corrupt streak, completion rate, and graph data.
    if (event.reminderId) {
      const existing = await db
        .select()
        .from(reminderEvents)
        .where(
          and(
            eq(reminderEvents.reminderId, event.reminderId),
            eq(reminderEvents.action, event.action)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Already logged — return the existing row instead of inserting a duplicate.
        return existing[0];
      }
    }
    const [row] = await db.insert(reminderEvents).values(event).returning();
    return row;
  }

  async getReminderEvents(userId: string): Promise<ReminderEvent[]> {
    return await db
      .select()
      .from(reminderEvents)
      .where(eq(reminderEvents.userId, userId));
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
      // Level 1 - Sympathy (warm, understanding, encouraging)
      { rudenessLevel: 1, phrase: ", I know it's hard sometimes — but you've got this 💛", category: "sympathy" },
      { rudenessLevel: 1, phrase: ", it's okay if today's been a lot. One small step is enough 🌱", category: "sympathy" },
      { rudenessLevel: 1, phrase: ", be gentle with yourself — and when you're ready, let's do this 🤗", category: "sympathy" },
      { rudenessLevel: 1, phrase: ", even tiny steps count — you've got more in you than you think ✨", category: "uplifting" },
      { rudenessLevel: 1, phrase: ", not feeling it? That's normal. Start small, I believe in you 💪", category: "encouraging" },
      { rudenessLevel: 1, phrase: ", you're doing better than you think. Keep going 🌟", category: "encouraging" },

      // Level 2 - Firm
      { rudenessLevel: 2, phrase: ", don't let this slip by!", category: "firm" },
      { rudenessLevel: 2, phrase: ", time to get moving!", category: "assertive" },
      { rudenessLevel: 2, phrase: ", no excuses now!", category: "direct" },
      { rudenessLevel: 2, phrase: ", make it happen!", category: "motivational" },
      { rudenessLevel: 2, phrase: ", your future self is already judging you from next week", category: "forward-looking" },
      { rudenessLevel: 2, phrase: ", the longer you wait the heavier it gets — just go", category: "urgent" },

      // Level 3 - Sarcastic
      { rudenessLevel: 3, phrase: ", because apparently you need reminding...", category: "sarcastic" },
      { rudenessLevel: 3, phrase: ", shocking that you haven't done this yet!", category: "ironic" },
      { rudenessLevel: 3, phrase: ", what a surprise, still not done!", category: "witty" },
      { rudenessLevel: 3, phrase: ", let me guess, you 'forgot' again?", category: "cynical" },
      { rudenessLevel: 3, phrase: ", shocking absolutely no one, here we are again", category: "deadpan" },
      { rudenessLevel: 3, phrase: ", bold strategy leaving this for later, let's see how that plays out", category: "ironic" },

      // Level 4 - Harsh
      { rudenessLevel: 4, phrase: ", stop procrastinating like a lazy sloth!", category: "harsh" },
      { rudenessLevel: 4, phrase: ", get your act together already!", category: "demanding" },
      { rudenessLevel: 4, phrase: ", quit being such a slacker!", category: "critical" },
      { rudenessLevel: 4, phrase: ", enough with the excuses!", category: "impatient" },
      { rudenessLevel: 4, phrase: ", at this point your procrastination has its own procrastination", category: "absurdist" },
      { rudenessLevel: 4, phrase: ", even your excuses are getting tired of you", category: "brutal-honest" },

      // Level 5 - Savage
      { rudenessLevel: 5, phrase: ", you absolute couch potato!", category: "savage" },
      { rudenessLevel: 5, phrase: ", stop being such a useless lump!", category: "brutal" },
      { rudenessLevel: 5, phrase: ", what's wrong with you?!", category: "offensive" },
      { rudenessLevel: 5, phrase: ", you're pathetic at this point!", category: "insulting" },
      { rudenessLevel: 5, phrase: ", a goldfish has completed more tasks than you today", category: "savage-absurd" },
      { rudenessLevel: 5, phrase: ", history will not remember you fondly for this one", category: "dramatic" },
    ];

    // Level 1 is now "Sympathy": remove any old level-1 lines that aren't in the new list
    const level1Texts = phrases.filter(p => p.rudenessLevel === 1).map(p => p.phrase);
    const storedLevel1 = await db.select().from(rudePhrasesData).where(eq(rudePhrasesData.rudenessLevel, 1));
    for (const row of storedLevel1) {
      if (!level1Texts.includes(row.phrase)) {
        await db.delete(rudePhrasesData).where(eq(rudePhrasesData.id, row.id));
      }
    }

    // Insert any phrases that don't already exist (safe to re-run)
    const existingPhrases = await db.select().from(rudePhrasesData);
    const existingTexts = new Set(existingPhrases.map(p => p.phrase));
    const newPhrases = phrases.filter(p => !existingTexts.has(p.phrase));
    if (newPhrases.length > 0) {
      await db.insert(rudePhrasesData).values(newPhrases);
    }
  }

  // Statistics
  async getUserStats(userId: string): Promise<{
    activeReminders: number;
    completedToday: number;
    avgRudeness: number;
  }> {
    // "Today" in the user's time zone, not the server's
    const { start: today, end: tomorrow } = zonedDayRange();

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

  // Premium whitelist operations
  async getWhitelistEmails(): Promise<string[]> {
    const whitelistEntries = await db.select().from(premiumWhitelist);
    return whitelistEntries.map(entry => entry.email);
  }

  async addEmailToWhitelist(email: string, addedBy: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();
    
    try {
      await db.insert(premiumWhitelist).values({
        email: normalizedEmail,
        addedBy,
      });
      return true;
    } catch (error) {
      // Email already exists (unique constraint violation)
      return false;
    }
  }

  async removeEmailFromWhitelist(email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();
    const result = await db.delete(premiumWhitelist).where(eq(premiumWhitelist.email, normalizedEmail)).returning();
    return result.length > 0;
  }

  async isEmailWhitelisted(email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();
    const [entry] = await db.select().from(premiumWhitelist).where(eq(premiumWhitelist.email, normalizedEmail));
    return !!entry;
  }

  // Feature flag operations
  async getFeatureFlags(): Promise<FeatureFlag[]> {
    return await db.select().from(featureFlags);
  }

  async getFeatureFlag(key: string): Promise<FeatureFlag | undefined> {
    const [flag] = await db.select().from(featureFlags).where(eq(featureFlags.key, key));
    return flag;
  }

  async setFeatureFlag(key: string, enabled: boolean, updatedBy: string, description?: string): Promise<FeatureFlag> {
    const existing = await this.getFeatureFlag(key);
    if (existing) {
      const [updated] = await db
        .update(featureFlags)
        .set({ enabled, updatedBy, updatedAt: new Date(), ...(description ? { description } : {}) })
        .where(eq(featureFlags.key, key))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(featureFlags)
      .values({ key, enabled, updatedBy, description: description ?? null })
      .returning();
    return created;
  }
}

// Connect to the database. If it can't be reached, try a few more times and
// then fail loudly. (It used to quietly switch to a temporary in-memory store,
// which made everyone's reminders look deleted and lost anything saved.)
async function createStorage(): Promise<IStorage> {
  const attempts = 4;
  for (let attempt = 1; ; attempt++) {
    try {
      const dbStorage = new DatabaseStorage();
      await dbStorage.seedRudePhrases(); // fails if the database is unreachable
      console.log('✅ Database connection successful - using DatabaseStorage');
      return dbStorage;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (attempt >= attempts) {
        console.error(`❌ Database unavailable after ${attempts} tries: ${message}`);
        throw error;
      }
      console.warn(`⚠️  Database unavailable (try ${attempt}/${attempts}): ${message} — retrying…`);
      await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
  }
}

// One shared connection. If connecting fails, the next request tries again.
let storagePromise: Promise<IStorage> | undefined;
export const getStorage = (): Promise<IStorage> => {
  if (!storagePromise) {
    storagePromise = createStorage().catch((error) => {
      storagePromise = undefined;
      throw error;
    });
  }
  return storagePromise;
};

// Export a synchronous storage for immediate use (will be initialized on first API call)
export const storage = {
  async getUser(id: string) {
    return (await getStorage()).getUser(id);
  },
  async getUserByEmail(email: string) {
    return (await getStorage()).getUserByEmail(email);
  },
  async getUserByVerificationToken(token: string) {
    return (await getStorage()).getUserByVerificationToken(token);
  },
  async getUserByResetToken(token: string) {
    return (await getStorage()).getUserByResetToken(token);
  },
  async upsertUser(user: any) {
    return (await getStorage()).upsertUser(user);
  },
  async updateUser(id: string, updates: any) {
    return (await getStorage()).updateUser(id, updates);
  },
  async getAllUsers() {
    return (await getStorage()).getAllUsers();
  },
  async createReminder(userId: string, reminder: InsertReminder) {
    return (await getStorage()).createReminder(userId, reminder);
  },
  async getReminders(userId: string) {
    return (await getStorage()).getReminders(userId);
  },
  async getReminder(id: string, userId: string) {
    return (await getStorage()).getReminder(id, userId);
  },
  async updateReminder(id: string, userId: string, updates: any) {
    return (await getStorage()).updateReminder(id, userId, updates);
  },
  async deleteReminder(id: string, userId: string) {
    return (await getStorage()).deleteReminder(id, userId);
  },
  async getActiveReminders(userId: string) {
    return (await getStorage()).getActiveReminders(userId);
  },
  async getUpcomingReminders() {
    return (await getStorage()).getUpcomingReminders();
  },
  async completeReminder(id: string, userId: string) {
    return (await getStorage()).completeReminder(id, userId);
  },
  async markReminderNotAccomplished(id: string, userId: string) {
    return (await getStorage()).markReminderNotAccomplished(id, userId);
  },
  async markReminderHit(id: string, userId: string, hit: boolean, comment?: string) {
    return (await getStorage()).markReminderHit(id, userId, hit, comment);
  },
  async getHitReminders() {
    return (await getStorage()).getHitReminders();
  },
  async getRudePhrasesForLevel(level: number) {
    return (await getStorage()).getRudePhrasesForLevel(level);
  },
  async seedRudePhrases() {
    return (await getStorage()).seedRudePhrases();
  },
  async getUserStats(userId: string) {
    return (await getStorage()).getUserStats(userId);
  },
  async getWhitelistEmails() {
    return (await getStorage()).getWhitelistEmails();
  },
  async addEmailToWhitelist(email: string, addedBy: string) {
    return (await getStorage()).addEmailToWhitelist(email, addedBy);
  },
  async removeEmailFromWhitelist(email: string) {
    return (await getStorage()).removeEmailFromWhitelist(email);
  },
  async isEmailWhitelisted(email: string) {
    return (await getStorage()).isEmailWhitelisted(email);
  },
  async getFeatureFlags() {
    return (await getStorage()).getFeatureFlags();
  },
  async getFeatureFlag(key: string) {
    return (await getStorage()).getFeatureFlag(key);
  },
  async setFeatureFlag(key: string, enabled: boolean, updatedBy: string, description?: string) {
    return (await getStorage()).setFeatureFlag(key, enabled, updatedBy, description);
  },
  async logReminderEvent(event: InsertReminderEvent) {
    return (await getStorage()).logReminderEvent(event);
  },
  async getReminderEvents(userId: string) {
    return (await getStorage()).getReminderEvents(userId);
  },
  async deleteUser(id: string) {
    return (await getStorage()).deleteUser(id);
  },
};