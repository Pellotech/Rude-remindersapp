import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { log as slog } from "./utils/logger";
import * as path from 'path';
import { fileURLToPath } from 'url';
import { db } from "./db";
import { reminders, reminderEvents } from "@shared/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security headers. CSP is disabled because the app loads inline scripts
// (Vite dev HMR + Capacitor webview) and a strict CSP would block them.
// COEP is disabled so cross-origin assets (images, fonts) still load.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// === CORS + Preflight (must be first middleware) ===
app.use((req, res, next) => {
  const origin = req.headers.origin as string | undefined;
  
  // Debug logging
  console.log("CORS HIT:", req.method, req.path, "origin=", origin);

  // Allow Capacitor (iOS + Android) + production web domain
  const isAllowed =
    origin === "capacitor://localhost" ||
    origin === "https://localhost" ||
    origin === "http://localhost" ||
    origin === "ionic://localhost" ||
    origin === "https://rudereminder.replit.app" ||
    (origin?.endsWith(".replit.app") ?? false) ||
    (origin?.endsWith(".replit.dev") ?? false);

  if (origin && isAllowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  }

  if (req.method === "OPTIONS") {
    // Always end preflight cleanly
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  if (req.path.startsWith('/delete-account')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Structured JSON log line for filtering/search.
      slog.info("http_request", {
        method: req.method,
        path,
        status: res.statusCode,
        latencyMs: duration,
        userId: (req as any).user?.claims?.sub ?? (req as any).user?.id,
      });

      // Keep the pretty single-line log too for local dev readability.
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

/**
 * Dedup any duplicate (reminder_id, action) rows in reminder_events and ensure
 * the unique index exists. Idempotent — safe to run on every startup.
 *
 * Why this lives in app code (not drizzle migrations):
 * Production accumulated ~16k duplicate rows from a pre-fix bug. Adding the
 * unique index via a drizzle migration would fail validation on production
 * because the duplicates can't coexist with the constraint. By cleaning up
 * inside the app at boot, we decouple the fix from drizzle's migration system.
 */
async function dedupAndIndexReminderEvents() {
  // Stable lock id derived from a string: scoped so it can't collide with
  // other advisory locks the app may use later. Two integers => two-arg form.
  const LOCK_KEY_1 = 0x52454d49; // 'REMI'
  const LOCK_KEY_2 = 0x4e445550; // 'NDUP'

  try {
    // Serialize across pods/boots so two instances can't race the
    // dedup + CREATE UNIQUE INDEX critical section.
    await db.execute(sql`SELECT pg_advisory_lock(${LOCK_KEY_1}, ${LOCK_KEY_2})`);

    try {
      const before = await db.execute(sql`SELECT COUNT(*)::int AS c FROM reminder_events`);
      const beforeCount = (before.rows?.[0] as any)?.c ?? 0;

      // Only dedup rows where reminder_id IS NOT NULL. Postgres unique
      // indexes allow multiple NULLs, so collapsing NULL rows by GROUP BY
      // would over-delete legitimate analytics events whose source reminder
      // was deleted (reminderId is nullable in the schema).
      const dupResult = await db.execute(sql`
        DELETE FROM reminder_events
        WHERE reminder_id IS NOT NULL
          AND id NOT IN (
            SELECT MIN(id) FROM reminder_events
            WHERE reminder_id IS NOT NULL
            GROUP BY reminder_id, action
          )
      `);
      const deleted = (dupResult as any).rowCount ?? 0;

      if (deleted > 0) {
        console.log(`🧹 reminder_events dedup: removed ${deleted} duplicate row(s) (was ${beforeCount}, now ${beforeCount - deleted})`);
      }

      // Index creation is gated to production. If we created it in dev too,
      // Replit's deploy validator (which diffs dev DB vs prod DB) would
      // generate a CREATE UNIQUE INDEX migration on every publish and fail
      // validation because prod still has duplicates at validation time
      // (before this code has actually run there). By keeping the index
      // app-managed and prod-only, the validator sees no schema diff and
      // the cleanup happens at boot.
      if (process.env.NODE_ENV === 'production') {
        try {
          await db.execute(sql`
            CREATE UNIQUE INDEX IF NOT EXISTS reminder_events_reminder_action_unique
            ON reminder_events (reminder_id, action)
          `);
          console.log('✅ reminder_events unique index ensured (production)');
        } catch (indexErr) {
          // In production we want to know loudly if uniqueness can't be
          // enforced — silently continuing would leave the data layer
          // unprotected against future duplicate inserts.
          console.error('❌ FATAL: reminder_events unique index could not be created in production:', indexErr);
          throw indexErr;
        }
      }
    } finally {
      await db.execute(sql`SELECT pg_advisory_unlock(${LOCK_KEY_1}, ${LOCK_KEY_2})`);
    }
  } catch (err) {
    if (process.env.NODE_ENV === 'production') {
      // Re-throw in production so the deploy/health check fails loudly
      // rather than silently leaving the DB without uniqueness protection.
      throw err;
    }
    console.warn('⚠️  reminder_events dedup/index step failed (dev only, ignoring):', err instanceof Error ? err.message : err);
  }
}

/**
 * One-time backfill: migrate all existing completed/missed reminders into the
 * reminder_events table so historical data isn't lost.
 * This is safe to run on every startup — it skips reminders already logged.
 */
async function backfillReminderEvents() {
  // CRITICAL: reminder_events is the permanent analytics record.
  // NEVER insert an event without first checking it doesn't already exist.
  // Dedup key format: `${reminderId}:${action}` — must match exactly.
  // Never auto-delete from this table. Never re-run backfill without dedup check.
  try {
    // Get all (reminderId, action) pairs already in the event log so we don't re-insert
    const existingEvents = await db
      .select({ reminderId: reminderEvents.reminderId, action: reminderEvents.action })
      .from(reminderEvents);
    const alreadyLogged = new Set(
      existingEvents
        .filter(e => e.reminderId)
        .map(e => `${e.reminderId}:${e.action}`)
    );

    // Find completed reminders not yet in the event log
    const completedRows = await db
      .select()
      .from(reminders)
      .where(and(eq(reminders.completed, true), isNotNull(reminders.completedAt)));

    const missedRows = await db
      .select()
      .from(reminders)
      .where(and(eq(reminders.notAccomplished, true), isNotNull(reminders.notAccomplishedAt)));

    let inserted = 0;

    for (const r of completedRows) {
      const key = `${r.id}:completed`;
      if (!alreadyLogged.has(key)) {
        await db.insert(reminderEvents).values({
          userId: r.userId,
          reminderId: r.id,
          action: 'completed',
          scheduledFor: r.scheduledFor,
          createdAt: r.completedAt ?? r.updatedAt ?? new Date(),
        });
        inserted++;
      }
    }

    for (const r of missedRows) {
      const key = `${r.id}:missed`;
      if (!alreadyLogged.has(key)) {
        await db.insert(reminderEvents).values({
          userId: r.userId,
          reminderId: r.id,
          action: 'missed',
          scheduledFor: r.scheduledFor,
          createdAt: r.notAccomplishedAt ?? r.updatedAt ?? new Date(),
        });
        inserted++;
      }
    }

    if (inserted > 0) {
      console.log(`📊 Backfilled ${inserted} reminder event(s) into reminder_events table`);
    }
  } catch (err) {
    console.warn('⚠️  reminder_events backfill skipped:', err instanceof Error ? err.message : err);
  }
}

// Rate-limit only the credential-handling auth endpoints to block
// brute-force / password-stuffing. Other routes are unaffected.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts, please try again in a few minutes." },
  handler: (req, res, _next, options) => {
    slog.warn("rate_limited", { path: req.path, ip: req.ip });
    res.status(options.statusCode).json(options.message);
  },
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/reset-password", authLimiter);

(async () => {
  const server = await registerRoutes(app);

  // Clean up duplicate reminder_events rows and ensure unique index exists
  await dedupAndIndexReminderEvents();

  // Backfill existing completed/missed reminders into the event log
  await backfillReminderEvents();

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log error but don't throw (can crash process)
    slog.error("server_error", {
      method: req.method,
      path: req.path,
      status,
      message: err.message,
    });

    res.status(status).json({ message });
  });

  // Serve static files from client dist
  app.use(express.static(path.join(__dirname, '../client/dist')));

  // Serve uploaded attachments
  app.use('/attached_assets', express.static(path.join(process.cwd(), 'attached_assets')));

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();