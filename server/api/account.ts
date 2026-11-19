// Account & sign-in: forgot / reset / change password, logout, delete account, current user, Siri token, settings
import type { Express } from "express";
import { matchLanguage } from "@shared/languages";
import { forgetUserLanguage } from "../utils/userLanguage";
import { storage } from "../storage";
import { sendPasswordResetEmail } from "../auth";
import { authTokens } from "@shared/schema";
import { db } from "../db";
import { eq, and, sql } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { generateSecureToken, getAuthUserId, revokeAuthToken, revokeAllUserTokens, isAuthenticated, signedInUserId } from "./shared";

// The only account fields a user may change through the settings routes.
// (Subscription, email, password and verification fields are NOT here.)
const ALLOWED_SETTINGS = [
  'firstName', 'lastName', 'nickname', 'timezone', 'darkMode', 'simplifiedInterface',
  'browserNotifications', 'voiceNotifications', 'emailNotifications', 'emailSummary',
  'snoozeTime', 'reminderFrequency', 'ethnicity', 'gender', 'age', 'country',
  'ethnicitySpecificQuotes', 'genderSpecificReminders',
  'defaultRudenessLevel', 'defaultVoiceCharacter', 'niceMode', 'backdropTheme', 'language'
];
function pickAllowedSettings(body: any): Record<string, any> {
  const picked: Record<string, any> = {};
  if (!body || typeof body !== 'object') return picked;
  for (const key of ALLOWED_SETTINGS) {
    if (key in body) picked[key] = body[key];
  }
  // Only codes the app supports; anything else is dropped
  if ('language' in picked) {
    const code = matchLanguage(picked.language);
    if (code) picked.language = code;
    else delete picked.language;
  }
  return picked;
}

