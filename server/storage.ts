import {
  users,
  reminders,
  reminderEvents,
  rudePhrasesData,
  premiumWhitelist,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
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
}

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.

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
      userData = { ...userData, email: userData.email.toLowerCase().trim() };
      const existingUserByEmail = await this.getUserByEmail(userData.email);
      
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
    // Log the event so it survives future reminder deletion
    await db.insert(reminderEvents).values({
      userId,
      reminderId: id,
      action: 'completed',
      scheduledFor: reminder.scheduledFor,
    });
    return reminder;
  }

  async markReminderNotAccomplished(id: string, userId: string): Promise<Reminder> {
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
    // Log the event so it survives future reminder deletion
    await db.insert(reminderEvents).values({
      userId,
      reminderId: id,
      action: 'missed',
      scheduledFor: reminder.scheduledFor,
    });
    return reminder;
  }

  async logReminderEvent(event: InsertReminderEvent): Promise<ReminderEvent> {
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
      // Level 1 - Gentle
      { rudenessLevel: 1, phrase: ", you've got this! 💪", category: "encouraging" },
      { rudenessLevel: 1, phrase: ", take your time but don't forget! ⏰", category: "gentle" },
      { rudenessLevel: 1, phrase: ", friendly reminder! 😊", category: "polite" },
      { rudenessLevel: 1, phrase: ", just a gentle nudge! 👋", category: "soft" },
      { rudenessLevel: 1, phrase: ", the best time to start was yesterday, the second best is now 🌱", category: "reflective" },
      { rudenessLevel: 1, phrase: ", even tiny steps count — you've got more in you than you think ✨", category: "uplifting" },

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
}

