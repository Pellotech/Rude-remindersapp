# Rude Daily Reminder App

## Overview
The Rude Daily Reminder App is a full-stack application that provides daily reminders with a humorous, "rude" twist, allowing users to customize the rudeness level. It aims to transform standard reminders into motivational notifications. The project, originally a web application, has been converted into native iOS and Android mobile apps using Capacitor, offering cross-platform synchronization and rich native mobile notifications. Key capabilities include photo/video attachments, historical motivational quotes, voice character selection, and an adjustable humor level via AI. The business vision is to deliver a unique, engaging, and motivating reminder experience.

All users must authenticate (Apple/Google/Facebook social or email/password) before accessing the app. Guest mode has been removed entirely. App Store reviewers use the whitelisted account `appstoreuser@rudereminders.com` (permanent premium via whitelist) instead of guest mode.

### Rudy Character System
- **RudyWidget** (`client/src/components/RudyWidget.tsx`): Interactive mascot widget replacing old slogan banners on both home pages. Shows Rudy image (64×64, `mix-blend-mode: multiply`) with animated speech bubble. Idle cycle rotates through 3 images every 12s (leaning_2 → sitting_floor → idle_smile). Slogans rotate every 8s.
- **RUDY_LINES**: Single source of truth for all Rudy speech. Every category has `rude[]` and `positive[]` sub-arrays. `getRudyLine(category)` picks 70% rude / 30% positive randomly.
- **RudyEventType**: Union type covering 20+ events (reminder_created, manage_did_it, manage_didnt_do_it, slider_1–5, date_today/tomorrow/future, voice, photo, quotes, analytics_*, manage_load, manage_overdue, streak).
- **taskTitle prop**: When user types 3+ chars in the reminder title field, Rudy reacts with a snarky/encouraging line about their specific task (800ms debounce). Clears when leaving Create tab.
- **Event wiring**: Slider changes → slider_1–5 events; tab changes → manage_load / analytics_this_week; RemindersList mutations → manage_did_it / manage_didnt_do_it; overdue detection → manage_overdue; analytics graph buttons → analytics events.
- **Rudy images** (all in `client/public/rudy/` as `_transparent.png`): idle_main_pose, walking, pushing, pushing_2, standing_angry, confident_arms_crossed, smirk_content, thumbs_up_smile, leaning, leaning_2, relaxing_leaning, idle_smile, content_smile, sitting_floor, sitting_bench, sitting_upright (16 total)

## User Preferences
Preferred communication style: Simple, everyday language.
UI/UX: Remove intro/landing page - direct authentication flow preferred.

## System Architecture
### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with Shadcn/ui
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Build Tool**: Vite
- **UI Components**: Radix UI primitives

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM
- **Database**: PostgreSQL (Neon Database)
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL store
- **Real-time Communication**: WebSocket support

### Key Design Decisions
- **Monorepo Structure**: `client/` (React), `server/` (Express.js), and `shared/` (TypeScript schemas/types).
- **Type Safety**: End-to-end type safety using TypeScript, Drizzle ORM, and Zod validation.
- **Component Architecture**: Utilizes Shadcn/ui components built on Radix UI.
- **Dynamic AI Responses**: Integration with DeepSeek AI for personalized, context-aware motivational messages with adjustable humor levels.
- **Subscription System**: Differentiates features for free and premium users, including AI-generated content.
  - **Monthly Reminder Limits**: Free users: 15/month, Premium users: 120/month. Tracked in `monthlyReminderUsage` JSON field on users table. Resets automatically on the 1st of each month. Limit check runs before creation for both single and multi-day reminders (`server/utils/premiumCheck.ts`).
  - **Automatic Expiration Handling**: Daily cleanup task (runs at 2 AM) automatically downgrades expired subscriptions to free tier
  - **Premium Whitelist**: Test accounts (testuserzzwai_@rudereminders.com, appstoreuser@rudereminders.com) always receive premium features
  - **Admin Access**: Only loqvm1@gmail.com has access to the admin panel to manage whitelist. Enforced both client-side (`client/src/pages/admin.tsx`) and server-side via the `isAdmin` middleware in `server/routes.ts` (constant `ADMIN_EMAIL`). All `/api/admin/*` routes require both `isAuthenticated` AND `isAdmin`.
  - **RevenueCat Webhooks**: Real-time subscription updates via webhooks for instant premium status changes
  - **Graceful Degradation**: Users retain login access and data when subscription expires; only premium features are restricted