export function registerAccountRoutes(app: Express) {
  // Forgot password — send reset email
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      const normalizedEmail = email.toLowerCase().trim();
      const user = await storage.getUserByEmail(normalizedEmail);

      console.log(`[ForgotPassword] email="${normalizedEmail}" user=${user ? user.id : 'NOT_FOUND'} hasPasswordHash=${!!user?.passwordHash}`);

      // Always return success to prevent email enumeration
      // Social-only accounts (Google/Apple) with a real, verified email may also use this
      // link to ADD a password, so email login opens the same account (same reminders).
      const canSetPassword = !!user && (
        !!user.passwordHash ||
        (!!(user as any).emailVerified && !!user.email && !user.email.endsWith('@noemail.local'))
      );
      if (!user || !canSetPassword) {
        return res.json({ message: "If an account exists with that email, a reset link has been sent." });
      }

      const token = crypto.randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await storage.updateUser(user.id, { resetToken: token, resetTokenExpiry: expiry });
      const emailSent = await sendPasswordResetEmail(normalizedEmail, token);
      console.log(`[ForgotPassword] Email sent=${emailSent} to "${normalizedEmail}" token=${token.slice(0, 8)}...`);

      res.json({ message: "If an account exists with that email, a reset link has been sent." });
    } catch (err) {
      console.error("Forgot password error:", err);
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // Reset password — validate token and set new password
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      const user = await storage.getUserByResetToken(token);
      if (!user || !user.resetTokenExpiry) {
        return res.status(400).json({ message: "This reset link has expired. Please request a new one." });
      }

      const now = new Date();
      if (now > user.resetTokenExpiry) {
        return res.status(400).json({ message: "This reset link has expired. Please request a new one." });
      }

      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);
      await storage.updateUser(user.id, {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      });

      res.json({ message: "Password updated successfully." });
    } catch (err) {
      console.error("Reset password error:", err);
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post('/api/auth/logout', async (req: any, res) => {
    try {
      const uid = getAuthUserId(req);
      if (uid) await (await import('../devSpace')).endAllDevSessions(uid);
    } catch { /* never block logout */ }
    // Revoke auth token if present
    if (req.authToken) {
      await revokeAuthToken(req.authToken);
    }
    
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  const deleteAttempts = new Map<string, { count: number; resetAt: number }>();

  app.post('/api/account/delete-with-password', async (req: any, res) => {
    try {
      const { email, password, confirmText } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      if (confirmText !== "DELETE") {
        return res.status(400).json({ message: "You must type DELETE to confirm account deletion" });
      }

      const sessionUserId = getAuthUserId(req);
      if (!sessionUserId) {
        return res.status(401).json({ message: "You must be logged in to delete your account" });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
      const rateLimitKey = `${normalizedEmail}:${clientIp}`;

      const now = Date.now();
      const attempt = deleteAttempts.get(rateLimitKey);
      if (attempt) {
        if (now < attempt.resetAt) {
          if (attempt.count >= 5) {
            return res.status(429).json({ message: "Too many attempts. Please try again later." });
          }
          attempt.count++;
        } else {
          deleteAttempts.set(rateLimitKey, { count: 1, resetAt: now + 15 * 60 * 1000 });
        }
      } else {
        deleteAttempts.set(rateLimitKey, { count: 1, resetAt: now + 15 * 60 * 1000 });
      }

      const user = await storage.getUserByEmail(normalizedEmail);

      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (user.id !== sessionUserId) {
        return res.status(403).json({ message: "You can only delete your own account" });
      }

      console.log(`[AUDIT] Account deletion: userId=${user.id}, email=${normalizedEmail}, ip=${clientIp}, timestamp=${new Date().toISOString()}`);

      await revokeAllUserTokens(user.id);

      try {
        await db.execute(sql`DELETE FROM sessions WHERE sess::text LIKE ${'%"userId":"' + user.id + '"%'}`);
      } catch (sessionErr) {
        console.error("Error clearing user sessions from DB:", sessionErr);
      }

      await storage.deleteUser(user.id);

      res.clearCookie('connect.sid', { path: '/' });

      req.session.destroy((err: any) => {
        if (err) {
          console.error("Session destroy error after account deletion:", err);
        }
        res.json({ message: "Account deleted successfully" });
      });
    } catch (error) {
      console.error("Error deleting account with password:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  app.post('/api/account/change-password', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new password are required" });
      }

      if (typeof newPassword !== 'string' || newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters" });
      }

      if (currentPassword === newPassword) {
        return res.status(400).json({ message: "New password must be different from your current password" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.passwordHash) {
        return res.status(400).json({ message: "Your account uses social sign-in. Password change is not available." });
      }

      const matches = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!matches) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(userId, { passwordHash: newHash } as any);

      const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
      console.log(`[AUDIT] Password change: userId=${userId}, email=${user.email || 'unknown'}, ip=${clientIp}, timestamp=${new Date().toISOString()}`);

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  app.delete('/api/account', async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
      console.log(`[AUDIT] Account deletion (in-app): userId=${userId}, email=${user?.email || 'unknown'}, ip=${clientIp}, timestamp=${new Date().toISOString()}`);
      
      await revokeAllUserTokens(userId);

      try {
        await db.execute(sql`DELETE FROM sessions WHERE sess::text LIKE ${'%"userId":"' + userId + '"%'}`);
      } catch (sessionErr) {
        console.error("Error clearing user sessions from DB:", sessionErr);
      }
      
      await storage.deleteUser(userId);
      
      res.clearCookie('connect.sid', { path: '/' });

      req.session.destroy((err: any) => {
        if (err) {
          console.error("Session destroy error after account deletion:", err);
        }
        res.json({ message: "Account deleted successfully" });
      });
    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  app.get('/api/auth/check', (req, res) => {
    const userId = getAuthUserId(req);
    if (userId) {
      res.json({ authenticated: true, userId });
    } else {
      res.json({ authenticated: false });
    }
  });

  // Protected auth routes (session-based and token-based sign-in)
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Safety net: anyone missed by the startup backfill gets a code now
      if (!user.userCode) {
        try {
          const { assignUserCode } = await import('../utils/userCode');
          user.userCode = await assignUserCode(user.id);
        } catch (codeErr) {
          console.warn("Could not assign user code:", codeErr);
        }
      }
      
      const { isUserPremium } = await import('../utils/premiumCheck');
      const isPremium = await isUserPremium(user.id);

      // Strip secrets — the app never needs these
      const { passwordHash, resetToken, resetTokenExpiry, emailVerificationToken, ...safeUser } = user as any;
      res.json({
        ...safeUser,
        hasPassword: !!passwordHash,
        subscriptionStatus: isPremium ? 'active' : (user.subscriptionStatus || 'free'),
        subscriptionPlan: isPremium ? 'premium' : (user.subscriptionPlan || 'free'),
        isPremium: isPremium,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Siri / Shortcuts access token — a separate, long-lived (1 year) bearer
  // token used only by the iOS App Intents extension (see ios/App/RudeRemindersIntents),
  // which runs as its own process and has no access to the main app's
  // session/Preferences storage. The user generates this once in
  // Settings > Siri & Shortcuts and pastes it into the "Connect Rude
  // Reminders" Shortcut; after that, "Add Reminder" phrases work without the
  // main app ever needing to open. Regenerating revokes the previous one.
  app.post('/api/auth/siri-token', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      await db.delete(authTokens).where(
        and(eq(authTokens.userId, userId), eq(authTokens.label, 'siri'))
      );

      const token = generateSecureToken();
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year

      await db.insert(authTokens).values({
        userId,
        token,
        expiresAt,
        label: 'siri',
      });

      res.json({ token, expiresAt });
    } catch (error) {
      console.error("Error generating Siri token:", error);
      res.status(500).json({ message: "Failed to generate token" });
    }
  });

  // Revoke the Siri/Shortcuts token (e.g. if it's exposed or no longer needed).
  app.delete('/api/auth/siri-token', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      await db.delete(authTokens).where(
        and(eq(authTokens.userId, userId), eq(authTokens.label, 'siri'))
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Error revoking Siri token:", error);
      res.status(500).json({ message: "Failed to revoke token" });
    }
  });

  // User settings routes
  app.patch('/api/user/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = signedInUserId(req);
      // Only ordinary settings may be changed here. Without this list a signed-in
      // user could set their own subscription, email or password fields.
      const updates = pickAllowedSettings(req.body);
      const user = await storage.updateUser(userId, updates);
      forgetUserLanguage(userId);
      const { passwordHash, resetToken, resetTokenExpiry, emailVerificationToken, ...safeUser } = (user || {}) as any;
      res.json({ ...safeUser, hasPassword: !!passwordHash });
    } catch (error) {
      console.error("Error updating user settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // Settings route (alias for user settings)
  app.put('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = signedInUserId(req);
      const updates = req.body;

      const sanitizedUpdates = pickAllowedSettings(updates);

      await storage.updateUser(userId, sanitizedUpdates);
      forgetUserLanguage(userId);

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ 
        error: "Failed to update settings",
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
}
