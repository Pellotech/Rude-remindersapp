import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
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

    const domain = process.env.REPLIT_DOMAINS?.split(",")[0] || "rude-reminders.replit.app";
    const verifyUrl = `https://${domain}/api/auth/verify-email?token=${token}`;

    const logoUrl = `https://${domain}/logo.png`;

    await transporter.sendMail({
      from: `"Rude Reminders" <${process.env.EMAIL_USER || "ruderemindersinfo@gmail.com"}>`,
      to: toEmail,
      subject: "Verify your Rude Reminders account",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;text-align:center;">
          <img src="${logoUrl}" alt="Rude Reminders" style="width:120px;height:auto;margin-bottom:24px;" />
          <h2 style="color:#1B2A5E;margin-top:0;">Welcome to Rude Reminders!</h2>
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
    console.error("Failed to send verification email:", err);
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

    const domain = process.env.REPLIT_DOMAINS?.split(",")[0] || "rude-reminders.replit.app";
    const resetUrl = `https://${domain}/reset-password?token=${token}`;
    const logoUrl = `https://${domain}/logo.png`;

    await transporter.sendMail({
      from: `"Rude Reminders" <${process.env.EMAIL_USER || "ruderemindersinfo@gmail.com"}>`,
      to: toEmail,
      subject: "Reset your Rude Reminders password",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;text-align:center;">
          <img src="${logoUrl}" alt="Rude Reminders" style="width:120px;height:auto;margin-bottom:24px;" />
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

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!,
    );
  },
  { maxAge: 3600 * 1000 },
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week

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

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
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
              exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 1 week
            },
            access_token: "local-auth",
            refresh_token: null,
            expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
          };

          return done(null, sessionUser);
        } catch (error) {
          return done(error);
        }
      },
    ),
  );

  // Replit Auth setup (existing code)
  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback,
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env.REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
    console.log(`Registered auth strategy: replitauth:${domain}`);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    // Handle localhost development and different hostname scenarios
    const domain =
      req.hostname === "localhost" || req.hostname === "127.0.0.1"
        ? process.env.REPLIT_DOMAINS!.split(",")[0]
        : req.hostname;

    console.log(
      `Login attempt: hostname=${req.hostname}, using domain=${domain}`,
    );
    passport.authenticate(`replitauth:${domain}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    // Handle localhost development and different hostname scenarios
    const domain =
      req.hostname === "localhost" || req.hostname === "127.0.0.1"
        ? process.env.REPLIT_DOMAINS!.split(",")[0]
        : req.hostname;

    console.log(
      `Callback attempt: hostname=${req.hostname}, using domain=${domain}`,
    );
    passport.authenticate(`replitauth:${domain}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  // Email/Password Authentication Routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email and password are required" });
      }

      if (password.length < 6) {
        return res
          .status(400)
          .json({ message: "Password must be at least 6 characters" });
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
      const verificationToken = skipVerification ? null : generateSecureToken();

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
        // Send verification email (non-blocking — failure doesn't stop account creation)
        sendVerificationEmail(normalizedEmail, verificationToken!);

        return res.json({
          success: true,
          verification_required: true,
          message: "Account created! Please check your email to verify your account before logging in.",
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
      return res.status(400).send("Invalid verification link.");
    }
    try {
      const user = await storage.getUserByVerificationToken(token);
      if (!user) {
        return res.status(400).send(`
          <html><body style="font-family:sans-serif;text-align:center;padding:60px;">
            <h2>Link Invalid or Expired</h2>
            <p>This verification link is invalid or has already been used.</p>
            <a href="/">Go to App</a>
          </body></html>
        `);
      }
      // Mark as verified and clear token
      await storage.updateUser(user.id, { emailVerified: true, emailVerificationToken: null });
      return res.send(`
        <html><body style="font-family:sans-serif;text-align:center;padding:60px;">
          <h2 style="color:#1B2A5E;">Email Verified!</h2>
          <p>Your account is now active. You can log in now.</p>
          <a href="/login" style="display:inline-block;background:#C53B3B;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px;">Log In</a>
        </body></html>
      `);
    } catch (err) {
      console.error("Email verification error:", err);
      return res.status(500).send("Verification failed. Please try again.");
    }
  });

  // Resend verification email
  app.post("/api/auth/resend-verification", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const user = await storage.getUserByEmail(normalizedEmail);
      if (!user) return res.json({ success: true }); // don't leak whether user exists

      if (user.emailVerified) {
        return res.json({ success: true, message: "Already verified" });
      }

      // Generate a fresh token
      const newToken = generateSecureToken();
      await storage.updateUser(user.id, { emailVerificationToken: newToken });
      sendVerificationEmail(normalizedEmail, newToken);

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
          return res.status(403).json({
            message: "Please check your email and click the verification link to continue",
            error_code: "email_not_verified",
            email: req.body.email,
          });
        }
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
        "./services/appleAuthService"
      );

      let verifiedPayload;
      try {
        verifiedPayload = await verifyAppleToken(identityToken);
      } catch (verificationError: any) {
        console.error("❌ Apple token verification failed:", verificationError);
        return res.status(401).json({ message: "Invalid Apple ID token" });
      }

      // Validate audience matches our bundle ID (for native iOS)
      const expectedBundleId = "com.rudereminders.app";
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
      const userId = `apple_${appleUserIdVerified}`;

      // Check if user already exists
      let existingUser = await storage.getUser(userId);

      if (existingUser) {
        // User exists, log them in
        console.log("✅ Existing Apple user found, logging in");
      } else {
        // New user, create account
        console.log("🆕 New Apple user, creating account");

        // PRIVACY: Apple may not provide email on subsequent logins if user chose "Hide My Email"
        // We only store the email if Apple provides it (from token or user info)
        // Do NOT fabricate email addresses
        const userEmail = verifiedPayload.email || email || null;

        if (!userEmail) {
          console.warn(
            "⚠️ No email provided by Apple (user may have chosen Hide My Email)",
          );
        }

        await storage.upsertUser({
          id: userId,
          email: userEmail || `apple_user_${appleUserIdVerified}@noemail.local`, // Temporary fallback for DB constraint
          firstName: givenName || null,
          lastName: familyName || null,
          profileImageUrl: null,
        });

        existingUser = await storage.getUser(userId);
      }

      // Create session
      const userSession = {
        claims: {
          sub: userId,
          email:
            existingUser?.email ||
            verifiedPayload.email ||
            email ||
            `apple_user_${appleUserIdVerified}@noemail.local`,
          first_name: existingUser?.firstName || givenName,
          last_name: existingUser?.lastName || familyName,
          profile_image_url: "",
          exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 1 week
        },
        access_token: "apple-auth",
        refresh_token: "apple-auth",
        expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
      };

      req.logIn(userSession, (err) => {
        if (err) {
          console.error("Login session error:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }

        console.log("✅ Apple Sign-In successful");
        res.json({
          success: true,
          message: "Signed in with Apple successfully",
        });
      });
    } catch (error: any) {
      console.error("Apple Sign-In error:", error);
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
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
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
        console.error("❌ Google OAuth state mismatch - possible CSRF attack");
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
        console.error("Google OAuth failed: No ID token returned");
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
      const userId = `google_${payload.sub}`;
      let existingUser = await storage.getUser(userId);

      if (!existingUser) {
        console.log("🆕 New Google user, creating account");
        await storage.upsertUser({
          id: userId,
          email: payload.email || `google_user_${payload.sub}@noemail.local`,
          firstName: payload.given_name || null,
          lastName: payload.family_name || null,
          profileImageUrl: payload.picture || null,
        });
        existingUser = await storage.getUser(userId);
      }

      // Create session
      const userSession = {
        claims: {
          sub: userId,
          email: existingUser?.email || payload.email,
          first_name: existingUser?.firstName || payload.given_name,
          last_name: existingUser?.lastName || payload.family_name,
          profile_image_url: payload.picture || "",
          exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
        },
        access_token: "google-auth",
        refresh_token: "google-auth",
        expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
      };

      req.logIn(userSession, (err) => {
        if (err) {
          console.error("Google login session error:", err);
          return res.redirect("/login?error=session_failed");
        }
        console.log("✅ Google Sign-In successful");
        res.redirect("/");
      });
    } catch (error: any) {
      console.error("Google Sign-In error:", error);
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
      const userId = `facebook_${userData.id}`;
      let existingUser = await storage.getUser(userId);

      if (!existingUser) {
        console.log("🆕 New Facebook user, creating account");
        await storage.upsertUser({
          id: userId,
          email: userData.email || `fb_user_${userData.id}@noemail.local`,
          firstName: userData.first_name || null,
          lastName: userData.last_name || null,
          profileImageUrl: userData.picture?.data?.url || null,
        });
        existingUser = await storage.getUser(userId);
      }

      // Create session
      const userSession = {
        claims: {
          sub: userId,
          email: existingUser?.email || userData.email,
          first_name: existingUser?.firstName || userData.first_name,
          last_name: existingUser?.lastName || userData.last_name,
          profile_image_url: userData.picture?.data?.url || "",
          exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
        },
        access_token: "facebook-auth",
        refresh_token: "facebook-auth",
        expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
      };

      req.logIn(userSession, (err) => {
        if (err) {
          console.error("Facebook login session error:", err);
          return res.redirect("/login?error=session_failed");
        }
        console.log("✅ Facebook Sign-In successful");
        res.redirect("/");
      });
    } catch (error: any) {
      console.error("Facebook Sign-In error:", error);
      res.redirect("/login?error=failed");
    }
  });

  // Native iOS Google OAuth - Uses in-app browser with custom URL scheme callback
  app.get("/api/auth/google/native", async (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const nativeCallback = req.query.callback as string;
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
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("state", state);

    res.redirect(authUrl.toString());
  });

  app.get("/api/auth/google/native/callback", async (req, res) => {
    const nativeCallback =
      (req.session as any).nativeCallback || "rudereminders://auth-callback";

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

      const userId = `google_${payload.sub}`;
      let existingUser = await storage.getUser(userId);

      if (!existingUser) {
        await storage.upsertUser({
          id: userId,
          email: payload.email || `google_user_${payload.sub}@noemail.local`,
          firstName: payload.given_name || null,
          lastName: payload.family_name || null,
          profileImageUrl: payload.picture || null,
        });
        existingUser = await storage.getUser(userId);
      }

      const userSession = {
        claims: {
          sub: userId,
          email: existingUser?.email || payload.email,
          first_name: existingUser?.firstName || payload.given_name,
          last_name: existingUser?.lastName || payload.family_name,
          profile_image_url: payload.picture || "",
          exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
        },
        access_token: "google-auth",
        refresh_token: "google-auth",
        expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
      };

      req.logIn(userSession, (err) => {
        if (err) {
          return res.redirect(
            `${nativeCallback}?success=false&error=session_failed`,
          );
        }
        console.log("✅ Google Native Sign-In successful");
        res.redirect(`${nativeCallback}?success=true`);
      });
    } catch (error: any) {
      console.error("Google Native Sign-In error:", error);
      res.redirect(`${nativeCallback}?success=false&error=failed`);
    }
  });

  // Native iOS Facebook OAuth - Uses in-app browser with custom URL scheme callback
  app.get("/api/auth/facebook/native", async (req, res) => {
    const appId = process.env.FACEBOOK_APP_ID;
    const nativeCallback = req.query.callback as string;
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
      (req.session as any).nativeCallback || "rudereminders://auth-callback";

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

      const userId = `facebook_${userData.id}`;
      let existingUser = await storage.getUser(userId);

      if (!existingUser) {
        await storage.upsertUser({
          id: userId,
          email: userData.email || `fb_user_${userData.id}@noemail.local`,
          firstName: userData.first_name || null,
          lastName: userData.last_name || null,
          profileImageUrl: userData.picture?.data?.url || null,
        });
        existingUser = await storage.getUser(userId);
      }

      const userSession = {
        claims: {
          sub: userId,
          email: existingUser?.email || userData.email,
          first_name: existingUser?.firstName || userData.first_name,
          last_name: existingUser?.lastName || userData.last_name,
          profile_image_url: userData.picture?.data?.url || "",
          exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
        },
        access_token: "facebook-auth",
        refresh_token: "facebook-auth",
        expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
      };

      req.logIn(userSession, (err) => {
        if (err) {
          return res.redirect(
            `${nativeCallback}?success=false&error=session_failed`,
          );
        }
        console.log("✅ Facebook Native Sign-In successful");
        res.redirect(`${nativeCallback}?success=true`);
      });
    } catch (error: any) {
      console.error("Facebook Native Sign-In error:", error);
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
  // Development mode bypass
  if (process.env.NODE_ENV === "development") {
    // Create a mock user for development
    if (!req.user) {
      req.user = {
        claims: {
          sub: "dev-user-001",
          email: "developer@example.com",
          first_name: "Developer",
          last_name: "User",
          profile_image_url: "",
          exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        },
        access_token: "dev-token",
        refresh_token: "dev-refresh-token",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      };

      // Ensure the dev user exists in storage
      try {
        await storage.upsertUser({
          id: "dev-user-001",
          email: "developer@example.com",
          firstName: "Developer",
          lastName: "User",
          profileImageUrl: "",
        });
      } catch (error) {
        console.error("Error creating dev user:", error);
      }
    }
    return next();
  }

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

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
