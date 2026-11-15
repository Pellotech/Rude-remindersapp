// ─────────────────────────────────────────────────────────────────────────────
// Sets up the server: sign-in, background jobs, then every API route.
// The routes themselves live in server/api/ — one file per topic.
// ─────────────────────────────────────────────────────────────────────────────
import type { Express } from "express";
import { type Server } from "http";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { setupAuth } from "./replitAuth";
import { reminderService } from "./services/reminderService";
import { notificationService } from "./services/notificationService";
import { tokenAuthMiddleware } from "./api/shared";
import { startBackgroundJobs } from "./api/background";
import { registerAccountRoutes } from "./api/account";
import { registerRemindersRoutes } from "./api/reminders";
import { registerStatsRoutes } from "./api/stats";
import { registerContentRoutes } from "./api/content";
import { registerDevToolsRoutes } from "./api/devTools";
import { registerQuotesRoutes } from "./api/quotes";
import { registerSubscriptionsRoutes } from "./api/subscriptions";
import { registerAdminRoutes } from "./api/admin";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);
  
  // Token-based auth middleware for mobile apps
  app.use(tokenAuthMiddleware);

  // Initialize storage (will auto-detect database availability)
  await storage.seedRudePhrases();
  
  startBackgroundJobs();

  // Note: /api/auth/register and /api/auth/login are handled in replitAuth.ts (registered earlier)

  // Note: /api/auth/register and /api/auth/login are handled in replitAuth.ts (registered earlier)

  registerAccountRoutes(app);
  registerRemindersRoutes(app);
  registerStatsRoutes(app);
  registerContentRoutes(app);
  registerDevToolsRoutes(app);
  registerQuotesRoutes(app);
  registerSubscriptionsRoutes(app);
  registerAdminRoutes(app);

  const httpServer = createServer(app);

  // WebSocket setup for real-time notifications
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');

    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });
  });

  // Set up notification service with WebSocket server
  notificationService.setWebSocketServer(wss);

  // Initialize reminder scheduling
  reminderService.initializeScheduler();

  return httpServer;
}
