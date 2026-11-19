// Admin (Developer Space): environment, users, feature flags, hits, premium whitelist, dev-space lock
import type { Express } from "express";
import { storage } from "../storage";
import { addEmailToWhitelist, removeEmailFromWhitelist, getWhitelistedEmails } from "../utils/premiumCheck";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { getAuthUserId, isAdmin, requireDevSession, isAuthenticated } from "./shared";

export function registerAdminRoutes(app: Express) {
  // Admin: which environment is this server running in?
  app.get('/api/admin/env', isAuthenticated, isAdmin, requireDevSession, async (_req, res) => {
    const isProd = process.env.NODE_ENV === 'production' || !!process.env.REPLIT_DEPLOYMENT;
    res.json({
      environment: isProd ? 'production' : 'development',
      nodeEnv: process.env.NODE_ENV || 'development',
      replitDeployment: !!process.env.REPLIT_DEPLOYMENT,
    });
  });

  // Admin: list all registered users with summary info
  app.get('/api/admin/users', isAuthenticated, isAdmin, requireDevSession, async (_req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const whitelistedEmails = new Set(
        (await storage.getWhitelistEmails()).map(e => e.toLowerCase())
      );

      const summary = allUsers.map((u: any) => {
        const emailLc = (u.email || '').toLowerCase();
        const whitelisted = whitelistedEmails.has(emailLc);
        const subActive = u.subscriptionStatus === 'active';
        const isPremium = whitelisted || (u.subscriptionPlan === 'premium' && subActive);
        return {
          id: u.id,
          userCode: u.userCode ?? null,
          email: u.email,
          firstName: u.firstName ?? null,
          lastName: u.lastName ?? null,
          subscriptionPlan: u.subscriptionPlan ?? 'free',
          subscriptionStatus: u.subscriptionStatus ?? null,
          isPremium,
          premiumSource: whitelisted ? 'whitelist' : (isPremium ? 'subscription' : 'none'),
          createdAt: u.createdAt,
        };
      });

      // Most recent first
      summary.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });

      res.json({ users: summary, count: summary.length });
    } catch (error) {
      console.error('Error listing users:', error);
      res.status(500).json({ message: 'Failed to list users' });
    }
  });

  // Admin: feature flags
  // Known flags rendered in the UI even when not yet persisted
  const KNOWN_FLAGS: { key: string; description: string; default: boolean }[] = [
    { key: 'facebook_login', description: 'Show the Facebook sign-in button on the login page', default: true },
    { key: 'guest_mode', description: 'Allow visitors to use the app without signing up (future use)', default: false },
    { key: 'maintenance_mode', description: 'Show a maintenance banner and block writes for non-admin users', default: false },
  ];

  app.get('/api/admin/feature-flags', isAuthenticated, isAdmin, requireDevSession, async (_req, res) => {
    try {
      const stored = await storage.getFeatureFlags();
      const byKey = new Map(stored.map(f => [f.key, f]));
      const merged = KNOWN_FLAGS.map(known => {
        const persisted = byKey.get(known.key);
        return persisted
          ? { ...persisted }
          : { key: known.key, enabled: known.default, description: known.description, updatedAt: null, updatedBy: null };
      });
      // Include any extras stored that aren't in the known list
      for (const f of stored) {
        if (!KNOWN_FLAGS.find(k => k.key === f.key)) merged.push(f);
      }
      res.json({ flags: merged });
    } catch (error) {
      console.error('Error reading feature flags:', error);
      res.status(500).json({ message: 'Failed to read feature flags' });
    }
  });

  app.patch('/api/admin/feature-flags/:key', isAuthenticated, isAdmin, requireDevSession, async (req: any, res) => {
    try {
      const { key } = req.params;
      const { enabled } = req.body;
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ message: '`enabled` must be a boolean' });
      }
      const known = KNOWN_FLAGS.find(k => k.key === key);
      const userId = getAuthUserId(req);
      const flag = await storage.setFeatureFlag(key, enabled, userId || 'admin', known?.description);
      console.log(`[Admin] Feature flag '${key}' set to ${enabled} by ${userId}`);
      res.json({ flag });
    } catch (error) {
      console.error('Error updating feature flag:', error);
      res.status(500).json({ message: 'Failed to update feature flag' });
    }
  });

  // Admin routes for managing premium email whitelist
  app.get('/api/admin/reminder-hits', isAuthenticated, isAdmin, requireDevSession, async (_req: any, res) => {
    try {
      const hits = await storage.getHitReminders();
      res.json({ hits, count: hits.length });
    } catch (error) {
      console.error("Error getting reminder hits:", error);
      res.status(500).json({ message: "Failed to get reminder hits" });
    }
  });

  app.get('/api/admin/whitelist', isAuthenticated, isAdmin, requireDevSession, async (req: any, res) => {
    try {
      const emails = await getWhitelistedEmails();
      const entries = await Promise.all(emails.map(async (email) => ({
        email,
        hasAccount: !!(await storage.getUserByEmail(email)),
      })));
      res.json({ 
        emails,
        entries,
        count: emails.length 
      });
    } catch (error) {
      console.error("Error getting whitelist:", error);
      res.status(500).json({ message: "Failed to get whitelist" });
    }
  });

  app.post('/api/admin/whitelist', isAuthenticated, isAdmin, requireDevSession, async (req: any, res) => {
    try {
      const { email: rawEmail, password } = req.body;
      const adminId = getAuthUserId(req) as string; // isAuthenticated guarantees this

      if (!rawEmail || typeof rawEmail !== 'string' || !rawEmail.includes('@')) {
        return res.status(400).json({ message: "Valid email is required" });
      }
      const email = rawEmail.toLowerCase().trim();
      const existing = await storage.getUserByEmail(email);

      if (existing) {
        // Real (or existing) account → just grant Premium via the whitelist.
        // Never touch their password or name.
        await addEmailToWhitelist(email, adminId);
        return res.json({ success: true, email, created: false, message: "Existing account now has Premium" });
      }

      // No account yet → create a test login (password required)
      if (!password || typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ message: "No account with that email yet — add a password (8+ characters) to create a test login" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      await storage.upsertUser({
        id: crypto.randomUUID(),
        email,
        passwordHash: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
      });
      // Premium comes from the whitelist, so removing them later removes Premium too
      await addEmailToWhitelist(email, adminId);
      console.log(`Created whitelisted test user: ${email}`);
      res.json({ success: true, email, created: true, message: "Test login created with Premium" });
    } catch (error) {
      console.error("Error adding to whitelist:", error);
      res.status(500).json({ message: "Failed to add to whitelist" });
    }
  });

  // ── Dev Space passcode ────────────────────────────────────────────────
  // Second lock on top of the admin email check. The passcode lives ONLY in the
  // server environment (DEV_SPACE_PASSCODE secret) — never in the app code.
  app.post('/api/admin/dev-space/unlock', isAuthenticated, isAdmin, async (req: any, res) => {
    const expected = process.env.DEV_SPACE_PASSCODE;
    if (!expected) {
      return res.status(503).json({ message: "DEV_SPACE_PASSCODE is not set on the server yet" });
    }
    const ds = await import('../devSpace');
    const userId = getAuthUserId(req) as string;
    const waitMin = await ds.passcodeLockoutMinutes(userId);
    if (waitMin > 0) {
      return res.status(429).json({ message: `Too many wrong tries — wait ${waitMin} minute${waitMin === 1 ? '' : 's'}` });
    }
    const a = Buffer.from(String(req.body?.passcode ?? ''));
    const b = Buffer.from(expected);
    const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
    if (!ok) {
      await ds.recordFailedPasscode(userId);
      console.warn(`[DevSpace] wrong passcode for ${userId}`);
      return res.status(401).json({ message: "Wrong passcode" });
    }
    await ds.clearFailedPasscodes(userId);
    const token = await ds.startDevSession(userId);
    console.log(`[DevSpace] unlocked by ${userId}`);
    res.json({ success: true, token, idleMinutes: ds.DEV_IDLE_MINUTES, maxHours: ds.DEV_MAX_HOURS });
  });

  // Is this device still unlocked? (Checking does NOT count as activity.)
  app.get('/api/admin/dev-space/status', isAuthenticated, isAdmin, async (req: any, res) => {
    const { checkDevSession } = await import('../devSpace');
    const result = await checkDevSession(getAuthUserId(req) as string, req.get('x-dev-session') || undefined, false);
    res.json({ unlocked: result.ok, idleLocksAt: result.idleLocksAt ?? null });
  });

  // Lock — ends the Developer Space on every device
  app.post('/api/admin/dev-space/lock', isAuthenticated, isAdmin, async (req: any, res) => {
    const { endAllDevSessions } = await import('../devSpace');
    await endAllDevSessions(getAuthUserId(req) as string);
    console.log(`[DevSpace] locked everywhere by ${getAuthUserId(req)}`);
    res.json({ success: true });
  });

  app.delete('/api/admin/whitelist', isAuthenticated, isAdmin, requireDevSession, async (req: any, res) => {
    try {
      const { email } = req.body;

      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: "Valid email is required" });
      }

      const removed = await removeEmailFromWhitelist(email);

      if (removed) {
        console.log(`Removed email from premium whitelist: ${email}`);
        res.json({ 
          message: "Email removed from premium whitelist",
          email: email.toLowerCase().trim(),
          success: true
        });
      } else {
        res.status(404).json({ 
          message: "Email not found in the whitelist",
          email: email.toLowerCase().trim(),
          success: false
        });
      }
    } catch (error) {
      console.error("Error removing email from whitelist:", error);
      res.status(500).json({ message: "Failed to remove email from whitelist" });
    }
  });
}
