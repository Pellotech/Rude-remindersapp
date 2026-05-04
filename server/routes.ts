import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, sendPasswordResetEmail } from "./replitAuth";
import { insertReminderSchema, updateReminderSchema, type Reminder, type User, users, reminders, registerSchema, loginSchema, authTokens } from "@shared/schema";
import { db } from "./db";
import { eq, and, gt, lt, sql } from "drizzle-orm";
import { reminderService } from "./services/reminderService";
import { notificationService } from "./services/notificationService";
import { premiumQuotesService } from "./services/premiumQuotesService";
import { isUserPremium, addEmailToWhitelist, removeEmailFromWhitelist, getWhitelistedEmails, cleanupExpiredSubscriptions } from "./utils/premiumCheck";
import crypto from 'crypto';
import { DeepSeekService } from './services/deepseekService';
import bcrypt from 'bcryptjs';

// Generate cryptographically secure auth token
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Create auth token for user (valid for 30 days)
async function createAuthToken(userId: string): Promise<string> {
  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  
  await db.insert(authTokens).values({
    userId,
    token,
    expiresAt,
  });
  
  return token;
}

// Validate auth token and return user ID
async function validateAuthToken(token: string): Promise<string | null> {
  const tokenRecord = await db.query.authTokens.findFirst({
    where: and(
      eq(authTokens.token, token),
      gt(authTokens.expiresAt, new Date())
    ),
  });
  
  return tokenRecord?.userId || null;
}

// Middleware to check Authorization header for token-based auth
async function tokenAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const userId = await validateAuthToken(token);
    
    if (userId) {
      (req as any).tokenUserId = userId;
      (req as any).authToken = token; // Store token for potential revocation
    }
  }
  
  next();
}

// Helper to get authenticated user ID from any auth method
function getAuthUserId(req: any): string | null {
  // Priority: token auth > session auth > Replit auth
  return req.tokenUserId || req.session?.userId || req.user?.claims?.sub || null;
}

// Admin gate — only the production admin email is allowed past this middleware
const ADMIN_EMAIL = 'loqvm1@gmail.com';
async function isAdmin(req: any, res: any, next: any) {
  const userId = getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  try {
    const user = await storage.getUser(userId);
    if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL) {
      console.warn('[Admin] Forbidden access attempt by user:', userId, 'email:', user?.email);
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  } catch (e) {
    console.error('[Admin] Authorization check failed:', e);
    return res.status(500).json({ message: 'Authorization check failed' });
  }
}

// Revoke auth token (for logout)
async function revokeAuthToken(token: string): Promise<void> {
  await db.delete(authTokens).where(eq(authTokens.token, token));
}

// Revoke all tokens for a user (for account deletion)
async function revokeAllUserTokens(userId: string): Promise<void> {
  await db.delete(authTokens).where(eq(authTokens.userId, userId));
}

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const deepseekService = new DeepSeekService();

// Multer configuration for file uploads
const uploadDir = path.join(process.cwd(), 'attached_assets');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage_multer,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Accept images and videos only
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  }
});

