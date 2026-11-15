// Helpers shared by all the API route files: sign-in tokens, the admin and
// Developer Space checks, photo uploads, and small utilities.
import { type Request, type Response, type NextFunction } from "express";
import { storage } from "../storage";
import { isAuthenticated as baseIsAuthenticated } from "../replitAuth";
import { withUserZone, nextDayOccurrence } from "../utils/userTime";
import { authTokens } from "@shared/schema";
import { db } from "../db";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";
import { DeepSeekService } from "../services/deepseekService";
import multer from "multer";
import path from "path";
import fs from "fs";

// Generate cryptographically secure auth token
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Create auth token for user (valid for 30 days)
export async function createAuthToken(userId: string): Promise<string> {
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
export async function validateAuthToken(token: string): Promise<string | null> {
  const tokenRecord = await db.query.authTokens.findFirst({
    where: and(
      eq(authTokens.token, token),
      gt(authTokens.expiresAt, new Date())
    ),
  });
  
  return tokenRecord?.userId || null;
}

// Middleware to check Authorization header for token-based auth
export async function tokenAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    let userId: string | null;
    try {
      userId = await validateAuthToken(token);
    } catch (error) {
      console.error('Token authentication database check failed:', error);
      res.status(503).json({ message: 'Sign-in is temporarily unavailable. Please try again.' });
      return;
    }
    
    if (userId) {
      (req as any).tokenUserId = userId;
      (req as any).authToken = token; // Store token for potential revocation
    }
  }
  
  next();
}

// Helper to get authenticated user ID from any auth method
export function getAuthUserId(req: any): string | null {
  // Priority: token auth > session auth > Replit auth
  return req.tokenUserId || req.session?.userId || req.user?.claims?.sub || null;
}

// Admin gate — only the configured admin emails are allowed past this middleware.
// Override via ADMIN_EMAIL env var (comma-separated for multiple); falls back to the
// hard-coded owner addresses (dev: letmeknow6@icloud.com, prod: loqvm1@gmail.com).
export const ADMIN_EMAILS = (process.env.ADMIN_EMAIL || 'letmeknow6@icloud.com,loqvm1@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
export async function isAdmin(req: any, res: any, next: any) {
  const userId = getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  try {
    const user = await storage.getUser(userId);
    const email = user?.email?.toLowerCase();
    if (!user || !email || !ADMIN_EMAILS.includes(email)) {
      console.warn('[Admin] Forbidden access attempt by user:', userId, 'email:', user?.email);
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  } catch (e) {
    console.error('[Admin] Authorization check failed:', e);
    return res.status(500).json({ message: 'Authorization check failed' });
  }
}

// Every admin request must also carry a live Developer Space session (passcode
// entered recently on this device). Being signed in as an admin email is not enough.
export async function requireDevSession(req: any, res: any, next: any) {
  try {
    const { checkDevSession } = await import('../devSpace');
    const userId = getAuthUserId(req) as string;
    const token = req.get('x-dev-session') || undefined;
    const { ok } = await checkDevSession(userId, token, true);
    if (!ok) return res.status(401).json({ message: 'Developer Space is locked', code: 'DEV_LOCKED' });
    if (req.method !== 'GET') {
      console.log(`[DevSpace] ${req.method} ${req.path} by ${userId}`); // audit trail of changes
    }
    next();
  } catch (e) {
    console.error('[DevSpace] session check failed:', e);
    return res.status(500).json({ message: 'Developer Space check failed' });
  }
}

// Junk filter for "It Hit" feedback comments — catches empty, too-short, and
// all-emoji submissions before they'd otherwise clutter the admin review list.
// Genuine harmful content is caught separately by moderationService.
export function isJunkFeedbackText(text: string): { junk: boolean } {
  const trimmed = text.trim();
  if (!trimmed) return { junk: true };
  // Strip common emoji ranges + variation selectors/ZWJ; if nothing meaningful
  // is left, it was emoji-only.
  const withoutEmoji = trimmed
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, '')
    .trim();
  if (!withoutEmoji) return { junk: true };
  if (withoutEmoji.length < 6) return { junk: true };
  return { junk: false };
}

// Revoke auth token (for logout)
export async function revokeAuthToken(token: string): Promise<void> {
  await db.delete(authTokens).where(eq(authTokens.token, token));
}

// Revoke all tokens for a user (for account deletion)
export async function revokeAllUserTokens(userId: string): Promise<void> {
  await db.delete(authTokens).where(eq(authTokens.userId, userId));
}


export const deepseekService = new DeepSeekService();

// Multer configuration for file uploads
export const uploadDir = path.join(process.cwd(), 'attached_assets');
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

export const upload = multer({ 
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
export const REVENUECAT_API_BASE = 'https://api.revenuecat.com/v1';
if (!process.env.REVENUECAT_SECRET_KEY) {
  console.warn('RevenueCat secret key not found. Subscription features will be disabled.');
}

// Same login check as before, plus: routes behind it know the user's time zone
// (sent by the app as ?tz=...). See server/utils/userTime.ts.
export const isAuthenticated = withUserZone(baseIsAuthenticated);

// Helper function to get next occurrence of a specific day.
// Worked out in the user's time zone (see server/utils/userTime.ts) — it used to
// use the server's UTC clock, which put evening reminders on the wrong day.
export function getNextDayOccurrence(dayName: string, baseDateTime: string | undefined): Date {
  return nextDayOccurrence(dayName, baseDateTime);
}