// In-memory storage implementation for development
class MemoryStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private reminders: Reminder[] = [];
  private rudePhrasesSeeded = false;
  private rudePhrasesStore: RudePhrase[] = [];
  private whitelistEmails: Set<string> = new Set(['ruderemindersinfo@gmail.com']);

  constructor() {
    // Add a default dev user for testing
    this.users.set('dev-user-001', {
      id: 'dev-user-001',
      email: 'developer@example.com',
      firstName: 'Developer', // Corrected from name to firstName
      lastName: null, // Added lastName for schema compliance
      profileImageUrl: null, // Added profileImageUrl
      defaultRudenessLevel: 3, // Added defaultRudenessLevel
      defaultVoiceCharacter: 'default', // Added defaultVoiceCharacter
      voiceNotifications: true, // Added voiceNotifications
      emailNotifications: false, // Added emailNotifications
      browserNotifications: true, // Added browserNotifications
      gender: 'other', // Added gender
      genderSpecificReminders: false, // Added genderSpecificReminders
      ethnicity: null, // Added ethnicity
      ethnicitySpecificQuotes: false, // Added ethnicitySpecificQuotes
      subscriptionStatus: 'active', // Updated to active for premium testing
      revenueCatCustomerId: null, // Added revenueCatCustomerId
      revenueCatEntitlements: {}, // Added revenueCatEntitlements
      subscriptionPlan: 'premium', // Updated to premium
      subscriptionEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      monthlyReminderUsage: null, // Added monthlyReminderUsage
      simplifiedInterface: false, // Added simplifiedInterface
      alarmSound: 'gentle-chime', // Added alarmSound
      passwordHash: null, // Added passwordHash
      age: null, // Added age
      country: null, // Added country
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const normalizedEmail = email.toLowerCase().trim();
    for (const user of Array.from(this.users.values())) {
      if (user.email?.toLowerCase().trim() === normalizedEmail) {
        return user;
      }
    }
    return undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const normalizedEmail = userData.email ? userData.email.toLowerCase().trim() : null;
    const user: User = {
      id: userData.id || `user_${Date.now()}`,
      email: normalizedEmail,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      defaultRudenessLevel: userData.defaultRudenessLevel || 3,
      defaultVoiceCharacter: userData.defaultVoiceCharacter || 'default',
      voiceNotifications: userData.voiceNotifications ?? true,
      emailNotifications: userData.emailNotifications ?? false,
      browserNotifications: userData.browserNotifications ?? true,
      gender: userData.gender || null,
      genderSpecificReminders: userData.genderSpecificReminders ?? false,
      ethnicity: userData.ethnicity || null,
      ethnicitySpecificQuotes: userData.ethnicitySpecificQuotes ?? false,
      subscriptionStatus: userData.subscriptionStatus || "free",
      revenueCatCustomerId: userData.revenueCatCustomerId || null,
      revenueCatEntitlements: userData.revenueCatEntitlements || {},
      subscriptionPlan: userData.subscriptionPlan || "free",
      subscriptionEndsAt: userData.subscriptionEndsAt || null,
      monthlyReminderUsage: userData.monthlyReminderUsage || null,
      simplifiedInterface: userData.simplifiedInterface ?? false,
      alarmSound: userData.alarmSound || "gentle-chime",
      passwordHash: userData.passwordHash || null,
      age: userData.age || null,
      country: userData.country || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const existing = this.users.get(id);
    if (!existing) throw new Error('User not found');

    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.users.set(id, updated);
    return updated;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async deleteUser(id: string): Promise<void> {
    this.reminders = this.reminders.filter(r => r.userId !== id);
    this.users.delete(id);
  }

  // Reminder operations
  async createReminder(userId: string, reminder: InsertReminder): Promise<Reminder> {
    const id = `reminder_${Date.now()}_${Math.random()}`;

    // Generate rude message with multiple variations
    let rudeMessage: string;
    let daySpecificMessages = null;
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

    const newReminder: Reminder = {
      id,
      userId,
      title: reminder.title,
      originalMessage: reminder.originalMessage,
      context: reminder.context || null,
      rudenessLevel: reminder.rudenessLevel,
      scheduledFor: reminder.scheduledFor,
      browserNotification: reminder.browserNotification ?? true,
      voiceNotification: reminder.voiceNotification ?? false,
      emailNotification: reminder.emailNotification ?? false,
      voiceCharacter: reminder.voiceCharacter || 'default',
      attachments: reminder.attachments || [],
      motivationalQuote: reminder.motivationalQuote || null,
      responses: responseVariations,
      // Multi-day fields
      isMultiDay: reminder.isMultiDay ?? false,
      selectedDays: reminder.selectedDays || [],
      daySpecificMessages: daySpecificMessages,

      rudeMessage,

      completed: false,
      completedAt: null,
      notAccomplished: false,
      notAccomplishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.reminders.push(newReminder);
    return newReminder;
  }

  async getReminders(userId: string): Promise<Reminder[]> {
    return Array.from(this.reminders.values())
      .filter(r => r.userId === userId)
      .sort((a, b) => b.scheduledFor.getTime() - a.scheduledFor.getTime());
  }

  async getReminder(id: string, userId: string): Promise<Reminder | undefined> {
    const reminder = this.reminders.find(r => r.id === id);
    return reminder && reminder.userId === userId ? reminder : undefined;
  }

  async updateReminder(id: string, userId: string, updates: UpdateReminder): Promise<Reminder> {
    const existing = await this.getReminder(id, userId);
    if (!existing) throw new Error('Reminder not found');

    let rudeMessage = existing.rudeMessage;
    if (updates.originalMessage || updates.rudenessLevel) {
      const message = updates.originalMessage || existing.originalMessage;
      const level = updates.rudenessLevel || existing.rudenessLevel;
      const phrases = await this.getRudePhrasesForLevel(level);
      const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
      rudeMessage = `${message}${randomPhrase?.phrase || ', get it done!'}`;
    }

    const updated = { 
      ...existing, 
      ...updates, 
      rudeMessage,
      updatedAt: new Date() 
    };
    const index = this.reminders.findIndex(r => r.id === id);
    if (index !== -1) {
      this.reminders[index] = updated;
    }
    return updated;
  }

  async deleteReminder(id: string, userId: string): Promise<void> {
    const index = this.reminders.findIndex(r => r.id === id && r.userId === userId);
    if (index !== -1) {
      this.reminders.splice(index, 1);
    }
  }

  async getActiveReminders(userId: string): Promise<Reminder[]> {
    return Array.from(this.reminders.values())
      .filter(r => r.userId === userId && !r.completed && r.scheduledFor >= new Date());
  }

  async getUpcomingReminders(): Promise<Reminder[]>{
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return Array.from(this.reminders.values())
      .filter(r => !r.completed && r.scheduledFor >= now && r.scheduledFor <= next24Hours);
  }

  async completeReminder(id: string, userId: string): Promise<Reminder> {
    const existing = await this.getReminder(id, userId);
    if (!existing) throw new Error('Reminder not found');

    const updated = { 
      ...existing, 
      completed: true, 
      completedAt: new Date(),
      loggedAt: new Date(),
      updatedAt: new Date() 
    };
    const index = this.reminders.findIndex(r => r.id === id);
    if (index !== -1) {
      this.reminders[index] = updated;
    }
    return updated;
  }

  async markReminderNotAccomplished(id: string, userId: string): Promise<Reminder> {
    const existing = await this.getReminder(id, userId);
    if (!existing) throw new Error('Reminder not found');

    const updated = { 
      ...existing, 
      notAccomplished: true, 
      notAccomplishedAt: new Date(),
      loggedAt: new Date(),
      updatedAt: new Date() 
    };
    const index = this.reminders.findIndex(r => r.id === id);
    if (index !== -1) {
      this.reminders[index] = updated;
    }
    return updated;
  }

  // Rude phrases operations
  async getRudePhrasesForLevel(level: number): Promise<RudePhrase[]> {
    if (!this.rudePhrasesSeeded) {
      await this.seedRudePhrases();
    }
    return this.rudePhrasesStore.filter(phrase => phrase.rudenessLevel === level);
  }

  async seedRudePhrases(): Promise<void> {
    if (this.rudePhrasesSeeded) return;

    const phrases = [
      // Level 1 - Gentle/Polite
      { id: '1', rudenessLevel: 1, phrase: ", you've got this! 💪", category: "encouraging", createdAt: new Date() },
      { id: '2', rudenessLevel: 1, phrase: ", take your time but don't forget! ⏰", category: "gentle", createdAt: new Date() },
      { id: '3', rudenessLevel: 1, phrase: ", friendly reminder! 😊", category: "polite", createdAt: new Date() },
      { id: '4', rudenessLevel: 1, phrase: ", just a gentle nudge! 👋", category: "soft", createdAt: new Date() },

      // Level 2 - Firm
      { id: '5', rudenessLevel: 2, phrase: ", don't let this slip by!", category: "firm", createdAt: new Date() },
      { id: '6', rudenessLevel: 2, phrase: ", time to get moving!", category: "assertive", createdAt: new Date() },
      { id: '7', rudenessLevel: 2, phrase: ", no excuses now!", category: "direct", createdAt: new Date() },
      { id: '8', rudenessLevel: 2, phrase: ", make it happen!", category: "motivational", createdAt: new Date() },

      // Level 3 - Sarcastic
      { id: '9', rudenessLevel: 3, phrase: ", because apparently you need reminding...", category: "sarcastic", createdAt: new Date() },
      { id: '10', rudenessLevel: 3, phrase: ", shocking that you haven't done this yet!", category: "ironic", createdAt: new Date() },
      { id: '11', rudenessLevel: 3, phrase: ", what a surprise, still not done!", category: "witty", createdAt: new Date() },
      { id: '12', rudenessLevel: 3, phrase: ", let me guess, you 'forgot' again?", category: "cynical", createdAt: new Date() },

      // Level 4 - Harsh
      { id: '13', rudenessLevel: 4, phrase: ", stop procrastinating like a lazy sloth!", category: "harsh", createdAt: new Date() },
      { id: '14', rudenessLevel: 4, phrase: ", get your act together already!", category: "demanding", createdAt: new Date() },
      { id: '15', rudenessLevel: 4, phrase: ", quit being such a slacker!", category: "critical", createdAt: new Date() },
      { id: '16', rudenessLevel: 4, phrase: ", enough with the excuses!", category: "impatient", createdAt: new Date() },

      // Level 5 - Savage
      { id: '17', rudenessLevel: 5, phrase: ", you absolute couch potato!", category: "savage", createdAt: new Date() },
      { id: '18', rudenessLevel: 5, phrase: ", stop being such a useless lump!", category: "brutal", createdAt: new Date() },
      { id: '19', rudenessLevel: 5, phrase: ", what's wrong with you?!", category: "offensive", createdAt: new Date() },
      { id: '20', rudenessLevel: 5, phrase: ", you're pathetic at this point!", category: "insulting", createdAt: new Date() },
    ];

    this.rudePhrasesStore = phrases;
    this.rudePhrasesSeeded = true;
  }

  // Statistics
  async getUserStats(userId: string): Promise<{
    activeReminders: number;
    completedToday: number;
    avgRudeness: number;
  }> {
    const userReminders = Array.from(this.reminders.values()).filter(r => r.userId === userId);

    // Active reminders
    const activeReminders = userReminders.filter(r => !r.completed && r.scheduledFor >= new Date());

    // Completed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const completedToday = userReminders.filter(r => 
      r.completed && 
      r.completedAt && 
      r.completedAt >= today && 
      r.completedAt < tomorrow
    );

    // Average rudeness
    const avgRudeness = userReminders.length > 0
      ? userReminders.reduce((sum, r) => sum + r.rudenessLevel, 0) / userReminders.length
      : 0;

    return {
      activeReminders: activeReminders.length,
      completedToday: completedToday.length,
      avgRudeness: Math.round(avgRudeness * 10) / 10,
    };
  }

  // Premium whitelist operations
  async getWhitelistEmails(): Promise<string[]> {
    return Array.from(this.whitelistEmails);
  }

  async addEmailToWhitelist(email: string, addedBy: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();
    if (this.whitelistEmails.has(normalizedEmail)) {
      return false;
    }
    this.whitelistEmails.add(normalizedEmail);
    return true;
  }

  async removeEmailFromWhitelist(email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();
    return this.whitelistEmails.delete(normalizedEmail);
  }

  async isEmailWhitelisted(email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();
    return this.whitelistEmails.has(normalizedEmail);
  }

  async logReminderEvent(event: InsertReminderEvent): Promise<ReminderEvent> {
    const row: ReminderEvent = {
      id: crypto.randomUUID(),
      userId: event.userId,
      reminderId: event.reminderId ?? null,
      action: event.action,
      scheduledFor: event.scheduledFor instanceof Date ? event.scheduledFor : new Date(event.scheduledFor),
      createdAt: new Date(),
    };
    return row;
  }

  async getReminderEvents(_userId: string): Promise<ReminderEvent[]> {
    return [];
  }
}

// Production-ready storage with fallback to memory when database unavailable
async function createStorage(): Promise<IStorage> {
  try {
    // Test database connection
    const testStorage = new DatabaseStorage();
    await testStorage.seedRudePhrases(); // This will fail if DB is unavailable
    console.log('✅ Database connection successful - using DatabaseStorage');
    return testStorage;
  } catch (error) {
    console.warn('⚠️  Database unavailable, falling back to MemoryStorage for development');
    console.warn('Error:', error instanceof Error ? error.message : 'Unknown error');
    const memStorage = new MemoryStorage();
    await memStorage.seedRudePhrases();
    return memStorage;
  }
}

// Create storage instance with fallback
let storageInstance: IStorage;
export const getStorage = async (): Promise<IStorage> => {
  if (!storageInstance) {
    storageInstance = await createStorage();
  }
  return storageInstance;
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
  async logReminderEvent(event: InsertReminderEvent) {
    return (await getStorage()).logReminderEvent(event);
  },
  async getReminderEvents(userId: string) {
    return (await getStorage()).getReminderEvents(userId);
  },
};