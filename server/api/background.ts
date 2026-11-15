// Background clean-up jobs started with the server.
import { reminders } from "@shared/schema";
import { db } from "../db";
import { and, lt, sql } from "drizzle-orm";
import { cleanupExpiredSubscriptions } from "../utils/premiumCheck";

export function startBackgroundJobs() {
  // Auto-delete reminders older than 365 days
  const cleanupOldReminders = async () => {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 365);
      const deleted = await db.delete(reminders).where(lt(reminders.scheduledFor, cutoff));
      const count = (deleted as any).rowCount ?? 0;
      if (count > 0) {
        console.log(`🗑️  Auto-deleted ${count} reminder(s) older than 365 days`);
      }
    } catch (err) {
      console.warn('365-day reminder cleanup failed:', err instanceof Error ? err.message : err);
    }
  };

  // Start subscription cleanup task (runs daily at 2 AM)
  const startCleanupScheduler = () => {
    const runCleanup = async () => {
      console.log('🧹 Running subscription expiration cleanup...');
      const result = await cleanupExpiredSubscriptions();
      if (result.cleaned > 0 || result.errors > 0) {
        console.log(`Cleanup results: ${result.cleaned} users downgraded, ${result.errors} errors`);
      }
      // Also purge reminders older than 365 days
      await cleanupOldReminders();
    };
    
    // Run once on startup
    runCleanup();
    
    // Then run daily at 2 AM
    const scheduleDaily = () => {
      const now = new Date();
      const next2AM = new Date(now);
      next2AM.setHours(2, 0, 0, 0);
      
      // If 2 AM has passed today, schedule for tomorrow
      if (now.getHours() >= 2) {
        next2AM.setDate(next2AM.getDate() + 1);
      }
      
      const timeUntilNext = next2AM.getTime() - now.getTime();
      
      setTimeout(() => {
        runCleanup();
        // Schedule next run (24 hours later)
        setInterval(runCleanup, 24 * 60 * 60 * 1000);
      }, timeUntilNext);
    };
    
    scheduleDaily();
  };
  
  startCleanupScheduler();

  // Hourly cleanup: delete reminders logged (completed/missed) more than 24h ago
  const cleanupLoggedReminders = async () => {
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const result = await db.delete(reminders).where(
        and(sql`${reminders.loggedAt} IS NOT NULL`, lt(reminders.loggedAt, cutoff))
      );
      const count = (result as any).rowCount ?? 0;
      if (count > 0) {
        console.log(`🗑️  Auto-deleted ${count} logged reminder(s) older than 24h`);
      }
    } catch (err) {
      console.warn('Logged reminders cleanup failed:', err instanceof Error ? err.message : err);
    }
  };
  cleanupLoggedReminders();
  setInterval(cleanupLoggedReminders, 60 * 60 * 1000);
}
