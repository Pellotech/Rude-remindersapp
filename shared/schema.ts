import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  defaultRudenessLevel: integer("default_rudeness_level").default(3),
  voiceNotifications: boolean("voice_notifications").default(true),
  emailNotifications: boolean("email_notifications").default(false),
  browserNotifications: boolean("browser_notifications").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reminders = pgTable("reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  rudeMessage: text("rude_message").notNull(),
  originalMessage: text("original_message").notNull(),
  rudenessLevel: integer("rudeness_level").notNull(),
  scheduledFor: timestamp("scheduled_for").notNull(),
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  browserNotification: boolean("browser_notification").default(true),
  voiceNotification: boolean("voice_notification").default(false),
  emailNotification: boolean("email_notification").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const rudePhrasesData = pgTable("rude_phrases_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rudenessLevel: integer("rudeness_level").notNull(),
  phrase: text("phrase").notNull(),
  category: varchar("category").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

const baseInsertReminderSchema = createInsertSchema(reminders).omit({
  id: true,
  userId: true,
  rudeMessage: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export const insertReminderSchema = baseInsertReminderSchema.refine((data) => {
  const scheduledDate = new Date(data.scheduledFor);
  const now = new Date();
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return scheduledDate >= now && scheduledDate <= oneWeekFromNow;
}, {
  message: "Reminder can only be scheduled up to one week in advance",
  path: ["scheduledFor"],
});

export const insertRudePhraseSchema = createInsertSchema(rudePhrasesData).omit({
  id: true,
  createdAt: true,
});

// Update schemas
export const updateReminderSchema = baseInsertReminderSchema.partial();
export const updateUserSchema = insertUserSchema.partial();

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type UpdateReminder = z.infer<typeof updateReminderSchema>;
export type Reminder = typeof reminders.$inferSelect;
export type RudePhrase = typeof rudePhrasesData.$inferSelect;
export type InsertRudePhrase = z.infer<typeof insertRudePhraseSchema>;