- **Analytics Event Log**: A separate `reminder_events` table persists completion/missed history independently from reminders. Graph data survives reminder deletion. Events are written atomically when marking complete or missed. A one-time backfill at server startup migrates all existing completed/missed reminders to the event log (idempotent). The `/api/stats/completion-graph` endpoint reads exclusively from this table.
  - **App-managed unique index** on `(reminder_id, action)`: NOT declared in `shared/schema.ts` (drizzle would generate a CREATE UNIQUE INDEX migration that fails deploy validation against legacy duplicates). Instead, `dedupAndIndexReminderEvents()` in `server/index.ts` runs at every boot inside a `pg_advisory_lock`: deletes duplicates (only where `reminder_id IS NOT NULL` — NULL rows from deleted reminders are legitimate), then `CREATE UNIQUE INDEX IF NOT EXISTS` (production-only, throws on failure so deploy fails loud). Dev intentionally has no unique index so dev/prod schemas stay in parity for Replit's deploy validator.
- **Comprehensive User Personalization**: Allows gender and cultural background selection for tailored content.
- **Mobile-Native Architecture**: Full native iOS/Android support via Capacitor with AdMob integration, local notifications, and camera access.
  - **Photo Picker (iPad Air M3 / iPadOS 26.1+ Compatible)**: Production-ready photo capture and gallery selection optimized for iPad
    - **Gallery Selection**: Uses `@capawesome/capacitor-file-picker` which wraps native PHPicker on iOS/iPadOS (no crashes on iPad Air M3)
    - **Camera Capture**: Uses Capacitor Camera plugin with iPad-optimized configuration (popover presentation)
    - **File Upload**: Reads files and uploads to `/api/upload` endpoint with authentication
    - Backend stores files in `attached_assets/` directory using Multer (10MB limit)
    - Database stores file paths (URLs) not base64, keeping storage lean
    - Comprehensive MIME type detection: file.mimeType → blob.type → filename extension → fallback
    - Supports JPEG, PNG, HEIC/HEIF, WebP with proper extension mapping
    - Graceful error handling: user cancellations silent, permissions shown as alerts, generic errors with retry prompts
    - No debug logging in production
    - Tested for iPad multi-window environments and large photo handling
  - **Notification Attachments**: Photos are properly handled in iOS notifications
    - Server URLs are downloaded and converted to local file paths for iOS compatibility
    - Images saved to device Cache directory using Capacitor Filesystem
    - Base64 conversion ensures reliable file storage across device states
    - Console logs show attachment preparation progress (`📎 Preparing attachments...`, `✅ Prepared N local attachment(s)`)
  - **Quick Reminder Settings**: Inline quick-action buttons for rapid reminder creation
    - "+10s", "+5m", "+15m", "+30m" buttons create actual reminders saved to database
    - All buttons use current form data (message, context, rudeness, attachments, quotes)
    - Generates full AI "rude" message using current form settings
    - Includes photos, motivational quotes, and voice character preferences
    - Uses ISO format timestamps for precise second-level scheduling
    - Backend allows reminders as short as 5 seconds for testing
- **Forgot Password Flow**: Email-based password reset for email/password accounts
  - "Forgot Password?" link on login page (below password field, gold color)
  - `/forgot-password` page accepts email address, sends reset link via Gmail nodemailer
  - `/reset-password` page validates token, accepts new password (min 8 chars)
  - Token stored in `resetToken`/`resetTokenExpiry` columns on users table; expires after 1 hour
  - Anti-enumeration: always returns success message regardless of whether email exists
  - `POST /api/auth/forgot-password` and `POST /api/auth/reset-password` endpoints
