import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  // Try to use PostgreSQL sessions, fallback to memory for development
  let sessionStore;
  try {
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('ep-empty-queen-a24ac3h3.eu-central-1.aws.neon.tech')) {
      const pgStore = connectPg(session);
      sessionStore = new pgStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
        ttl: sessionTtl / 1000,
        tableName: "sessions",
      });
      console.log('✅ Using PostgreSQL session store');
    } else {
      throw new Error('Database not available or disabled');
    }
  } catch (error) {
    console.warn('⚠️  Using memory session store (sessions will not persist across restarts)');
    // Use default memory store
    sessionStore = undefined; // Express will use default memory store
  }
  
  return session({
    secret: process.env.SESSION_SECRET || 'default-development-secret',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
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
  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  }, async (email, password, done) => {
    try {
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      if (!user.passwordHash) {
        return done(null, false, { message: 'Please use social login for this account' });
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      // Create session-compatible user object
      const sessionUser = {
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          profile_image_url: user.profileImageUrl,
          exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 1 week
        },
        access_token: "local-auth",
        refresh_token: null,
        expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
      };

      return done(null, sessionUser);
    } catch (error) {
      return done(error);
    }
  }));

  // Replit Auth setup (existing code)
  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
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
    const domain = (req.hostname === 'localhost' || req.hostname === '127.0.0.1') ? 
      process.env.REPLIT_DOMAINS!.split(",")[0] : req.hostname;
    
    console.log(`Login attempt: hostname=${req.hostname}, using domain=${domain}`);
    passport.authenticate(`replitauth:${domain}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    // Handle localhost development and different hostname scenarios
    const domain = (req.hostname === 'localhost' || req.hostname === '127.0.0.1') ? 
      process.env.REPLIT_DOMAINS!.split(",")[0] : req.hostname;
    
    console.log(`Callback attempt: hostname=${req.hostname}, using domain=${domain}`);
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
        return res.status(400).json({ message: "Email and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const newUser = await storage.upsertUser({
        id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        profileImageUrl: null,
        passwordHash
      });

      res.json({ success: true, message: "Account created successfully" });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Authentication error" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }

      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed" });
        }
        res.json({ success: true, message: "Logged in successfully" });
      });
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    const user = req.user as any;
    
    req.logout(() => {
      // If it's a Replit user, redirect to Replit logout
      if (user && user.access_token !== "local-auth") {
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
          }).href
        );
      } else {
        // For local auth users, just redirect to home
        res.redirect("/");
      }
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Development mode bypass
  if (process.env.NODE_ENV === 'development') {
    // Create a mock user for development
    if (!req.user) {
      req.user = {
        claims: {
          sub: "dev-user-001",
          email: "developer@example.com",
          first_name: "Developer",
          last_name: "User",
          profile_image_url: "",
          exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
        },
        access_token: "dev-token",
        refresh_token: "dev-refresh-token",
        expires_at: Math.floor(Date.now() / 1000) + 3600
      };
      
      // Ensure the dev user exists in storage
      try {
        await storage.upsertUser({
          id: "dev-user-001",
          email: "developer@example.com",
          firstName: "Developer",
          lastName: "User",
          profileImageUrl: ""
        });
      } catch (error) {
        console.error("Error creating dev user:", error);
      }
    }
    return next();
  }

  // Production authentication flow
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
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
