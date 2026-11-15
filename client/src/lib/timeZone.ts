// ─────────────────────────────────────────────────────────────────────────────
// Time zone for the app.
//
// Default ("Automatic"): the phone's own time zone — nothing here changes how
// dates behave, every helper below simply hands back the real date.
//
// Manual: the user picked a zone in Settings → Text Size & Time Zone. Then the
// times they choose and the times we show are in THAT zone, even if the phone's
// clock is set to another one.
//
// Either way the zone is sent to the server (?tz=...) so "today", "this week",
// "good morning" and repeat-day reminders are worked out for the user's zone
// instead of the server's (UTC).
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "reem_manual_time_zone";

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The zone the phone itself is set to. */
export function getDeviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

let cachedManual: string | null | undefined;

/** The zone the user picked by hand, or null for Automatic. */
export function getManualTimeZone(): string | null {
  if (cachedManual !== undefined) return cachedManual;
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch { /* storage unavailable */ }
  cachedManual = isValidTimeZone(stored) ? stored : null;
  return cachedManual;
}

/** Pass null to go back to Automatic. */
export function setManualTimeZone(tz: string | null): void {
  cachedManual = isValidTimeZone(tz) ? tz : null;
  try {
    if (cachedManual) localStorage.setItem(STORAGE_KEY, cachedManual);
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* storage unavailable */ }
}

/** The zone the app is using right now. */
export function getEffectiveTimeZone(): string {
  return getManualTimeZone() || getDeviceTimeZone();
}

/** The manual zone, but only when it actually differs from the phone's. */
function overrideZone(): string | null {
  const manual = getManualTimeZone();
  return manual && manual !== getDeviceTimeZone() ? manual : null;
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

/** Minutes the zone is ahead of UTC at that moment (Edmonton in winter = -420). */
export function offsetMinutesAt(date: Date, tz: string): number {
  const p: Record<string, number> = {};
  for (const part of formatterFor(tz).formatToParts(date)) {
    if (part.type !== "literal") p[part.type] = parseInt(part.value, 10);
  }
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second);
  const wholeSeconds = Math.floor(date.getTime() / 1000) * 1000;
  return Math.round((asUtc - wholeSeconds) / 60000);
}

/**
 * For SHOWING a time. Returns a Date whose normal fields (getHours, getDay,
 * date-fns format, toLocaleString…) read as the clock time in the user's zone.
 * With Automatic this is just the real date.
 */
export function toZoned(input: Date | string | number): Date {
  const real = new Date(input);
  const tz = overrideZone();
  if (!tz || isNaN(real.getTime())) return real;
  const w = new Date(real.getTime() + offsetMinutesAt(real, tz) * 60000);
  return new Date(
    w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate(),
    w.getUTCHours(), w.getUTCMinutes(), w.getUTCSeconds(), w.getUTCMilliseconds(),
  );
}

/**
 * For SAVING a time the user picked. Takes a Date whose fields are the clock
 * time in the user's zone (what toZoned() produces, or what a date picker
 * built) and returns the real moment. With Automatic this is just the date.
 */
export function fromZoned(wall: Date): Date {
  const tz = overrideZone();
  if (!tz || isNaN(wall.getTime())) return new Date(wall);
  const t = Date.UTC(
    wall.getFullYear(), wall.getMonth(), wall.getDate(),
    wall.getHours(), wall.getMinutes(), wall.getSeconds(), wall.getMilliseconds(),
  );
  let guess = t - offsetMinutesAt(new Date(t), tz) * 60000;
  guess = t - offsetMinutesAt(new Date(guess), tz) * 60000;
  return new Date(guess);
}

/** "Now" as a clock time in the user's zone — use for today / past-time checks. */
export function zonedNow(): Date {
  return toZoned(new Date());
}

/**
 * The reminder form keeps its time either as a clock time without a zone
 * ("2026-11-15T20:00", from the date picker) or as an exact moment ending in Z
 * (Quick Reminders). Returns the real moment for both.
 */
export function formValueToInstant(value: string): Date {
  const hasExplicitZone = /(Z|[+-]\d{2}:?\d{2})$/i.test(value.trim());
  return hasExplicitZone ? new Date(value) : fromZoned(new Date(value));
}

/** Minutes the user's zone is ahead of UTC right now, as this phone sees it. */
export function currentOffsetMinutes(): number {
  const tz = overrideZone();
  const now = new Date();
  return tz ? offsetMinutesAt(now, tz) : -now.getTimezoneOffset();
}

/**
 * Adds ?tz=<zone>&tzo=<offset> to our own API calls so the server knows the
 * user's zone. The offset is sent too in case the server's time zone rules are
 * out of date for that zone.
 */
export function withTimeZoneParam(url: string): string {
  if (!url.includes("/api/") || /[?&]tz=/.test(url)) return url;
  const [base, hash = ""] = url.split("#");
  const joined = `${base}${base.includes("?") ? "&" : "?"}tz=${encodeURIComponent(getEffectiveTimeZone())}&tzo=${currentOffsetMinutes()}`;
  return hash ? `${joined}#${hash}` : joined;
}

/** Fixed-offset choices ("UTC-6") for people whose phone has the rules wrong. */
export const FIXED_OFFSET_ZONES: string[] = (() => {
  const out: string[] = [];
  // IANA names these backwards: "Etc/GMT+6" means UTC-6.
  for (let h = 12; h >= 1; h--) out.push(`Etc/GMT+${h}`);
  out.push("UTC");
  for (let h = 1; h <= 14; h++) out.push(`Etc/GMT-${h}`);
  return out.filter(isValidTimeZone);
})();

/** Label for a zone with its current UTC offset, e.g. "Edmonton (UTC-6)". */
export function describeTimeZone(tz: string, at: Date = new Date()): string {
  const off = offsetMinutesAt(at, tz);
  const sign = off < 0 ? "-" : "+";
  const abs = Math.abs(off);
  const hh = Math.floor(abs / 60);
  const mm = abs % 60;
  const utc = off === 0 ? "UTC" : `UTC${sign}${hh}${mm ? `:${String(mm).padStart(2, "0")}` : ""}`;
  if (tz === "UTC" || tz.startsWith("Etc/")) return `${utc} (never changes)`;
  const city = tz.split("/").pop()!.replace(/_/g, " ");
  return `${city} (${utc})`;
}
