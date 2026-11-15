/**
 * Developer Space sessions — stored in the database so they work across all
 * server instances (Replit autoscale) and survive restarts.
 *
 * Rules:
 *  - Unlocking with the passcode starts a session on THAT device only and ends any
 *    session on other devices (one device at a time).
 *  - Locks after 60 minutes without any Developer Space activity.
 *  - Locks after 12 hours no matter what.
 *  - "Lock" ends the session everywhere.
 *  - Every admin request must carry a live session — the email check alone is not enough.
 *  - 5 wrong passcodes → locked out for 15 minutes (counted in the database).
 */
import crypto from "crypto";
import { pool } from "./db";

export const DEV_IDLE_MINUTES = 60;
export const DEV_MAX_HOURS = 12;
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MIN = 15;

const hash = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

let ready: Promise<void> | null = null;
export function ensureDevSpaceTables(): Promise<void> {
  if (!ready) {
    ready = pool.query(`
      CREATE TABLE IF NOT EXISTS dev_space_sessions (
        token_hash TEXT PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_used TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS dev_space_sessions_user ON dev_space_sessions(user_id);
      CREATE TABLE IF NOT EXISTS dev_space_attempts (
        user_id VARCHAR PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0,
        reset_at TIMESTAMPTZ NOT NULL
      );
    `).then(() => undefined).catch((e) => { ready = null; throw e; });
  }
  return ready;
}

/** Returns minutes left in the lockout, or 0 if the user may try. */
export async function passcodeLockoutMinutes(userId: string): Promise<number> {
  await ensureDevSpaceTables();
  const r = await pool.query(`SELECT count, reset_at FROM dev_space_attempts WHERE user_id = $1`, [userId]);
  const row = r.rows[0];
  if (!row || new Date(row.reset_at).getTime() < Date.now() || row.count < MAX_ATTEMPTS) return 0;
  return Math.ceil((new Date(row.reset_at).getTime() - Date.now()) / 60000);
}

export async function recordFailedPasscode(userId: string): Promise<void> {
  await ensureDevSpaceTables();
  await pool.query(`
    INSERT INTO dev_space_attempts (user_id, count, reset_at)
    VALUES ($1, 1, NOW() + INTERVAL '${ATTEMPT_WINDOW_MIN} minutes')
    ON CONFLICT (user_id) DO UPDATE SET
      count = CASE WHEN dev_space_attempts.reset_at < NOW() THEN 1 ELSE dev_space_attempts.count + 1 END,
      reset_at = CASE WHEN dev_space_attempts.reset_at < NOW() THEN NOW() + INTERVAL '${ATTEMPT_WINDOW_MIN} minutes' ELSE dev_space_attempts.reset_at END
  `, [userId]);
}

export async function clearFailedPasscodes(userId: string): Promise<void> {
  await ensureDevSpaceTables();
  await pool.query(`DELETE FROM dev_space_attempts WHERE user_id = $1`, [userId]);
}

/** New session for this device; any other device is signed out of the Developer Space. */
export async function startDevSession(userId: string): Promise<string> {
  await ensureDevSpaceTables();
  const token = crypto.randomBytes(32).toString("hex");
  await pool.query(`DELETE FROM dev_space_sessions WHERE user_id = $1`, [userId]);
  await pool.query(
    `INSERT INTO dev_space_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '${DEV_MAX_HOURS} hours')`,
    [hash(token), userId],
  );
  return token;
}

/** Is this device's session still alive? `touch` counts the request as activity. */
export async function checkDevSession(userId: string, token: string | undefined, touch: boolean):
  Promise<{ ok: boolean; idleLocksAt?: string }> {
  if (!token) return { ok: false };
  await ensureDevSpaceTables();
  const r = await pool.query(
    `SELECT last_used, expires_at FROM dev_space_sessions
       WHERE token_hash = $1 AND user_id = $2
         AND expires_at > NOW()
         AND last_used > NOW() - INTERVAL '${DEV_IDLE_MINUTES} minutes'`,
    [hash(token), userId],
  );
  if (!r.rows[0]) {
    await pool.query(`DELETE FROM dev_space_sessions WHERE token_hash = $1`, [hash(token)]);
    return { ok: false };
  }
  let lastUsed = new Date(r.rows[0].last_used);
  if (touch) {
    await pool.query(`UPDATE dev_space_sessions SET last_used = NOW() WHERE token_hash = $1`, [hash(token)]);
    lastUsed = new Date();
  }
  const idle = new Date(lastUsed.getTime() + DEV_IDLE_MINUTES * 60000);
  const max = new Date(r.rows[0].expires_at);
  return { ok: true, idleLocksAt: (idle < max ? idle : max).toISOString() };
}

/** "Lock" — ends the Developer Space on every device. */
export async function endAllDevSessions(userId: string): Promise<void> {
  await ensureDevSpaceTables();
  await pool.query(`DELETE FROM dev_space_sessions WHERE user_id = $1`, [userId]);
}
