import { log as slog } from "./utils/logger";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { db } from "./db";
import { authTokens } from "@shared/schema";

// Generate cryptographically secure auth token
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// --- Tester Whitelist ---
// Comma-separated list of emails that skip email verification and get free-tier access
function getTesterEmails(): Set<string> {
  const raw = process.env.TESTER_EMAILS || "";
  return new Set(
    raw.split(",").map(e => e.trim().toLowerCase()).filter(Boolean)
  );
}

function isTesterEmail(email: string): boolean {
  return getTesterEmails().has(email.toLowerCase().trim());
}

// --- Social sign-in: one account per person ---
// Looks up the provider account; if none, links to an existing account with the SAME
// VERIFIED email (so signing up with email and later tapping "Continue with Google"
// lands in the same account instead of failing); otherwise creates a new account.
async function findOrCreateSocialUser(opts: {
  provider: "apple" | "google" | "facebook";
  providerUserId: string;
  email?: string | null;
  emailVerified: boolean;
  firstName?: string | null;
  lastName?: string | null;
  picture?: string | null;
}) {
  const providerId = `${opts.provider}_${opts.providerUserId}`;
  const existing = await storage.getUser(providerId);
  if (existing) return existing;

  const email = opts.email ? opts.email.toLowerCase().trim() : null;
  if (email) {
    const byEmail = await storage.getUserByEmail(email);
    if (byEmail) {
      if (opts.emailVerified) {
        // The provider proved this person owns the email. If the old account was an
        // email/password sign-up that was never verified, its password can't be trusted
        // (someone else may have registered it) — remove it so only the real owner gets in.
        const updates: any = { emailVerified: true, emailVerificationToken: null };
        if ((byEmail as any).passwordHash && !(byEmail as any).emailVerified) updates.passwordHash = null;
        await storage.updateUser(byEmail.id, updates);
        slog.info("auth_account_linked", { provider: opts.provider, userId: byEmail.id });
        return (await storage.getUser(byEmail.id))!;
      }
      // Unverified provider email — don't link; create a separate account without it
    }
  }

  const canUseEmail = email && !(await storage.getUserByEmail(email));
  await storage.upsertUser({
    id: providerId,
    email: canUseEmail ? email! : `${opts.provider}_user_${opts.providerUserId}@noemail.local`,
    firstName: opts.firstName || null,
    lastName: opts.lastName || null,
    profileImageUrl: opts.picture || null,
    emailVerified: !!(canUseEmail && opts.emailVerified),
  } as any);
  return (await storage.getUser(providerId))!;
}

// Native sign-in may only send the token back to OUR app — never to a URL from the request
const NATIVE_AUTH_CALLBACK = "rudereminders://auth-callback";
function safeNativeCallback(requested: unknown): string {
  return requested === NATIVE_AUTH_CALLBACK ? requested : NATIVE_AUTH_CALLBACK;
}

// --- Email verification helpers ---
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // links work for 24 hours

/** Token carries its own expiry ("<random>.<expiresAtMs>") so no database change is needed. */
function generateVerificationToken(): string {
  return `${generateSecureToken()}.${Date.now() + VERIFY_TOKEN_TTL_MS}`;
}
function isVerificationTokenExpired(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false; // links sent before this change: still honoured
  const expiresAt = Number(parts[1]);
  return Number.isFinite(expiresAt) && Date.now() > expiresAt;
}

// Resend limits: 1 per minute and 5 per hour per email, 15 per hour per device/network
const resendByEmail = new Map<string, number[]>();
const resendByIp = new Map<string, number[]>();
function resendBlockedReason(email: string, ip: string): string | null {
  const now = Date.now(), HOUR = 60 * 60 * 1000;
  const e = (resendByEmail.get(email) || []).filter((t) => now - t < HOUR);
  const i = (resendByIp.get(ip) || []).filter((t) => now - t < HOUR);
  if (e.length && now - e[e.length - 1] < 60 * 1000) return "Please wait a minute before asking for another email.";
  if (e.length >= 5 || i.length >= 15) return "Too many emails requested. Please try again in an hour.";
  e.push(now); i.push(now);
  resendByEmail.set(email, e); resendByIp.set(ip, i);
  return null;
}

if (!process.env.EMAIL_APP_PASSWORD) {
  console.error("⚠️  EMAIL_APP_PASSWORD is not set — verification and password-reset emails CANNOT be sent. New email sign-ups will be stuck until this secret is added.");
}

function resultPage(title: string, message: string, ok: boolean): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;background:#FDF3E3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:420px;margin:60px auto;padding:32px 24px;background:#fff;border:3px solid #C9A063;border-radius:20px;text-align:center;">
    <img src="/logo.png" alt="Reems Rude Reminders" style="width:120px;height:auto;margin-bottom:16px;" />
    <div style="font-size:44px;margin-bottom:8px;">${ok ? "🎉" : "⏰"}</div>
    <h2 style="color:#1B2A5E;margin:0 0 10px;">${title}</h2>
    <p style="color:#374151;font-size:16px;line-height:1.5;margin:0;">${message}</p>
  </div>