- **Authentication**: Multi-provider authentication supporting Apple, Google, and Facebook sign-in
  - **Login Page Layout**: Social login buttons (Apple/Google/Facebook) positioned below email/password form per user preference
  - **Apple Sign-In** (iOS Native): Native iOS integration meeting App Store Guideline 4.8
    - Full JWT token verification using Apple's JWKS (public key validation, signature verification, claims validation)
    - Respects Apple's "Hide My Email" feature - only stores email if Apple provides it
    - Button only appears on native iOS (auto-detected via Capacitor)
    - Token audience matches app bundle ID (`com.rudereminders.app`)
    - Xcode Setup Required: Developer must add "Sign in with Apple" capability and register app ID in Apple Developer Portal
  - **Google Sign-In** (OAuth 2.0): App Store-compliant in-app browser OAuth flow
    - Requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` environment variables
    - Uses Google OAuth2 code flow with ID token verification via `google-auth-library`
    - **iOS Native**: Uses Capacitor Browser plugin (SFSafariViewController) - user never leaves app UI (Guideline 4.0 compliant)
    - **Web**: Uses standard redirect flow
    - Custom URL scheme `rudereminders://` for native callback handling
    - State parameter validation prevents CSRF attacks
    - Native callback: `/api/auth/google/native/callback` → `rudereminders://auth-callback`
  - **Facebook Sign-In** (OAuth 2.0): App Store-compliant in-app browser OAuth flow
    - Requires `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET` environment variables
    - Uses Facebook Graph API v18.0 for user profile retrieval
    - **iOS Native**: Uses Capacitor Browser plugin (SFSafariViewController) - user never leaves app UI (Guideline 4.0 compliant)
    - **Web**: Uses standard redirect flow
    - Custom URL scheme `rudereminders://` for native callback handling
    - State parameter validation prevents CSRF attacks
    - Native callback: `/api/auth/facebook/native/callback` → `rudereminders://auth-callback`
  - **Session Management**: 2-week session expiry for all authenticated users (sessions slide-renew on activity)
  - **Security**: All OAuth flows use cryptographically random state parameters stored in session for CSRF protection
- **UI/UX**: Eliminated browser autofill popups across all major browsers for a cleaner login experience. Ensured Apple Guideline 2.3.10 compliance with platform-specific UI rendering.

## External Dependencies
- **React Ecosystem**: React, React DOM, Wouter
- **State Management**: TanStack Query
- **UI Framework**: Radix UI, Tailwind CSS
- **Form Handling**: React Hook Form, Zod
- **Database**: Drizzle ORM, Neon Database (PostgreSQL)
- **Authentication**: OpenID Client, Passport.js, `@capacitor-community/apple-sign-in`, `jsonwebtoken`, `jwks-rsa`, `google-auth-library`
- **Session Management**: Express Session, connect-pg-simple
- **AI Integration**: DeepSeek API
- **Voice Synthesis**: Centralized TTS via `client/src/services/ttsService.ts`. On native (iOS/Android) uses `@capacitor-community/text-to-speech@6.1.0` for native TTS engine access; on web falls back to browser speechSynthesis. Unreal Speech API commented out but preserved in `server/services/notificationService.ts`. 4 voice characters: Scarlett(0.85/0.9 en-US female, free), Will(0.9/0.6 en-US male, premium), Gerald(0.55/0.35 en-GB british-male, premium), Karen(0.95/1.3 en-US female, premium). Voice text reads max 2 items from reminder.responses via `.slice(0, 2).join(' ... ')`, falling back to rudeMessage.
- **Mobile Development**: Capacitor
- **Subscription Management**: RevenueCat SDK (mobile), RevenueCat Web SDK (web dashboard)