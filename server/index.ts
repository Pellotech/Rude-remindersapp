import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import * as path from 'path';
import { fileURLToPath } from 'url';
import { db } from "./db";
import { reminders, reminderEvents } from "@shared/schema";
import { eq, and, isNotNull } from "drizzle-orm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

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

(async () => {
  const server = await registerRoutes(app);

  // Backfill existing completed/missed reminders into the event log
  await backfillReminderEvents();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    // Log error but don't throw (can crash process)
    console.error('Server error:', err.message);
    
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