// RevenueCat REST API configuration
const REVENUECAT_API_BASE = 'https://api.revenuecat.com/v1';
if (!process.env.REVENUECAT_SECRET_KEY) {
  console.warn('RevenueCat secret key not found. Subscription features will be disabled.');
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);
  
  // Token-based auth middleware for mobile apps
  app.use(tokenAuthMiddleware);

  // Initialize storage (will auto-detect database availability)
  await storage.seedRudePhrases();
  
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

  // Note: /api/auth/register and /api/auth/login are handled in replitAuth.ts (registered earlier)

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
      if (!user || !user.passwordHash) {
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

  // Protected auth routes (supports Replit Auth, session-based auth, and token-based auth)
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
      
      const { isUserPremium } = await import('./utils/premiumCheck');
      const isPremium = await isUserPremium(user.id);

      res.json({
        ...user,
        subscriptionStatus: isPremium ? 'active' : (user.subscriptionStatus || 'free'),
        subscriptionPlan: isPremium ? 'premium' : (user.subscriptionPlan || 'free'),
        isPremium: isPremium,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User settings routes
  app.patch('/api/user/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      const updates = req.body;
      const user = await storage.updateUser(userId, updates);
      res.json(user);
    } catch (error) {
      console.error("Error updating user settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // Settings route (alias for user settings)
  app.put('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      const updates = req.body;

      // Ensure notification settings are properly stored
      const allowedSettings = [
        'firstName', 'lastName', 'timezone', 'darkMode', 'simplifiedInterface',
        'browserNotifications', 'voiceNotifications', 'emailNotifications', 'emailSummary',
        'snoozeTime', 'reminderFrequency', 'ethnicity', 'gender', 'age', 'country',
        'ethnicitySpecificQuotes', 'genderSpecificReminders', 
        'defaultRudenessLevel', 'defaultVoiceCharacter', 'niceMode'
      ];

      const sanitizedUpdates = Object.keys(updates)
        .filter(key => allowedSettings.includes(key))
        .reduce((obj, key) => {
          obj[key] = updates[key];
          return obj;
        }, {} as any);

      // Update user in storage
      await storage.updateUser(userId, sanitizedUpdates);

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ 
        error: "Failed to update settings",
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Reminder routes
  app.get('/api/reminders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      // Prevent HTTP-level caching (Android WebView, CDN, browser) from serving stale reminder lists
      res.set('Cache-Control', 'no-store');
      const reminders = await storage.getReminders(userId);
      res.json(reminders);
    } catch (error) {
      console.error("Error fetching reminders:", error);
      res.status(500).json({ message: "Failed to fetch reminders" });
    }
  });

  // File upload endpoint (protected - requires authentication)
  app.post('/api/upload', isAuthenticated, upload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      // Return the file path relative to attached_assets
      const filePath = `/attached_assets/${req.file.filename}`;
      res.json({ filePath });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'File upload failed' });
    }
  });

  // Multer error handling middleware
  app.use((error: any, req: any, res: any, next: any) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Maximum size is 10MB.' });
      }
      return res.status(400).json({ error: `Upload error: ${error.message}` });
    }
    next(error);
  });

  // Create a new reminder
  app.post('/api/reminders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const {
        originalMessage,
        context,
        scheduledFor,
        rudenessLevel,
        voiceCharacter,
        attachments,
        motivationalQuote,
        selectedDays,
        isMultiDay,
        browserNotification,
        voiceNotification, 
        emailNotification,
        clientLocalTime
      } = req.body;

      // Use notification settings from frontend (which includes user's preferences) or fallback to user profile
      const finalBrowserNotification = browserNotification !== undefined ? browserNotification : (user.browserNotifications !== false);
      const finalVoiceNotification = voiceNotification !== undefined ? voiceNotification : (user.voiceNotifications || false);
      const finalEmailNotification = emailNotification !== undefined ? emailNotification : (user.emailNotifications || false);

      const { checkMonthlyReminderLimit, atomicIncrementAndCheck, getMonthlyResetDate } = await import('./utils/premiumCheck');

      if (isMultiDay && selectedDays && selectedDays.length > 0) {
        const limitCheck = await checkMonthlyReminderLimit(user.id);
        if (limitCheck.currentCount + selectedDays.length > limitCheck.limit) {
          return res.status(403).json({
            error: `You've reached your ${limitCheck.limit} reminder limit for this month. Your limit resets on ${limitCheck.resetDate}.`,
            code: 'REMINDER_LIMIT_EXCEEDED',
            currentCount: limitCheck.currentCount,
            limit: limitCheck.limit,
            resetDate: limitCheck.resetDate
          });
        }

        const createdReminders = [];

        for (const day of selectedDays) {
          // Calculate the next occurrence of this day
          const nextOccurrence = getNextDayOccurrence(day, scheduledFor);

          const reminderDataForDay = {
            originalMessage: originalMessage,
            context: context,
            scheduledFor: nextOccurrence.toISOString(),
            rudenessLevel: rudenessLevel,
            voiceCharacter: voiceCharacter,
            attachments: attachments,
            motivationalQuote: motivationalQuote,
            isMultiDay: false, // Individual reminders are not multi-day
            selectedDays: [], // Clear selected days for individual reminders
            title: `${originalMessage} (${day})` // Add day to title for clarity
          };

          // Create base reminder for the specific day
          let reminder = {
            id: crypto.randomUUID() as `${string}-${string}-${string}-${string}-${string}`,
            userId,
            title: reminderDataForDay.title,
            originalMessage: reminderDataForDay.originalMessage,
            context: reminderDataForDay.context || null,
            rudeMessage: "", // Will be generated by AI
            rudenessLevel: reminderDataForDay.rudenessLevel,
            scheduledFor: new Date(reminderDataForDay.scheduledFor),
            browserNotification: finalBrowserNotification,
            voiceNotification: finalVoiceNotification,
            emailNotification: finalEmailNotification,
            voiceCharacter: reminderDataForDay.voiceCharacter || "default",
            attachments: reminderDataForDay.attachments || [],
            motivationalQuote: reminderDataForDay.motivationalQuote || "",
            selectedDays: [], // Individual reminders don't have selectedDays
            isMultiDay: false,
            daySpecificMessages: null,
            completed: false,
            completedAt: null,
            notAccomplished: false,
            notAccomplishedAt: null,
            responses: [] as string[],
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Auto-generate motivational quote if none provided but context is available
          if (!reminder.motivationalQuote && reminder.context) {
            try {
              // Check if user has cultural preferences
              if (user.ethnicitySpecificQuotes && user.ethnicity) {
                // Generate cultural quote (this would use CulturalQuotesService logic)
                const culturalCategories = ['work', 'family', 'health', 'learning'];
                if (culturalCategories.includes(reminder.context)) {
                  // Simulate cultural quote generation - in real implementation this would use the service
                  const sampleCulturalQuotes = {
                    work: "Hard work is the foundation of success - African Proverb",
                    family: "Family is the anchor that holds us through storms - Latin Proverb", 
                    health: "A healthy body is a guest-chamber for the soul - Francis Bacon",
                    learning: "Education is the passport to the future - Malcolm X"
                  };
                  reminder.motivationalQuote = sampleCulturalQuotes[reminder.context as keyof typeof sampleCulturalQuotes] || "";
                }
              }

              // Fallback to general motivational quotes if no cultural quote generated
              if (!reminder.motivationalQuote) {
                // Import and use quotes service
                const { QuotesService } = await import('../client/src/services/quotesService');

                // Map context to quote categories
                const contextToCategory: Record<string, string> = {
                  work: 'entrepreneurs',
                  family: 'motivational', 
                  health: 'sports',
                  meditation: 'motivational',
                  learning: 'scientists',
                  cooking: 'motivational',
                  household: 'motivational',
                  finance: 'entrepreneurs',
                  entertainment: 'motivational'
                };

                const category = contextToCategory[reminder.context] || 'motivational';
                const quote = QuotesService.getRandomQuote(category);
                if (quote) {
                  reminder.motivationalQuote = QuotesService.formatQuote(quote);
                }
              }
            } catch (error) {
              console.error("Error generating motivational quote:", error);
              // Continue without quote if generation fails
            }
          }

          // Generate AI response automatically during form submission
          try {
            const generatedReminder = await reminderService.generateReminderResponse(reminder, clientLocalTime);
            reminder.rudeMessage = generatedReminder.rudeMessage;
            reminder.responses = generatedReminder.responses || [];
          } catch (error) {
            console.error("Error generating AI response:", error);
            // Fallback to basic message if AI generation fails
            reminder.rudeMessage = `Time to ${reminder.originalMessage}!`;
            reminder.responses = [`Time to ${reminder.originalMessage}!`];

          }

          // Update timestamp since everything is generated
          reminder.updatedAt = new Date();

          console.log("Created reminder with auto-generated content:", {
            id: reminder.id,
            motivationalQuote: reminder.motivationalQuote,
            rudeMessage: reminder.rudeMessage,
            responses: reminder.responses
          });

          const dayLimitResult = await atomicIncrementAndCheck(user.id, 1);
          if (!dayLimitResult.allowed) {
            break;
          }

          await storage.createReminder(userId, reminder);
          reminderService.scheduleReminder(reminder);
          createdReminders.push(reminder);
        }

        if (createdReminders.length === 0) {
          return res.status(403).json({
            error: `You've reached your reminder limit for this month. Your limit resets on ${getMonthlyResetDate()}.`,
            code: 'REMINDER_LIMIT_EXCEEDED'
          });
        }

        res.json({
          success: true,
          count: createdReminders.length,
          reminders: createdReminders
        });

      } else {
        // Handle single reminders as before
        // Validate scheduling time for quick reminders
        const scheduledDateTime = new Date(scheduledFor);
        const now = new Date();
        const timeDifference = scheduledDateTime.getTime() - now.getTime();
        const secondsDifference = timeDifference / 1000;

        // Allow quick reminders as short as 5 seconds for testing
        if (secondsDifference < 5) {
          return res.status(400).json({ 
            message: "Reminder must be scheduled at least 5 seconds in the future" 
          });
        }

        // Create base reminder
        let reminder = {
          id: crypto.randomUUID() as `${string}-${string}-${string}-${string}-${string}`,
          userId,
          title: originalMessage,
          originalMessage,
          context: context || null,
          rudeMessage: "", // Will be generated by AI
          rudenessLevel,
          scheduledFor: scheduledDateTime,
          browserNotification: finalBrowserNotification,
          voiceNotification: finalVoiceNotification,
          emailNotification: finalEmailNotification,
          voiceCharacter: voiceCharacter || "default",
          attachments: attachments || [],
          motivationalQuote: motivationalQuote || "",
          selectedDays: [],
          isMultiDay: false,
          daySpecificMessages: null,
          completed: false,
          completedAt: null,
          notAccomplished: false,
          notAccomplishedAt: null,
          responses: [] as string[],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Auto-generate motivational quote if none provided but context is available
        if (!reminder.motivationalQuote && context) {
          try {
            // Check if user has cultural preferences
            if (user.ethnicitySpecificQuotes && user.ethnicity) {
              // Generate cultural quote (this would use CulturalQuotesService logic)
              const culturalCategories = ['work', 'family', 'health', 'learning'];
              if (culturalCategories.includes(context)) {
                // Simulate cultural quote generation - in real implementation this would use the service
                const sampleCulturalQuotes = {
                  work: "Hard work is the foundation of success - African Proverb",
                  family: "Family is the anchor that holds us through storms - Latin Proverb", 
                  health: "A healthy body is a guest-chamber for the soul - Francis Bacon",
                  learning: "Education is the passport to the future - Malcolm X"
                };
                reminder.motivationalQuote = sampleCulturalQuotes[context as keyof typeof sampleCulturalQuotes] || "";
              }
            }

            // Fallback to general motivational quotes if no cultural quote generated
            if (!reminder.motivationalQuote) {
              // Import and use quotes service
              const { QuotesService } = await import('../client/src/services/quotesService');

              // Map context to quote categories
              const contextToCategory: Record<string, string> = {
                work: 'entrepreneurs',
                family: 'motivational', 
                health: 'sports',
                meditation: 'motivational',
                learning: 'scientists',
                cooking: 'motivational',
                household: 'motivational',
                finance: 'entrepreneurs',
                entertainment: 'motivational'
              };

              const category = contextToCategory[context] || 'motivational';
              const quote = QuotesService.getRandomQuote(category);
              if (quote) {
                reminder.motivationalQuote = QuotesService.formatQuote(quote);
              }
            }
          } catch (error) {
            console.error("Error generating motivational quote:", error);
            // Continue without quote if generation fails
          }
        }

        // Generate AI response automatically during form submission
        try {
          const generatedReminder = await reminderService.generateReminderResponse(reminder, clientLocalTime);
          reminder.rudeMessage = generatedReminder.rudeMessage;
          reminder.responses = generatedReminder.responses || [];
        } catch (error) {
          console.error("Error generating AI response:", error);
          // Fallback to basic message if AI generation fails
          reminder.rudeMessage = `Time to ${originalMessage}!`;
          reminder.responses = [`Time to ${originalMessage}!`];

        }

        // Update timestamp since everything is generated
        reminder.updatedAt = new Date();

        console.log("Created reminder with auto-generated content:", {
          id: reminder.id,
          motivationalQuote: reminder.motivationalQuote,
          rudeMessage: reminder.rudeMessage,
          responses: reminder.responses
        });

        const limitResult = await atomicIncrementAndCheck(user.id, 1);
        if (!limitResult.allowed) {
          return res.status(403).json({
            error: `You've reached your ${limitResult.limit} reminder limit for this month. Your limit resets on ${limitResult.resetDate}.`,
            code: 'REMINDER_LIMIT_EXCEEDED',
            currentCount: limitResult.newCount,
            limit: limitResult.limit,
            resetDate: limitResult.resetDate
          });
        }

        await storage.createReminder(userId, reminder);

        reminderService.scheduleReminder(reminder);

        res.json(reminder);
      }
    } catch (error) {
      console.error("Error creating reminder:", error);
      res.status(500).json({ message: "Failed to create reminder" });
    }
  });

  app.get('/api/reminders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      const reminder = await storage.getReminder(req.params.id, userId);
      if (!reminder) {
        return res.status(404).json({ message: "Reminder not found" });
      }
      res.json(reminder);
    } catch (error) {
      console.error("Error fetching reminder:", error);
      res.status(500).json({ message: "Failed to fetch reminder" });
    }
  });

  app.patch('/api/reminders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      const validatedData = updateReminderSchema.parse(req.body);
      const reminder = await storage.updateReminder(req.params.id, userId, validatedData);

      // Reschedule if needed
      reminderService.unscheduleReminder(req.params.id);
      if (!reminder.completed) {
        reminderService.scheduleReminder(reminder);
      }

      res.json(reminder);
    } catch (error) {
      console.error("Error updating reminder:", error);
      res.status(400).json({ message: "Failed to update reminder" });
    }
  });

  // Generate AI response for existing reminder
  app.post('/api/reminders/:id/generate-response', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      const reminder = await storage.getReminder(req.params.id, userId);
      if (!reminder) {
        return res.status(404).json({ message: "Reminder not found" });
      }

      // Generate AI response
      const updatedReminder = await reminderService.generateReminderResponse(reminder);

      // Update the reminder in storage
      await storage.updateReminder(req.params.id, userId, updatedReminder);

      res.json(updatedReminder);
    } catch (error) {
      console.error("Error generating response for existing reminder:", error);
      res.status(500).json({ message: "Failed to generate response" });
    }
  });

  // Get additional responses for a reminder
  app.get('/api/reminders/:id/more-responses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      const reminder = await storage.getReminder(req.params.id, userId);

      if (!reminder) {
        return res.status(404).json({ message: "Reminder not found" });
      }

      const { smartResponseService } = await import('./services/smartResponseService');

      // Force refresh to ensure new responses
      const forceRefresh = req.query.refresh === 'true';

      // Generate fresh responses with timestamp for uniqueness
      const personalizedResponses = await smartResponseService.getPersonalizedResponse(reminder, forceRefresh);
      const contextualRemarks = await smartResponseService.getContextualRemarks(reminder);

      // Get additional rude phrases for variety with timestamp shuffling
      const phrases = await storage.getRudePhrasesForLevel(reminder.rudenessLevel);
      const timestamp = Date.now();
      const additionalResponses = phrases
        .sort(() => 0.5 - Math.random() + (timestamp % 1000) / 10000)
        .slice(0, 5)
        .map(phrase => `${reminder.originalMessage} ${phrase.phrase} (Generated at ${new Date().toLocaleTimeString()})`);

      res.json({
        personalizedResponses,
        contextualRemarks,
        additionalResponses,
        totalCount: personalizedResponses.length + contextualRemarks.length + additionalResponses.length,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error getting more responses:", error);
      res.status(500).json({ message: "Failed to get more responses" });
    }
  });

  // Generate AI response for a specific reminder (Premium feature)
  app.post('/api/reminders/:id/generate-response', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      const reminder = await storage.getReminder(req.params.id, userId);
      if (!reminder) {
        return res.status(404).json({ message: "Reminder not found" });
      }

      // Generate AI response using the reminder service
      const updatedReminder = await reminderService.generateReminderResponse(reminder); 

      // Update the reminder in storage with the new AI response
      const finalReminder = {
        ...reminder,
        ...updatedReminder,
        updatedAt: new Date()
      };

      await storage.updateReminder(req.params.id, userId, finalReminder);

      res.json({
        ...updatedReminder,
        isPremium: true, // Assuming this endpoint is for premium users
        aiGenerated: true,
        source: 'ai-deepseek' 
      });
    } catch (error) {
      console.error("Error generating AI response:", error);
      res.status(500).json({ message: "Failed to generate AI response" });
    }
  });


  app.delete('/api/reminders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      await storage.deleteReminder(req.params.id, userId);
      reminderService.unscheduleReminder(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting reminder:", error);
      res.status(500).json({ message: "Failed to delete reminder" });
    }
  });

  app.patch('/api/reminders/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      const reminder = await storage.completeReminder(req.params.id, userId);
      reminderService.unscheduleReminder(req.params.id);
      res.json(reminder);
    } catch (error) {
      console.error("Error completing reminder:", error);
      res.status(500).json({ message: "Failed to complete reminder" });
    }
  });

  app.patch('/api/reminders/:id/not-accomplished', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      const reminder = await storage.markReminderNotAccomplished(req.params.id, userId);
      reminderService.unscheduleReminder(req.params.id);
      res.json(reminder);
    } catch (error) {
      console.error("Error marking reminder as not accomplished:", error);
      res.status(500).json({ message: "Failed to mark reminder as not accomplished" });
    }
  });

  // Statistics routes
  app.get('/api/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
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
      const userId = getAuthUserId(req);
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

      // --- This Week: Mon–Sun of the current ISO week ---
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const weekStart = new Date(now);
      const dow = now.getDay();
      const diffToMon = (dow === 0 ? -6 : 1 - dow);
      weekStart.setDate(now.getDate() + diffToMon);
      weekStart.setHours(0, 0, 0, 0);

      const weekData = dayNames.map((name, i) => {
        const dayStart = new Date(weekStart);
        dayStart.setDate(weekStart.getDate() + i);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);
        return makePoint(name, dayStart, dayEnd);
      });

      // --- This Year: bi-weekly, month-aligned (2 points per month) ---
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const currentMonthIdx = now.getMonth();
      const currentYear = now.getFullYear();
      const yearData: ReturnType<typeof makePoint>[] = [];
      for (let mi = 0; mi <= currentMonthIdx; mi++) {
        // First half: 1st–14th
        const h1Start = new Date(currentYear, mi, 1, 0, 0, 0, 0);
        const h1End = new Date(currentYear, mi, 14, 23, 59, 59, 999);
        if (h1Start <= now) {
          yearData.push(makePoint(monthNames[mi], h1Start, h1End > now ? now : h1End));
        }
        // Second half: 15th–end of month
        const h2Start = new Date(currentYear, mi, 15, 0, 0, 0, 0);
        const h2End = new Date(currentYear, mi + 1, 0, 23, 59, 59, 999);
        if (h2Start <= now) {
          yearData.push(makePoint('·', h2Start, h2End > now ? now : h2End));
        }
      }

      // --- Past 10 Weeks (dense: one point per 3 days = ~23 points) ---
      const tenWeeksData = Array.from({ length: 23 }, (_, i) => {
        const dayEnd = new Date(now);
        dayEnd.setDate(now.getDate() - (22 - i) * 3);
        dayEnd.setHours(23, 59, 59, 999);
        const dStart = new Date(dayEnd);
        dStart.setDate(dayEnd.getDate() - 2);
        dStart.setHours(0, 0, 0, 0);
        const label = `${dayEnd.getMonth() + 1}/${dayEnd.getDate()}`;
        return makePoint(label, dStart, dayEnd);
      });

      res.json({ week: weekData, year: yearData, tenWeeks: tenWeeksData });
    } catch (error) {
      console.error("Error fetching completion graph:", error);
      res.status(500).json({ message: "Failed to fetch completion graph" });
    }
  });

  // Rude phrases routes
  app.get('/api/phrases/:level', async (req, res) => {
    try {
      const level = parseInt(req.params.level);
      if (level < 1 || level > 5) {
        return res.status(400).json({ message: "Level must be between 1 and 5" });
      }
      const phrases = await storage.getRudePhrasesForLevel(level);
      res.json(phrases);
    } catch (error) {
      console.error("Error fetching phrases:", error);
      res.status(500).json({ message: "Failed to fetch phrases" });
    }
  });

  // AdMob config endpoint — returns publishable AdMob IDs from server-side secrets.
  // Public on purpose: ad unit IDs are visible inside any compiled app binary.
  app.get('/api/config/admob', (_req, res) => {
    res.json({
      appId: process.env.ADMOB_APP_ID || '',
      ios: {
        banner: process.env.ADMOB_IOS_BANNER_ID || '',
        interstitial: process.env.ADMOB_IOS_INTERSTITIAL_ID || '',
        reward: process.env.ADMOB_IOS_REWARD_ID || '',
      },
      android: {
        banner: process.env.ADMOB_ANDROID_BANNER_ID || '',
        interstitial: process.env.ADMOB_ANDROID_INTERSTITIAL_ID || '',
        reward: process.env.ADMOB_ANDROID_REWARD_ID || '',
      },
    });
  });

  // Voice characters endpoint
  app.get('/api/voices', async (req, res) => {
    try {
      const voiceCharacters = [
        {
          id: "default",
          name: "Scarlett",
          unrealId: "Scarlett",
          personality: "Professional and clear",
          testMessage: "This is Scarlett, your professional reminder voice.",
          premium: false
        },
        {
          id: "confident-leader",
          name: "Will (Confident Leader)", 
          unrealId: "Will",
          personality: "Bold, executive leadership style",
          testMessage: "Let's execute this plan efficiently and deliver results.",
          premium: true
        },
        {
          id: "british-butler",
          name: "Gerald (British Butler)",
          unrealId: "Dan", 
          personality: "Polite but passive-aggressive",
          testMessage: "I do beg your Pardon, but perhaps it's time you attended to your responsibilities.",
          premium: true
        },
        {
          id: "karen-nag",
          name: "Karen (The Disappointed Mother)",
          unrealId: "Liv",
          personality: "Nagging, impatient, impossible to ignore",
          testMessage: "I'm not angry, I'm just disappointed. Again. Are you even listening to me?",
          premium: true
        }
      ];

      res.json(voiceCharacters);
    } catch (error) {
      console.error("Error fetching voice characters:", error);
      res.status(500).json({ message: "Failed to fetch voice characters" });
    }
  });

  // Test voice endpoint
  app.post('/api/voices/test', async (req, res) => {
    try {
      const { voiceCharacter, testMessage } = req.body;

      if (!voiceCharacter) {
        return res.status(400).json({ message: "Voice character is required" });
      }

      const message = testMessage || "This is a test of your selected voice character.";
      const voiceSettings = notificationService.getBrowserVoiceSettings(voiceCharacter);
      const speechData = notificationService.generateBrowserSpeech(message, voiceCharacter);
      res.json({ speechData, voiceSettings, message, useBrowserSpeech: true });
    } catch (error) {
      console.error("Error testing voice:", error);
      res.status(500).json({ message: "Failed to test voice" });
    }
  });

  // Test speech endpoint for DevPreview compatibility  
  app.post('/api/test-speech', async (req, res) => {
    try {
      const { text, voiceId } = req.body;

      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }

      // Use browser speech synthesis instead of external API
      const character = voiceId || "default";
      const voiceSettings = notificationService.getBrowserVoiceSettings(character);
      const speechData = notificationService.generateBrowserSpeech(text, character);

      res.json({
        speechData,
        voiceSettings,
        useBrowserSpeech: true
      });
    } catch (error) {
      console.error("Error in test speech:", error);
      res.status(500).json({ message: "Failed to generate speech" });
    }
  });

  // Developer preview endpoint
  app.post('/api/dev/preview', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      const { task, rudenessLevel, voiceCharacter, category } = req.body;

      console.log(`Generating preview for user ${userId}:`, { task, rudenessLevel, voiceCharacter, category });

      // Create a sample reminder object
      const sampleReminder: Partial<Reminder> = {
        id: ('preview-' + Date.now()) as `${string}-${string}-${string}-${string}-${string}`,
        userId,
        title: task || 'Sample Task',
        originalMessage: task || 'Sample Task',
        rudeMessage: '',
        responses: [],
        scheduledFor: new Date(),
        rudenessLevel: rudenessLevel || 3,
        voiceCharacter: voiceCharacter || 'default',
        motivationalQuote: '',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Generate AI responses for premium users, templates for free users
      const isPremium = await isUserPremium(userId);

      if (isPremium) {
        try {
          const user = await storage.getUser(userId);
          const now = new Date();
          const timeOfDay = now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening';

          const context = {
            task: sampleReminder.title!,
            category: category || 'general',
            rudenessLevel: sampleReminder.rudenessLevel!,
            gender: user?.gender || undefined,
            culturalBackground: user?.ethnicity || undefined,
            timeOfDay
          };

          console.log(`Premium user ${userId} - generating AI responses for preview`);
          const responses = await deepseekService.generatePersonalizedResponses(context, 4);
          sampleReminder.responses = responses;
          sampleReminder.rudeMessage = responses[0] || `Time to ${task}!`;
          console.log(`Premium preview - using AI response: "${sampleReminder.rudeMessage}"`);
        } catch (error) {
          console.error('AI generation failed for preview, using fallback:', error);
          // Fallback to template
          const fallbackMessage = `Time to ${task}! Get moving!`;
          sampleReminder.rudeMessage = fallbackMessage;
          sampleReminder.responses = [fallbackMessage];
          console.log(`Premium preview fallback - using template: "${fallbackMessage}"`);
        }
      } else {
        // Free user - use template
        const templateMessage = `Time to ${task}! Let's get this done!`;
        sampleReminder.rudeMessage = templateMessage;
        sampleReminder.responses = [templateMessage];
        console.log(`Free user preview - using template: "${templateMessage}"`);
      }

      // Generate speech data for voice preview using the AI-generated message
      const speechData = notificationService.generateBrowserSpeech(
        sampleReminder.rudeMessage || 'Time to work!',
        sampleReminder.voiceCharacter || 'default'
      );

      const voiceSettings = notificationService.getBrowserVoiceSettings(sampleReminder.voiceCharacter || 'default');

      const previewData = {
        reminder: sampleReminder,
        speechData,
        voiceSettings,
        useBrowserSpeech: true,
        isPremium, // Add premium status to preview data
        notifications: {
          browser: {
            title: `Reminder: ${sampleReminder.title}`,
            body: sampleReminder.motivationalQuote 
              ? `${sampleReminder.rudeMessage}\n\n💪 ${sampleReminder.motivationalQuote}`
              : sampleReminder.rudeMessage,
            icon: '/favicon.ico'
          },
          voice: {
            text: sampleReminder.rudeMessage,
            character: sampleReminder.voiceCharacter,
            speechData,
            voiceSettings
          }
        }
      };

      res.json(previewData);
    } catch (error) {
      console.error("Error generating preview:", error);
      res.status(500).json({ 
        message: "Failed to generate preview",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Premium Quotes API - Get personalized AI or cultural quotes
  app.get('/api/quotes/personalized', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      const { category, ethnicity, gender } = req.query;

      const context = {
        category: category as string,
        ethnicity: ethnicity as string,
        gender: gender as string
      };

      const quote = await premiumQuotesService.getPersonalizedQuote(userId, context);
      const isPremium = await isUserPremium(userId);

      res.json({
        quote,
        isPremium,
        source: isPremium ? 'ai-generated' : 'cultural-library',
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error getting personalized quote:", error);
      res.status(500).json({ message: "Failed to get personalized quote" });
    }
  });

  // Topic-specific quote routes
  app.get('/api/quotes/sports', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      const quote = await premiumQuotesService.getPersonalizedQuote(userId, { category: 'sports' });
      const isPremium = await isUserPremium(userId);

      res.json({
        quote,
        isPremium,
        source: isPremium ? 'ai-generated' : 'cultural-library',
        category: 'sports',
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error getting sports quote:", error);
      res.status(500).json({ message: "Failed to get sports quote" });
    }
  });

  app.get('/api/quotes/historical', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      const quote = await premiumQuotesService.getPersonalizedQuote(userId, { category: 'historical' });
      const isPremium = await isUserPremium(userId);

      res.json({
        quote,
        isPremium,
        source: isPremium ? 'ai-generated' : 'cultural-library',
        category: 'historical',
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error getting historical quote:", error);
      res.status(500).json({ message: "Failed to get historical quote" });
    }
  });

  app.get('/api/quotes/entrepreneurs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      const quote = await premiumQuotesService.getPersonalizedQuote(userId, { category: 'entrepreneurs' });
      const isPremium = await isUserPremium(userId);

      res.json({
        quote,
        isPremium,
        source: isPremium ? 'ai-generated' : 'cultural-library',
        category: 'entrepreneurs',
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error getting entrepreneurs quote:", error);
      res.status(500).json({ message: "Failed to get entrepreneurs quote" });
    }
  });

  app.get('/api/quotes/scientists', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      const quote = await premiumQuotesService.getPersonalizedQuote(userId, { category: 'scientists' });
      const isPremium = await isUserPremium(userId);

      res.json({
        quote,
        isPremium,
        source: isPremium ? 'ai-generated' : 'cultural-library',
        category: 'scientists',
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error getting scientists quote:", error);
      res.status(500).json({ message: "Failed to get scientists quote" });
    }
  });

  app.get('/api/quotes/motivational', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      const quote = await premiumQuotesService.getPersonalizedQuote(userId, { category: 'motivational' });
      const isPremium = await isUserPremium(userId);

      res.json({
        quote,
        isPremium,
        source: isPremium ? 'ai-generated' : 'cultural-library',
        category: 'motivational',
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error getting motivational quote:", error);
      res.status(500).json({ message: "Failed to get motivational quote" });
    }
  });

  // Check premium status endpoint
  app.get('/api/user/premium-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      const { isPremium, user, source } = await import('./utils/premiumCheck').then(m => m.getUserPremiumStatus(userId));

      res.json({ 
        isPremium,
        source, // 'subscription', 'whitelist', 'free', etc.
        features: {
          aiGeneratedResponses: isPremium,
          aiGeneratedQuotes: isPremium,
          monthlyReminderLimit: isPremium ? 120 : 15,
          advancedVoiceCharacters: isPremium
        }
      });
    } catch (error) {
      console.error("Error checking premium status:", error);
      res.status(500).json({ message: "Failed to check premium status" });
    }
  });

  // Developer endpoint to toggle premium status (only for development)
  app.post('/api/dev/toggle-premium', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      const { isPremium } = req.body;

      // Update user subscription status
      const updates = {
        subscriptionPlan: isPremium ? 'premium' : 'free',
        subscriptionStatus: isPremium ? 'active' : 'free',
        subscriptionEndsAt: isPremium ? new Date('2025-12-31') : null
      };

      const updatedUser = await storage.updateUser(userId, updates);

      console.log(`Developer toggle: User ${userId} switched to ${updates.subscriptionPlan} plan`);

      res.json({
        success: true,
        subscriptionPlan: updates.subscriptionPlan,
        subscriptionStatus: updates.subscriptionStatus,
        isPremium
      });
    } catch (error) {
      console.error("Error toggling premium status:", error);
      res.status(500).json({ message: "Failed to toggle premium status" });
    }
  });

  // Test DeepSeek API integration
  app.post('/api/test-deepseek', async (req, res) => {
    try {
      const testContext = {
        task: req.body.task || 'study for exam',
        category: req.body.category || 'learning',
        rudenessLevel: req.body.rudenessLevel || 3,
        timeOfDay: 'evening'
      };

      const responses = await deepseekService.generatePersonalizedResponses(testContext, 3);

      res.json({ 
        success: true,
        context: testContext,
        responses,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('DeepSeek test failed:', error);
      res.status(500).json({ 
        success: false, 
        error: (error as Error).message,
        fallbackMessage: 'DeepSeek API integration failed - check API key and network connection'
      });
    }
  });

  // Generate quick AI preview for testing (doesn't save to database)
  app.post('/api/preview-reminder', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const {
        originalMessage,
        context,
        rudenessLevel,
        voiceCharacter
      } = req.body;

      // Create a temporary reminder object for AI generation
      const tempReminder = {
        id: crypto.randomUUID() as `${string}-${string}-${string}-${string}-${string}`,
        userId,
        title: originalMessage,
        originalMessage,
        context: context || null,
        rudeMessage: "",
        rudenessLevel: rudenessLevel || 3,
        scheduledFor: new Date(),
        browserNotification: true,
        voiceNotification: false,
        emailNotification: false,
        voiceCharacter: voiceCharacter || "default",
        attachments: [],
        motivationalQuote: "",
        selectedDays: [],
        isMultiDay: false,
        daySpecificMessages: null,
        completed: false,
        completedAt: null,
        notAccomplished: false,
        notAccomplishedAt: null,
        responses: [] as string[],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Generate AI response
      const generatedReminder = await reminderService.generateReminderResponse(tempReminder);

      res.json({
        success: true,
        rudeMessage: generatedReminder.rudeMessage,
        responses: generatedReminder.responses || []
      });
    } catch (error) {
      console.error('Error generating preview:', error);
      res.status(500).json({ 
        success: false, 
        error: (error as Error).message,
        rudeMessage: `Time to ${req.body.originalMessage}!`
      });
    }
  });

  // RevenueCat subscription endpoints

  // RevenueCat customer info route
  app.get('/api/customer-info', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Return stored RevenueCat customer info or default free status
      const customerInfo = {
        userId: userId,
        entitlements: user.revenueCatEntitlements || {},
        subscriptionStatus: user.subscriptionStatus || 'free',
        subscriptionPlan: user.subscriptionPlan || 'free',
        subscriptionEndsAt: user.subscriptionEndsAt
      };

      res.json(customerInfo);
    } catch (error: any) {
      console.error('Error fetching customer info:', error);
      res.status(500).json({ error: { message: error.message } });
    }
  });

  // Sync subscription status from mobile app after successful purchase
  // Verifies entitlements directly with RevenueCat — never trusts the client payload
  app.post('/api/sync-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
      }

      // Verify entitlements directly from RevenueCat — never trust the client
      const rcResponse = await fetch(
        `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.REVENUECAT_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!rcResponse.ok) {
        console.error('RevenueCat verification failed:', rcResponse.status);
        return res.status(402).json({ success: false, message: 'Could not verify subscription' });
      }

      const rcData = await rcResponse.json();
      const entitlements = rcData?.subscriber?.entitlements || {};
      const isPremium = Object.values(entitlements).some(
        (e: any) => e.expires_date === null || new Date(e.expires_date) > new Date()
      );

      if (isPremium) {
        await storage.updateUser(userId, {
          subscriptionStatus: 'active',
          subscriptionPlan: 'premium',
        });
        res.json({ success: true, message: 'Subscription verified and synced' });
      } else {
        res.json({ success: false, message: 'No active entitlements found' });
      }
    } catch (error: any) {
      console.error('Error syncing subscription:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Note: RevenueCat subscriptions are cancelled through the mobile app stores
  // This route handles subscription status updates from webhooks
  app.post('/api/cancel-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      const user = await storage.getUser(userId);

      if (!user || user.subscriptionStatus === 'free') {
        return res.status(404).json({ message: 'No active subscription found' });
      }

      // For RevenueCat, users cancel through app store settings
      // We just return instructions (iOS-focused for App Store compliance)
      res.json({
        message: 'To cancel your subscription, please use your device settings:\\n\\niOS: Settings > Your Name > Subscriptions',
        platform: 'mobile_store'
      });
    } catch (error: any) {
      console.error('Error processing cancellation request:', error);
      res.status(400).json({ error: { message: error.message } });
    }
  });

  // RevenueCat webhook handler
  app.post('/api/webhooks/revenuecat', async (req, res) => {
    // Verify RevenueCat webhook authorization header
    const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
    if (webhookSecret) {
      const authHeader = req.headers['authorization'];
      if (!authHeader || authHeader !== webhookSecret) {
        console.warn('[Webhook] Unauthorized request rejected — bad or missing auth header');
        return res.status(401).send('Unauthorized');
      }
    }

    const rcEvent = req.body;

    try {
      if (!rcEvent || !rcEvent.event || !rcEvent.event.app_user_id) {
        return res.status(400).send('Invalid RevenueCat webhook payload');
      }
    } catch (err: any) {
      console.error('Webhook payload validation failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      const eventType = rcEvent.event.type;
      const appUserId = rcEvent.event.app_user_id;
      
      switch (eventType) {
        case 'INITIAL_PURCHASE':
        case 'RENEWAL':
        case 'PRODUCT_CHANGE':
          // User has active subscription
          const entitlements = rcEvent.event.entitlements || {};
          await storage.updateUser(appUserId, {
            subscriptionStatus: 'active',
            subscriptionPlan: 'premium',
            revenueCatEntitlements: entitlements,
            subscriptionEndsAt: null
          });
          break;
          
        case 'CANCELLATION':
        case 'EXPIRATION':
          // Subscription ended
          await storage.updateUser(appUserId, {
            subscriptionStatus: 'canceled',
            subscriptionPlan: 'free',
            revenueCatEntitlements: {},
            subscriptionEndsAt: new Date()
          });
          break;

        default:
          console.log('Unhandled RevenueCat event type:', eventType);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // Test email endpoint - Add this route for manual testing
  app.get('/api/test-email', async (req, res) => {
    try {
      const testEmail = req.query.email as string || 'ruderemindersinfo@gmail.com';
      const success = await notificationService.sendTestEmail(testEmail);

      if (success) {
        res.json({ 
          message: `✅ Test email sent successfully to ${testEmail}`,
          timestamp: new Date().toISOString(),
          recipient: testEmail
        });
      } else {
        res.status(500).json({ 
          message: `❌ Failed to send test email to ${testEmail} - check email configuration`,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Test email error:', error);
      res.status(500).json({ 
        message: '❌ Test email failed', 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Admin routes for managing premium email whitelist
  app.get('/api/admin/whitelist', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const emails = await getWhitelistedEmails();
      res.json({ 
        emails,
        count: emails.length 
      });
    } catch (error) {
      console.error("Error getting whitelist:", error);
      res.status(500).json({ message: "Failed to get whitelist" });
    }
  });

  app.post('/api/admin/whitelist', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { email, password } = req.body;
      const userId = getAuthUserId(req);

      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: "Valid email is required" });
      }

      if (!password || typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const testUserId = crypto.randomUUID();
      
      await storage.upsertUser({
        id: testUserId,
        email: email.toLowerCase().trim(),
        passwordHash: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        subscriptionPlan: 'premium',
        subscriptionStatus: 'active',
      });

      const added = await addEmailToWhitelist(email, userId);

      if (added || true) {
        console.log(`Created test user with premium access: ${email}`);
        res.json({ 
          message: "Test user created with premium access",
          email: email.toLowerCase().trim(),
          success: true
        });
      }
    } catch (error) {
      console.error("Error creating test user:", error);
      res.status(500).json({ message: "Failed to create test user" });
    }
  });

  app.delete('/api/admin/whitelist', isAuthenticated, isAdmin, async (req: any, res) => {
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

// Helper function to get next occurrence of a specific day
function getNextDayOccurrence(dayName: string, baseDateTime: string | undefined): Date {
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const targetDayIndex = dayNames.indexOf(dayName.toLowerCase());

  if (targetDayIndex === -1) {
    throw new Error(`Invalid day name: ${dayName}`);
  }

  // If no base time provided, default to 9:00 AM
  const baseDate = baseDateTime ? new Date(baseDateTime) : (() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  })();
  const currentDate = new Date();

  // Start from tomorrow to avoid scheduling for today if the base time has passed for today
  const startDate = new Date();
  if (baseDate.getHours() < currentDate.getHours() || (baseDate.getHours() === currentDate.getHours() && baseDate.getMinutes() <= currentDate.getMinutes())) {
    startDate.setDate(startDate.getDate() + 1);
  } else {
    startDate.setDate(startDate.getDate()); // Start from today if the base time is in the future for today
  }


  // Find the next occurrence of the target day
  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(startDate);
    checkDate.setDate(startDate.getDate() + i);

    if (checkDate.getDay() === targetDayIndex) {
      // Set the time from the base date
      checkDate.setHours(baseDate.getHours(), baseDate.getMinutes(), 0, 0);
      return checkDate;
    }
  }

  // Fallback (should not reach here if logic is correct)
  // This might happen if the baseDateTime is very far in the future and the logic needs refinement for edge cases
  // For now, return the original base date as a fallback, though this might not be ideal.
  console.warn(`Could not find next occurrence for ${dayName} starting from ${startDate}. Returning original base date.`);
  return baseDate;
}