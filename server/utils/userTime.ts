// ─────────────────────────────────────────────────────────────────────────────
// User time zone helpers.
//
// The server runs in UTC, but "what day is it", "is it morning" and "next
// Tuesday at 8 PM" must be answered in the USER'S time zone. The app sends its
// zone as `?tz=America/Edmonton&tzo=-360` (name + current offset in minutes) on
// every API call. Older app
// versions don't, so for those we estimate the offset from the `clientLocalTime`
// text they already send when creating a reminder.
//
// The zone for the current request is kept in AsyncLocalStorage, so deep
// service code can call zonedHour() etc. without it being passed down by hand.
// When no zone is known, everything behaves exactly as before (server clock).
// ─────────────────────────────────────────────────────────────────────────────
import { AsyncLocalStorage } from "node:async_hooks";
import type { Request, Response, NextFunction, RequestHandler } from "express";

/** IANA name ("America/Edmonton"), fixed offset in minutes east of UTC, or null = server clock. */
export type Zone = string | number | null;

const zoneStore = new AsyncLocalStorage<{ zone: Zone }>();

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function zoneFromRequest(req: Request): Zone {
  const q = (req.query ?? {}) as Record<string, unknown>;
  const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);
  const tz = first(q.tz);
  const rawOffset = first(q.tzo);
  const parsed = typeof rawOffset === "string" && /^-?\d{1,4}$/.test(rawOffset) ? parseInt(rawOffset, 10) : null;
  const offset = parsed !== null && parsed >= -12 * 60 && parsed <= 14 * 60 ? parsed : null;

  if (isValidTimeZone(tz)) {
    // The phone also sends its real UTC offset right now (?tzo=). If this
    // server's time zone rules disagree — e.g. they're older than a law change
    // like Alberta dropping clock changes in 2026 — believe the phone.
    if (offset !== null && offsetMinutesAt(new Date(), tz) !== offset) return offset;
    return tz;
  }
  return offset;
}

/**
 * Wraps an auth middleware so that everything running AFTER it (the route
 * handler and all the async work it starts) knows the user's time zone.
 * Done here, right before the handler, so the context can't be lost inside
 * session / database callbacks that ran earlier.
 */
export function withUserZone(auth: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    auth(req, res, (err?: any) => {
      if (err) return next(err);
      zoneStore.run({ zone: zoneFromRequest(req) }, () => next());
    });
  };
}

/** The current request's zone (null when unknown). */
export function currentZone(): Zone {
  return zoneStore.getStore()?.zone ?? null;
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/**
 * Estimate a UTC offset (minutes) from text like
 * "Tuesday, November 3, 2026 at 7:25 PM" — the phone's local time, which every
 * app version sends when creating a reminder.
 */
export function offsetFromClientLocalTime(text: unknown, now: Date = new Date()): number | null {
  if (typeof text !== "string" || text.length > 120) return null;
  const m = text.match(/([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4}).*?(\d{1,2}):(\d{2})\s*([AP]M)/i);
  if (!m) return null;
  const month = MONTHS.indexOf(m[1].toLowerCase());
  if (month < 0) return null;
  let hour = parseInt(m[4], 10) % 12;
  if (m[6].toUpperCase() === "PM") hour += 12;
  const wallAsUtc = Date.UTC(parseInt(m[3], 10), month, parseInt(m[2], 10), hour, parseInt(m[5], 10));
  const diffMin = (wallAsUtc - now.getTime()) / 60000;
  const rounded = Math.round(diffMin / 15) * 15;
  // Real offsets are between UTC-12 and UTC+14; anything else means a wrong phone clock.
  if (rounded < -12 * 60 || rounded > 14 * 60) return null;
  return rounded;
}

/**
 * Call inside a route when the request body carries zone hints. Only fills the
 * zone in when the `?tz=` parameter didn't already provide one.
 */
export function noteClientZone(timeZone?: unknown, clientLocalTime?: unknown): void {
  const store = zoneStore.getStore();
  if (!store || store.zone !== null) return;
  if (isValidTimeZone(timeZone)) {
    store.zone = timeZone;
    return;
  }
  const offset = offsetFromClientLocalTime(clientLocalTime);
  if (offset !== null) store.zone = offset;
}

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatterFor(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric", month: "numeric", day: "numeric",
      hour: "numeric", minute: "numeric", second: "numeric",
    });
    formatters.set(tz, f);
  }
  return f;
}

