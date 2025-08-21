import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

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

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
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
