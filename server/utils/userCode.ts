import { randomInt } from "crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import { users } from "@shared/schema";

/**
 * Every user gets a permanent 10-digit ID (first digit never 0, so it always
 * shows as exactly 10 digits). It is random, not counted up, so it does not
 * reveal how many users exist or who signed up before whom. It is meant for
 * future creator-to-user messaging and is never typed in by the user.
 */
export function generateUserCode(): string {
  return String(randomInt(1_000_000_000, 10_000_000_000));
}

export function isUserCodeCollision(err: unknown): boolean {
  const e = err as { code?: string; constraint?: string; message?: string } | null;
  if (e?.code !== "23505") return false;
  return (e.constraint ?? e.message ?? "").includes("user_code");
}

/**
 * Gives a user a code if they do not have one yet. Safe to call more than once:
 * an existing code is never replaced. Does not touch updated_at.
 */
export async function assignUserCode(userId: string): Promise<string | null> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateUserCode();
    if (await isUserCodeTaken(code)) continue;
    try {
      const rows = await db
        .update(users)
        .set({ userCode: code })
        .where(and(eq(users.id, userId), isNull(users.userCode)))
        .returning({ userCode: users.userCode });
      if (rows.length > 0) return rows[0].userCode;

      // Nothing updated: the user already has a code (or no longer exists).
      const [existing] = await db
        .select({ userCode: users.userCode })
        .from(users)
        .where(eq(users.id, userId));
      return existing?.userCode ?? null;
    } catch (err) {
      if (!isUserCodeCollision(err)) throw err;
    }
  }
  throw new Error("Could not generate a unique user code");
}

export async function isUserCodeTaken(code: string): Promise<boolean> {
  const [row] = await db.select({ id: users.id }).from(users).where(eq(users.userCode, code)).limit(1);
  return !!row;
}

/**
 * Runs at startup: makes sure no two users can share a code, then gives a code
 * to every existing user who does not have one.
 *
 * The unique index is created here, in production only, for the same reason as
 * the reminder_events index in server/index.ts: putting it in the drizzle schema
 * makes drizzle-kit offer to truncate the users table, and creating it in dev
 * would make Replit's publish step try to copy it over as a migration.
 */
export async function backfillUserCodes(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    try {
      await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS users_user_code_unique ON users (user_code)`);
    } catch (err) {
      console.error("❌ users.user_code unique index could not be created:", err instanceof Error ? err.message : err);
    }
  }
  try {
    const missing = await db.select({ id: users.id }).from(users).where(isNull(users.userCode));
    for (const u of missing) {
      await assignUserCode(u.id);
    }
    if (missing.length > 0) {
      console.log(`🔢 Gave ${missing.length} existing user(s) a 10-digit user code`);
    }
  } catch (err) {
    console.warn("⚠️  user code backfill skipped:", err instanceof Error ? err.message : err);
  }
}
