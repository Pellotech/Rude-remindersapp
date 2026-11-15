// Stats: counts and the completion graph
import type { Express } from "express";
import { storage } from "../storage";
import { toWall, fromWall } from "../utils/userTime";
import { getAuthUserId, isAuthenticated, signedInUserId } from "./shared";

export function registerStatsRoutes(app: Express) {
  // Statistics routes
  app.get('/api/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = signedInUserId(req);
      res.set('Cache-Control', 'no-store');
      const reminders = await storage.getReminders(userId);
      const user = await storage.getUser(userId);

      const completed = reminders.filter(r => r.completed);
      const overdue = reminders.filter(r => !r.completed && new Date(r.scheduledFor) < new Date());

      const stats = {
        total: reminders.length,
        completed: completed.length,
        pending: reminders.length - completed.length,
        overdue: overdue.length,
        monthlyReminderUsage: user?.monthlyReminderUsage || {},
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Completion graph data endpoint
  app.get('/api/stats/completion-graph', isAuthenticated, async (req: any, res) => {
    try {
      const userId = signedInUserId(req);
      res.set('Cache-Control', 'no-store');

      // Read from the persistent event log so data survives reminder deletion
      const events = await storage.getReminderEvents(userId);
      const completedEvents = events.filter(e => e.action === 'completed');
      const missedEvents = events.filter(e => e.action === 'missed');

      const now = new Date();

      // Count 'missed' events whose scheduledFor falls in [start, end]
      const countIncomplete = (start: Date, end: Date) =>
        missedEvents.filter(e => {
          const d = new Date(e.scheduledFor);
          return d >= start && d <= end && d <= now;
        }).length;

      // Count 'completed' events whose createdAt (when marked done) falls in [start, end]
      const countCompleted = (start: Date, end: Date) =>
        completedEvents.filter(e => {
          const d = new Date(e.createdAt);
          return d >= start && d <= end;
        }).length;

      const makePoint = (name: string, start: Date, end: Date) => {
        const done = countCompleted(start, end);
        const missed = countIncomplete(start, end);
        return { name, completed: done, incomplete: -missed };
      };

      // All day/week/month boundaries below are in the USER'S time zone.
      // `wallAt` builds an instant from a local calendar date + time.
      const nowWall = toWall(now);
      const Y = nowWall.getUTCFullYear(), M = nowWall.getUTCMonth(), D = nowWall.getUTCDate();
      const wallAt = (y: number, m: number, d: number, endOfDay = false) =>
        fromWall(new Date(endOfDay ? Date.UTC(y, m, d, 23, 59, 59, 999) : Date.UTC(y, m, d, 0, 0, 0, 0)));

      // --- This Week: Mon–Sun of the current ISO week ---
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const dow = nowWall.getUTCDay();
      const diffToMon = (dow === 0 ? -6 : 1 - dow);

      const weekData = dayNames.map((name, i) =>
        makePoint(name, wallAt(Y, M, D + diffToMon + i), wallAt(Y, M, D + diffToMon + i, true)));

      // --- This Year: bi-weekly, month-aligned (2 points per month) ---
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const yearData: ReturnType<typeof makePoint>[] = [];
      for (let mi = 0; mi <= M; mi++) {
        // First half: 1st–14th
        const h1Start = wallAt(Y, mi, 1);
        const h1End = wallAt(Y, mi, 14, true);
        if (h1Start <= now) {
          yearData.push(makePoint(monthNames[mi], h1Start, h1End > now ? now : h1End));
        }
        // Second half: 15th–end of month
        const h2Start = wallAt(Y, mi, 15);
        const h2End = wallAt(Y, mi + 1, 0, true);
        if (h2Start <= now) {
          yearData.push(makePoint('·', h2Start, h2End > now ? now : h2End));
        }
      }

      // --- Past 10 Weeks (dense: one point per 3 days = ~23 points) ---
      const tenWeeksData = Array.from({ length: 23 }, (_, i) => {
        const endDay = D - (22 - i) * 3;
        const labelDate = new Date(Date.UTC(Y, M, endDay));
        const label = `${labelDate.getUTCMonth() + 1}/${labelDate.getUTCDate()}`;
        return makePoint(label, wallAt(Y, M, endDay - 2), wallAt(Y, M, endDay, true));
      });

      res.json({ week: weekData, year: yearData, tenWeeks: tenWeeksData });
    } catch (error) {
      console.error("Error fetching completion graph:", error);
      res.status(500).json({ message: "Failed to fetch completion graph" });
    }
  });
}