/** Minutes the zone is ahead of UTC at that instant (Edmonton in winter = -420). */
export function offsetMinutesAt(date: Date, zone: Zone = currentZone()): number {
  if (zone === null) return -date.getTimezoneOffset();
  if (typeof zone === "number") return zone;
  const p: Record<string, number> = {};
  for (const part of formatterFor(zone).formatToParts(date)) {
    if (part.type !== "literal") p[part.type] = parseInt(part.value, 10);
  }
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second);
  const wholeSeconds = Math.floor(date.getTime() / 1000) * 1000;
  return Math.round((asUtc - wholeSeconds) / 60000);
}

/**
 * "Wall clock" view of an instant: a Date whose getUTC*() fields read as the
 * user's local date and time. Do calendar maths on it, then call fromWall().
 */
export function toWall(date: Date, zone: Zone = currentZone()): Date {
  return new Date(date.getTime() + offsetMinutesAt(date, zone) * 60000);
}

/** Inverse of toWall(): turns a wall-clock Date back into the real instant. */
export function fromWall(wall: Date, zone: Zone = currentZone()): Date {
  const t = wall.getTime();
  let guess = t - offsetMinutesAt(new Date(t), zone) * 60000;
  guess = t - offsetMinutesAt(new Date(guess), zone) * 60000;
  return new Date(guess);
}

/** Hour of the day (0–23) in the user's zone. */
export function zonedHour(date: Date = new Date(), zone: Zone = currentZone()): number {
  return toWall(date, zone).getUTCHours();
}

/** Start of the user's local day containing `date`, and the start of the next one. */
export function zonedDayRange(date: Date = new Date(), zone: Zone = currentZone()): { start: Date; end: Date } {
  const w = toWall(date, zone);
  const y = w.getUTCFullYear(), m = w.getUTCMonth(), d = w.getUTCDate();
  return {
    start: fromWall(new Date(Date.UTC(y, m, d)), zone),
    end: fromWall(new Date(Date.UTC(y, m, d + 1)), zone),
  };
}

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/**
 * Next time `dayName` comes round at the time-of-day of `baseDateTime`
 * (default 9:00 AM), all judged in the user's zone. If that time has already
 * passed today, the search starts tomorrow.
 */
export function nextDayOccurrence(
  dayName: string,
  baseDateTime: string | undefined,
  zone: Zone = currentZone(),
  now: Date = new Date(),
): Date {
  const targetDayIndex = DAY_NAMES.indexOf(String(dayName).toLowerCase());
  if (targetDayIndex === -1) throw new Error(`Invalid day name: ${dayName}`);

  let hour = 9, minute = 0;
  const base = baseDateTime ? new Date(baseDateTime) : null;
  if (base && !isNaN(base.getTime())) {
    const baseWall = toWall(base, zone);
    hour = baseWall.getUTCHours();
    minute = baseWall.getUTCMinutes();
  }

  const nowWall = toWall(now, zone);
  const passedToday = hour * 60 + minute <= nowWall.getUTCHours() * 60 + nowWall.getUTCMinutes();
  const firstOffset = passedToday ? 1 : 0;

  for (let i = 0; i < 7; i++) {
    const wall = new Date(Date.UTC(
      nowWall.getUTCFullYear(), nowWall.getUTCMonth(), nowWall.getUTCDate() + firstOffset + i,
      hour, minute, 0, 0,
    ));
    if (wall.getUTCDay() === targetDayIndex) return fromWall(wall, zone);
  }
  // Unreachable: 7 consecutive days always contain every weekday.
  throw new Error(`Could not find next occurrence for ${dayName}`);
}