</body></html>`;
}

// --- Email Verification Sender ---
async function sendVerificationEmail(toEmail: string, token: string): Promise<boolean> {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER || "ruderemindersinfo@gmail.com",
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });

    const domain = "rude-reminders.replit.app";
    const verifyUrl = `https://${domain}/api/auth/verify-email?token=${token}`;
    const logoUrl = `https://${domain}/logo.png`;

    await transporter.sendMail({
      from: `"Reems Rude Reminders" <${process.env.EMAIL_USER || "ruderemindersinfo@gmail.com"}>`,
      to: toEmail,
      subject: "Verify your Reems Rude Reminders account",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;text-align:center;">
          <img src="${logoUrl}" alt="Reems Rude Reminders" style="width:120px;height:auto;margin-bottom:24px;" />
          <h2 style="color:#1B2A5E;margin-top:0;">Welcome to Reems Rude Reminders!</h2>
          <p style="color:#374151;">Click the button below to verify your email address and activate your account.</p>
          <a href="${verifyUrl}" style="display:inline-block;background:#C53B3B;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;font-size:16px;">
            Verify My Email
          </a>
          <p style="color:#9CA3AF;font-size:12px;margin-top:24px;">If you didn't create this account, you can safely ignore this email.</p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error("❌ Failed to send verification email to", toEmail, "—", err);
    slog.warn("verification_email_failed", { reason: String((err as any)?.message || err) });
    return false;
  }
}

// --- Password Reset Email Sender ---
export async function sendPasswordResetEmail(toEmail: string, token: string): Promise<boolean> {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER || "ruderemindersinfo@gmail.com",
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });

    const domain = "rude-reminders.replit.app";
    const resetUrl = `https://${domain}/reset-password?token=${token}`;
    const logoUrl = `https://${domain}/logo.png`;

    await transporter.sendMail({
      from: `"Reems Rude Reminders" <${process.env.EMAIL_USER || "ruderemindersinfo@gmail.com"}>`,
      to: toEmail,
      subject: "Reset your Reems Rude Reminders password",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;text-align:center;">
          <img src="${logoUrl}" alt="Reems Rude Reminders" style="width:120px;height:auto;margin-bottom:24px;" />
          <h2 style="color:#1B2A5E;margin-top:0;">Reset Your Password</h2>
          <p style="color:#374151;">Click the button below to reset your password. This link expires in 1 hour.</p>
          <a href="${resetUrl}" style="display:inline-block;background:#C53B3B;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;font-size:16px;">
            Reset My Password
          </a>
          <p style="color:#9CA3AF;font-size:12px;margin-top:24px;">If you didn't request a password reset, you can safely ignore this email.</p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error("Failed to send password reset email:", err);
    return false;
  }
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


export function getSession() {
  const sessionTtl = 14 * 24 * 60 * 60 * 1000; // 2 weeks

  // Try to use PostgreSQL sessions, fallback to memory for development
  let sessionStore;
  try {
    if (
      process.env.DATABASE_URL &&
      !process.env.DATABASE_URL.includes(
        "ep-empty-queen-a24ac3h3.eu-central-1.aws.neon.tech",
      )
    ) {
      const pgStore = connectPg(session);
      sessionStore = new pgStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
        ttl: sessionTtl / 1000,
        tableName: "sessions",
      });
      console.log("✅ Using PostgreSQL session store");
    } else {
      throw new Error("Database not available or disabled");
    }
  } catch (error) {
    console.warn(
      "⚠️  Using memory session store (sessions will not persist across restarts)",
    );
    // Use default memory store
    sessionStore = undefined; // Express will use default memory store
  }

  return session({
    secret: process.env.SESSION_SECRET || "default-development-secret",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: sessionTtl,
    },
  });
}


