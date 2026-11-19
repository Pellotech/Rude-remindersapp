import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { users } from "@shared/schema";
import { DEFAULT_LANGUAGE, matchLanguage, type LanguageCode } from "@shared/languages";

/**
 * Same idea as ensureUserCodeColumn: add users.language at startup if it is
 * missing, so the new code never runs against a database without it. Matches
 * the drizzle schema exactly (nullable varchar(8)), so db:push sees no change.
 */
export async function ensureLanguageColumn(): Promise<void> {
  try {
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS language varchar(8)`);
  } catch (err) {
    console.error("❌ users.language column could not be ensured:", err instanceof Error ? err.message : err);
  }
}

// Reminder messages are generated in bursts; avoid a database read for each one.
const cache = new Map<string, { code: LanguageCode; at: number }>();
const CACHE_MS = 60_000;

export function forgetUserLanguage(userId: string) {
  cache.delete(userId);
}

/** The language a user's server-written text (Reem's messages, quotes) should be in. */
export async function getUserLanguage(userId: string | null | undefined): Promise<LanguageCode> {
  if (!userId) return DEFAULT_LANGUAGE;
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.code;
  let code: LanguageCode = DEFAULT_LANGUAGE;
  try {
    const [row] = await db.select({ language: users.language }).from(users).where(eq(users.id, userId));
    code = matchLanguage(row?.language) ?? DEFAULT_LANGUAGE;
  } catch {
    // Fall back to English rather than failing the reminder
  }
  cache.set(userId, { code, at: Date.now() });
  return code;
}