export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Email/Password Local Strategy
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          const normalizedEmail = email.toLowerCase().trim();
          const user = await storage.getUserByEmail(normalizedEmail);
          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }

          if (!user.passwordHash) {
            return done(null, false, {
              message: "Please use social login for this account",
            });
          }

          const isValidPassword = await bcrypt.compare(
            password,
            user.passwordHash,
          );
          if (!isValidPassword) {
            return done(null, false, { message: "Invalid email or password" });
          }

          // Block login if email not verified (testers always bypass this check)
          if (!user.emailVerified && !isTesterEmail(normalizedEmail)) {
            return done(null, false, { message: "EMAIL_NOT_VERIFIED" });
          }

          // Create session-compatible user object
          const sessionUser = {
            claims: {
              sub: user.id,
              email: user.email,
              first_name: user.firstName,
              last_name: user.lastName,
              profile_image_url: user.profileImageUrl,
              exp: Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60, // 2 weeks
            },
            access_token: "local-auth",
            refresh_token: null,
            expires_at: Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60,
          };

          return done(null, sessionUser);
        } catch (error) {
          return done(error);
        }
      },
    ),
  );

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Email/Password Authentication Routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email and password are required" });
      }

      if (password.length < 8) {
        return res
          .status(400)
          .json({ message: "Password must be at least 8 characters" });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(normalizedEmail);
      if (existingUser) {
        return res
          .status(400)
          .json({ message: "User already exists with this email" });
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Testers skip verification; everyone else must verify
      const skipVerification = isTesterEmail(normalizedEmail);
      const verificationToken = skipVerification ? null : generateVerificationToken();

      // Create user
      const userId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newUser = await storage.upsertUser({
        id: userId,
        email: normalizedEmail,
        firstName: firstName || null,
        lastName: lastName || null,
        profileImageUrl: null,
        passwordHash,
        emailVerified: skipVerification,
        emailVerificationToken: verificationToken,
      });

      if (!skipVerification) {
        // Account is created either way; tell the app whether the email actually went out
        const emailSent = await sendVerificationEmail(normalizedEmail, verificationToken!);

        return res.json({
          success: true,
          verification_required: true,
          email_sent: emailSent,
          message: emailSent
            ? "Account created! Please check your email to verify your account before logging in."
            : "Account created, but we couldn't send the verification email. Tap Resend in a moment.",
        });
      }

      // Tester path: log straight in
      const authToken = await createAuthToken(userId);
      res.json({
        success: true,
        authToken,
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          subscriptionStatus: newUser.subscriptionStatus || 'free',
          subscriptionPlan: newUser.subscriptionPlan || 'free',
        }
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  // Email verification endpoint (link clicked in email)
  app.get("/api/auth/verify-email", async (req, res) => {
    const { token } = req.query;
    if (!token || typeof token !== "string") {
      return res.status(400).send(resultPage("Link not valid", "This verification link isn't complete. Open the Reems Rude Reminders app and tap <b>Resend Email</b> to get a new one.", false));
    }
    try {
      const user = await storage.getUserByVerificationToken(token);
      if (!user) {
        return res.status(400).send(resultPage("Link already used", "This link has already been used or replaced by a newer one. If you've verified already, just go back to the Reems Rude Reminders app and log in.", false));
      }
      if (isVerificationTokenExpired(token)) {
        return res.status(400).send(resultPage("Link expired", "Verification links last 24 hours. Open the Reems Rude Reminders app, try to log in, and tap <b>Resend Email</b> for a fresh one.", false));
      }
      await storage.updateUser(user.id, { emailVerified: true, emailVerificationToken: null });
      return res.send(resultPage("You're verified!", "Your account is ready. Go back to the <b>Reems Rude Reminders</b> app and log in — Reem's been waiting.", true));
    } catch (err) {
      console.error("Email verification error:", err);
      return res.status(500).send(resultPage("Something went wrong", "We couldn't verify you just now. Please try the link again in a minute.", false));
    }
  });

  // Resend verification email
  app.post("/api/auth/resend-verification", async (req, res) => {
    const { email } = req.body;
    if (!email || typeof email !== "string") return res.status(400).json({ message: "Email is required" });
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const blocked = resendBlockedReason(normalizedEmail, String(req.ip || "unknown"));
      if (blocked) return res.status(429).json({ message: blocked });

      const user = await storage.getUserByEmail(normalizedEmail);
      if (!user) return res.json({ success: true }); // don't reveal whether an account exists
      if (user.emailVerified) {
        return res.json({ success: true, already_verified: true, message: "You're already verified — go ahead and log in." });
      }

      const newToken = generateVerificationToken(); // old links stop working
      await storage.updateUser(user.id, { emailVerificationToken: newToken });
      const sent = await sendVerificationEmail(normalizedEmail, newToken);
      if (!sent) {
        return res.status(502).json({ message: "We couldn't send the email right now. Please try again shortly or contact support." });
      }
      return res.json({ success: true, message: "Verification email sent" });
    } catch (err) {
      console.error("Resend verification error:", err);
      return res.status(500).json({ message: "Failed to resend verification email" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Authentication error" });
      }
      if (!user) {
        // Special case: email not verified
        if (info?.message === "EMAIL_NOT_VERIFIED") {
          slog.warn("auth_failure", { provider: "email", reason: "email_not_verified" });
          return res.status(403).json({
            message: "Please check your email and click the verification link to continue",
            error_code: "email_not_verified",
            email: req.body.email,
          });
        }
        slog.warn("auth_failure", {
          provider: "email",
          reason: info?.message || "invalid_credentials",
        });
        return res
          .status(401)
          .json({ message: info?.message || "Invalid credentials" });
      }

      req.logIn(user, async (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed" });
        }

        // The user object from passport has claims.sub structure
        const userId = user.claims?.sub;

        if (!userId) {
          console.error("Login failed: user.claims.sub is missing", user);
          return res
            .status(500)
            .json({ message: "Login failed - user ID not found" });
        }

        // Fetch full user data from database to get subscription info
        const fullUser = await storage.getUser(userId);
        const userEmail = fullUser?.email || user.claims?.email;

        // Check if user is in premium whitelist
        let isWhitelisted = false;
        if (userEmail) {
          try {
            isWhitelisted = await storage.isEmailWhitelisted(userEmail);
          } catch (e) {
            console.error("Whitelist check failed:", e);
          }
        }

        // Premium is true if: (active subscription with premium plan) OR whitelisted
        const dbPremium =
          fullUser?.subscriptionStatus === "active" &&
          fullUser?.subscriptionPlan === "premium";
        const isPremium = dbPremium || isWhitelisted;

        // Generate auth token for mobile apps
        const authToken = await createAuthToken(userId);

        slog.info("auth_success", { provider: "email", userId });

        res.json({
          success: true,
          message: "Logged in successfully",
          authToken,
          user: {
            id: userId,
            email: userEmail,
            firstName: fullUser?.firstName || user.claims?.first_name,
            lastName: fullUser?.lastName || user.claims?.last_name,
            subscriptionStatus: isPremium
              ? "active"
              : fullUser?.subscriptionStatus || "free",
            subscriptionPlan: isPremium
              ? "premium"
              : fullUser?.subscriptionPlan || "free",
            isPremium: isPremium,
          },
        });
      });
    })(req, res, next);
  });

  // Apple Sign-In Authentication Route
  app.post("/api/auth/apple", async (req, res) => {
    try {
      const {
        identityToken,
        email,
        givenName,
        familyName,
        user: appleUserId,
      } = req.body;

      if (!identityToken) {
        return res.status(400).json({ message: "Identity token is required" });
      }

      // SECURITY: Verify the identity token with Apple's public keys
      const { verifyAppleToken, validateAppleTokenAudience } = await import(
        "./appleAuth"
      );

      let verifiedPayload;
      try {
        verifiedPayload = await verifyAppleToken(identityToken);
      } catch (verificationError: any) {
        console.error("❌ Apple token verification failed:", verificationError);
        return res.status(401).json({ message: "Invalid Apple ID token" });
      }

      // Validate audience matches our bundle ID (for native iOS)
      // NOTE: This must match the actual iOS bundle identifier in Xcode
      // (ios/App/App.xcodeproj/project.pbxproj → PRODUCT_BUNDLE_IDENTIFIER),
      // NOT the Capacitor appId. Apple signs the identityToken with the
      // device's real bundle ID regardless of what we pass as clientId.
      const expectedBundleId = "com.goosebumpsmw.rudereminders";
      if (!validateAppleTokenAudience(verifiedPayload, expectedBundleId)) {
        console.error(
          "❌ Token audience mismatch. Expected:",
          expectedBundleId,
          "Got:",
          verifiedPayload.aud,
        );
        return res.status(401).json({ message: "Token audience mismatch" });
      }

      // Use the verified subject (Apple user ID) from the token
      const appleUserIdVerified = verifiedPayload.sub;
      console.log("🍎 Apple Sign-In attempt (verified):", {
        appleUserId: appleUserIdVerified,
        email: verifiedPayload.email || email,
        givenName,
        familyName,
      });

      // Create unique user ID for Apple users
      // Only trust the email inside Apple's signed token (not one sent by the app).
      // Apple emails — including "Hide My Email" relay addresses — are verified by Apple.
      const existingUser = await findOrCreateSocialUser({
        provider: "apple",
        providerUserId: appleUserIdVerified,
        email: verifiedPayload.email || null,
        emailVerified: !!verifiedPayload.email,
        firstName: givenName || null,
        lastName: familyName || null,
      });
      const userId = existingUser.id;

      // Create session
      const userSession = {
        claims: {
          sub: userId,
          email: existingUser.email,
          first_name: existingUser?.firstName || givenName,
          last_name: existingUser?.lastName || familyName,
          profile_image_url: "",
          exp: Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60, // 2 weeks
        },
        access_token: "apple-auth",
        refresh_token: "apple-auth",
        expires_at: Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60,
      };

      req.logIn(userSession, async (err) => {
        if (err) {
          console.error("Login session error:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }

        slog.info("auth_success", { provider: "apple", userId });
        try {
          const authToken = await createAuthToken(userId);
          res.json({
            success: true,
            message: "Signed in with Apple successfully",
            authToken,
          });
        } catch (tokenErr) {
          console.error("Failed to create auth token for Apple user:", tokenErr);
          res.status(500).json({ message: "Failed to create auth token" });
        }
      });
    } catch (error: any) {
      slog.error("auth_failure", {
        provider: "apple",
        reason: error?.message || "unknown",
      });
      res
        .status(500)
        .json({ message: error.message || "Failed to sign in with Apple" });
    }
  });

  // Google OAuth Routes
  // NOTE: Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables
  app.get("/api/auth/google", async (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/google/callback`;

    if (!clientId) {
      console.warn("⚠️ Google OAuth not configured: GOOGLE_CLIENT_ID missing");
      return res.status(503).json({
        message:
          "Google Sign-In is not yet configured. Please set up Google OAuth credentials.",
      });
    }

    // Generate CSRF protection state parameter
    const crypto = await import("crypto");
    const state = crypto.randomBytes(32).toString("hex");

    // Store state in session for verification on callback
    (req.session as any).oauthState = state;
    (req.session as any).oauthProvider = "google";

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("prompt", "select_account"); // choose account, no repeat consent screen
    authUrl.searchParams.set("state", state);

    res.redirect(authUrl.toString());
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    try {
      const { code, error, state } = req.query;

      if (error) {
        console.log("Google OAuth cancelled or denied:", error);
        return res.redirect("/login?error=cancelled");
      }

      // SECURITY: Verify CSRF state parameter
      const storedState = (req.session as any).oauthState;
      const storedProvider = (req.session as any).oauthProvider;

      if (!state || state !== storedState || storedProvider !== "google") {
        slog.error("auth_failure", { provider: "google", reason: "state_mismatch" });
        return res.redirect("/login?error=state_mismatch");
      }

      // Clear stored state after verification
      delete (req.session as any).oauthState;
      delete (req.session as any).oauthProvider;

      if (!code || typeof code !== "string") {
        return res.redirect("/login?error=no_code");
      }

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/google/callback`;

      if (!clientId || !clientSecret) {
        return res.redirect("/login?error=not_configured");
      }

      // Exchange code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokens = (await tokenResponse.json()) as any;

      if (!tokens.id_token) {
        slog.error("auth_failure", { provider: "google", reason: "no_id_token" });
        return res.redirect("/login?error=token_failed");
      }

      // Verify and decode the ID token
      const { OAuth2Client } = await import("google-auth-library");
      const oauthClient = new OAuth2Client(clientId);

      const ticket = await oauthClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: clientId,
      });

      const payload = ticket.getPayload();

      if (!payload || !payload.sub) {
        return res.redirect("/login?error=invalid_token");
      }

      console.log("🔵 Google Sign-In verified:", {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
      });

      // Create/update user
      const existingUser = await findOrCreateSocialUser({
        provider: "google",
        providerUserId: String(payload.sub),
        email: payload.email,
        emailVerified: payload.email_verified === true,
        firstName: payload.given_name,
        lastName: payload.family_name,
        picture: payload.picture,
      });
      const userId = existingUser.id;

      // Create session
      const userSession = {
        claims: {
          sub: userId,
          email: existingUser?.email || payload.email,
          first_name: existingUser?.firstName || payload.given_name,
          last_name: existingUser?.lastName || payload.family_name,
          profile_image_url: payload.picture || "",
          exp: Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60,
        },
        access_token: "google-auth",
        refresh_token: "google-auth",
        expires_at: Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60,
      };

      req.logIn(userSession, (err) => {
        if (err) {
          console.error("Google login session error:", err);
          return res.redirect("/login?error=session_failed");
        }
        slog.info("auth_success", { provider: "google" });
        res.redirect("/");
      });
    } catch (error: any) {
      slog.error("auth_failure", {
        provider: "google",
        reason: error?.message || "unknown",
      });
      res.redirect("/login?error=failed");
    }
  });

  // Facebook OAuth Routes
  // NOTE: Requires FACEBOOK_APP_ID and FACEBOOK_APP_SECRET environment variables
  app.get("/api/auth/facebook", async (req, res) => {
    const appId = process.env.FACEBOOK_APP_ID;
    const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/facebook/callback`;

    if (!appId) {
      console.warn("⚠️ Facebook OAuth not configured: FACEBOOK_APP_ID missing");
      return res.status(503).json({
        message:
          "Facebook Sign-In is not yet configured. Please set up Facebook OAuth credentials.",
      });
    }

    // Generate CSRF protection state parameter
    const crypto = await import("crypto");
    const state = crypto.randomBytes(32).toString("hex");

    // Store state in session for verification on callback
    (req.session as any).oauthState = state;
    (req.session as any).oauthProvider = "facebook";

    const authUrl = new URL("https://www.facebook.com/v18.0/dialog/oauth");
    authUrl.searchParams.set("client_id", appId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", "email,public_profile");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("state", state);

    res.redirect(authUrl.toString());
  });

  app.get("/api/auth/facebook/callback", async (req, res) => {
    try {
      const { code, error, state } = req.query;

      if (error) {
        console.log("Facebook OAuth cancelled or denied:", error);
        return res.redirect("/login?error=cancelled");
      }

      // SECURITY: Verify CSRF state parameter
      const storedState = (req.session as any).oauthState;
      const storedProvider = (req.session as any).oauthProvider;

      if (!state || state !== storedState || storedProvider !== "facebook") {
        console.error(
          "❌ Facebook OAuth state mismatch - possible CSRF attack",
        );
        return res.redirect("/login?error=state_mismatch");
      }

      // Clear stored state after verification
      delete (req.session as any).oauthState;
      delete (req.session as any).oauthProvider;

      if (!code || typeof code !== "string") {
        return res.redirect("/login?error=no_code");
      }

      const appId = process.env.FACEBOOK_APP_ID;
      const appSecret = process.env.FACEBOOK_APP_SECRET;
      const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/facebook/callback`;

      if (!appId || !appSecret) {
        return res.redirect("/login?error=not_configured");
      }

      // Exchange code for access token
      const tokenUrl = new URL(
        "https://graph.facebook.com/v18.0/oauth/access_token",
      );
      tokenUrl.searchParams.set("client_id", appId);
      tokenUrl.searchParams.set("client_secret", appSecret);
      tokenUrl.searchParams.set("redirect_uri", redirectUri);
      tokenUrl.searchParams.set("code", code);

      const tokenResponse = await fetch(tokenUrl.toString());
      const tokens = (await tokenResponse.json()) as any;

      if (!tokens.access_token) {
        console.error("Facebook OAuth failed: No access token returned");
        return res.redirect("/login?error=token_failed");
      }

      // Get user info from Facebook
      const userInfoUrl = new URL("https://graph.facebook.com/me");
      userInfoUrl.searchParams.set(
        "fields",
        "id,email,first_name,last_name,picture.type(large)",
      );
      userInfoUrl.searchParams.set("access_token", tokens.access_token);

      const userResponse = await fetch(userInfoUrl.toString());
      const userData = (await userResponse.json()) as any;

      if (!userData.id) {
        return res.redirect("/login?error=user_fetch_failed");
      }

      console.log("🔵 Facebook Sign-In verified:", {
        id: userData.id,
        email: userData.email,
        name: `${userData.first_name} ${userData.last_name}`,
      });

      // Create/update user
      const existingUser = await findOrCreateSocialUser({
        provider: "facebook",
        providerUserId: String(userData.id),
        email: userData.email,
        emailVerified: !!userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name,
        picture: userData.picture?.data?.url,
      });
      const userId = existingUser.id;

      // Create session
      const userSession = {
        claims: {
          sub: userId,
          email: existingUser?.email || userData.email,
          first_name: existingUser?.firstName || userData.first_name,
          last_name: existingUser?.lastName || userData.last_name,
          profile_image_url: userData.picture?.data?.url || "",
          exp: Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60,
        },
        access_token: "facebook-auth",
        refresh_token: "facebook-auth",
        expires_at: Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60,
      };

      req.logIn(userSession, (err) => {
        if (err) {
          console.error("Facebook login session error:", err);
          return res.redirect("/login?error=session_failed");
        }
        slog.info("auth_success", { provider: "facebook" });
        res.redirect("/");
      });
    } catch (error: any) {
      slog.error("auth_failure", {
        provider: "facebook",
        reason: error?.message || "unknown",
      });
      res.redirect("/login?error=failed");
    }
  });

  // Native iOS Google OAuth - Uses in-app browser with custom URL scheme callback
  app.get("/api/auth/google/native", async (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const nativeCallback = safeNativeCallback(req.query.callback);
    const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/google/native/callback`;

    if (!clientId) {
      if (nativeCallback) {
        return res.redirect(
          `${nativeCallback}?success=false&error=not_configured`,
        );
      }
      return res.status(503).json({ message: "Google Sign-In not configured" });
    }

    const crypto = await import("crypto");
    const state = crypto.randomBytes(32).toString("hex");

    (req.session as any).oauthState = state;
    (req.session as any).oauthProvider = "google-native";
    (req.session as any).nativeCallback = nativeCallback;

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("prompt", "select_account"); // choose account, no repeat consent screen
    authUrl.searchParams.set("state", state);

    res.redirect(authUrl.toString());
  });

  app.get("/api/auth/google/native/callback", async (req, res) => {
    const nativeCallback =
      safeNativeCallback((req.session as any).nativeCallback);

    try {
      const { code, error, state } = req.query;

      if (error) {
        return res.redirect(`${nativeCallback}?success=false&error=cancelled`);
      }

      const storedState = (req.session as any).oauthState;
      const storedProvider = (req.session as any).oauthProvider;

      if (
        !state ||
        state !== storedState ||
        storedProvider !== "google-native"
      ) {
        return res.redirect(
          `${nativeCallback}?success=false&error=state_mismatch`,
        );
      }

      delete (req.session as any).oauthState;
      delete (req.session as any).oauthProvider;
      delete (req.session as any).nativeCallback;

      if (!code || typeof code !== "string") {
        return res.redirect(`${nativeCallback}?success=false&error=no_code`);
      }

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/google/native/callback`;

      if (!clientId || !clientSecret) {
        return res.redirect(
          `${nativeCallback}?success=false&error=not_configured`,
        );
      }

      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokens = (await tokenResponse.json()) as any;

      if (!tokens.id_token) {
        console.error("❌ Google token exchange failed:", JSON.stringify(tokens), "redirect_uri sent:", redirectUri);
        return res.redirect(
          `${nativeCallback}?success=false&error=token_failed`,
        );
      }

      const { OAuth2Client } = await import("google-auth-library");
      const oauthClient = new OAuth2Client(clientId);

      const ticket = await oauthClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: clientId,
      });

      const payload = ticket.getPayload();

      if (!payload || !payload.sub) {
        return res.redirect(
          `${nativeCallback}?success=false&error=invalid_token`,
        );
      }

      const existingUser = await findOrCreateSocialUser({
        provider: "google",
        providerUserId: String(payload.sub),
        email: payload.email,
        emailVerified: payload.email_verified === true,
        firstName: payload.given_name,
        lastName: payload.family_name,
        picture: payload.picture,
      });
      const userId = existingUser.id;

      const userSession = {
        claims: {
          sub: userId,
          email: existingUser?.email || payload.email,
          first_name: existingUser?.firstName || payload.given_name,
          last_name: existingUser?.lastName || payload.family_name,
          profile_image_url: payload.picture || "",
          exp: Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60,
        },
        access_token: "google-auth",
        refresh_token: "google-auth",
        expires_at: Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60,
      };

      req.logIn(userSession, async (err) => {
        if (err) {
          return res.redirect(
            `${nativeCallback}?success=false&error=session_failed`,
          );
        }
        slog.info("auth_success", { provider: "google_native", userId });
        try {
          const authToken = await createAuthToken(userId);
          res.redirect(`${nativeCallback}?success=true&token=${encodeURIComponent(authToken)}`);
        } catch (tokenErr) {
          console.error("Failed to create auth token for Google user:", tokenErr);
          res.redirect(`${nativeCallback}?success=false&error=token_failed`);
        }
      });
    } catch (error: any) {
      slog.error("auth_failure", {
        provider: "google_native",
        reason: error?.message || "unknown",
      });
      res.redirect(`${nativeCallback}?success=false&error=failed`);
    }
  });

  // Native iOS Facebook OAuth - Uses in-app browser with custom URL scheme callback
  app.get("/api/auth/facebook/native", async (req, res) => {
    const appId = process.env.FACEBOOK_APP_ID;
    const nativeCallback = safeNativeCallback(req.query.callback);
    const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/facebook/native/callback`;

    if (!appId) {
      if (nativeCallback) {
        return res.redirect(
          `${nativeCallback}?success=false&error=not_configured`,
        );
      }
      return res
        .status(503)
        .json({ message: "Facebook Sign-In not configured" });
    }

    const crypto = await import("crypto");
    const state = crypto.randomBytes(32).toString("hex");

    (req.session as any).oauthState = state;
    (req.session as any).oauthProvider = "facebook-native";
    (req.session as any).nativeCallback = nativeCallback;

    const authUrl = new URL("https://www.facebook.com/v18.0/dialog/oauth");
    authUrl.searchParams.set("client_id", appId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", "email,public_profile");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("state", state);

    res.redirect(authUrl.toString());
  });

  app.get("/api/auth/facebook/native/callback", async (req, res) => {
    const nativeCallback =
      safeNativeCallback((req.session as any).nativeCallback);

    try {
      const { code, error, state } = req.query;

      if (error) {
        return res.redirect(`${nativeCallback}?success=false&error=cancelled`);
      }

      const storedState = (req.session as any).oauthState;
      const storedProvider = (req.session as any).oauthProvider;

      if (
        !state ||
        state !== storedState ||
        storedProvider !== "facebook-native"
      ) {
        return res.redirect(
          `${nativeCallback}?success=false&error=state_mismatch`,
        );
      }

      delete (req.session as any).oauthState;
      delete (req.session as any).oauthProvider;
      delete (req.session as any).nativeCallback;

      if (!code || typeof code !== "string") {
        return res.redirect(`${nativeCallback}?success=false&error=no_code`);
      }

      const appId = process.env.FACEBOOK_APP_ID;
      const appSecret = process.env.FACEBOOK_APP_SECRET;
      const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/facebook/native/callback`;

      if (!appId || !appSecret) {
        return res.redirect(
          `${nativeCallback}?success=false&error=not_configured`,
        );
      }

      const tokenUrl = new URL(
        "https://graph.facebook.com/v18.0/oauth/access_token",
      );
      tokenUrl.searchParams.set("client_id", appId);
      tokenUrl.searchParams.set("client_secret", appSecret);
      tokenUrl.searchParams.set("redirect_uri", redirectUri);
      tokenUrl.searchParams.set("code", code);

      const tokenResponse = await fetch(tokenUrl.toString());
      const tokens = (await tokenResponse.json()) as any;

      if (!tokens.access_token) {
        console.error("❌ Facebook token exchange failed:", JSON.stringify(tokens), "redirect_uri sent:", redirectUri);
        return res.redirect(
          `${nativeCallback}?success=false&error=token_failed`,
        );
      }

      const userInfoUrl = new URL("https://graph.facebook.com/me");
      userInfoUrl.searchParams.set(
        "fields",
        "id,email,first_name,last_name,picture.type(large)",
      );
      userInfoUrl.searchParams.set("access_token", tokens.access_token);

      const userResponse = await fetch(userInfoUrl.toString());
      const userData = (await userResponse.json()) as any;

      if (!userData.id) {
        return res.redirect(
          `${nativeCallback}?success=false&error=user_fetch_failed`,
        );
      }

      const existingUser = await findOrCreateSocialUser({
        provider: "facebook",
        providerUserId: String(userData.id),
        email: userData.email,
        emailVerified: !!userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name,
        picture: userData.picture?.data?.url,
      });
      const userId = existingUser.id;

      const userSession = {
        claims: {
          sub: userId,
          email: existingUser?.email || userData.email,
          first_name: existingUser?.firstName || userData.first_name,
          last_name: existingUser?.lastName || userData.last_name,
          profile_image_url: userData.picture?.data?.url || "",
          exp: Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60,
        },
        access_token: "facebook-auth",
        refresh_token: "facebook-auth",
        expires_at: Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60,
      };

      req.logIn(userSession, async (err) => {
        if (err) {
          return res.redirect(
            `${nativeCallback}?success=false&error=session_failed`,
          );
        }
        slog.info("auth_success", { provider: "facebook_native", userId });
        try {
          const authToken = await createAuthToken(userId);
          res.redirect(`${nativeCallback}?success=true&token=${encodeURIComponent(authToken)}`);
        } catch (tokenErr) {
          console.error("Failed to create auth token for Facebook user:", tokenErr);
          res.redirect(`${nativeCallback}?success=false&error=token_failed`);
        }
      });
    } catch (error: any) {
      slog.error("auth_failure", {
        provider: "facebook_native",
        reason: error?.message || "unknown",
      });
      res.redirect(`${nativeCallback}?success=false&error=failed`);
    }
  });

  // GET /api/logout - ALWAYS returns JSON, NEVER redirects (mobile-safe)
  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      // Destroy session
      if (req.session) {
        req.session.destroy(() => {});
      }
      // Always return JSON - never redirect (prevents Safari opening on mobile)
      return res.json({ success: true, message: "Logged out successfully" });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Check for Bearer token auth first (for mobile apps)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    // Validate token against auth_tokens table
    const tokenRecord = await db.query.authTokens.findFirst({
      where: (authTokens, { eq, and, gt }) => and(
        eq(authTokens.token, token),
        gt(authTokens.expiresAt, new Date())
      ),
    });
    
    if (tokenRecord) {
      // Token is valid - set req.user with claims for compatibility
      const user = await storage.getUser(tokenRecord.userId);
      (req as any).tokenUserId = tokenRecord.userId;
      (req as any).authToken = token;
      
      // Create a user object compatible with session-based auth
      req.user = {
        claims: {
          sub: tokenRecord.userId,
          email: user?.email || '',
          first_name: user?.firstName || '',
          last_name: user?.lastName || '',
          profile_image_url: user?.profileImageUrl || '',
          exp: Math.floor(tokenRecord.expiresAt.getTime() / 1000),
        },
        access_token: 'token-auth',
        refresh_token: null,
        expires_at: Math.floor(tokenRecord.expiresAt.getTime() / 1000),
      } as any;
      
      return next();
    }
    // Invalid token - fall through to 401
    return res.status(401).json({ message: "Unauthorized - invalid token" });
  }

  // Session-based authentication flow
  const user = req.user as any;

  if (!req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  // Session has expired — the app signs in again
  return res.status(401).json({ message: "Unauthorized" });
};
