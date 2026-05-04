# Rude Daily Reminder App

## Overview
The Rude Daily Reminder App is a full-stack application providing daily reminders with a humorous, "rude" twist, allowing users to customize the rudeness level. It aims to transform standard reminders into motivational notifications. Originally a web application, it has been converted into native iOS and Android mobile apps using Capacitor, offering cross-platform synchronization and rich native mobile notifications. Key capabilities include photo/video attachments, historical motivational quotes, voice character selection, and an adjustable humor level via AI. The business vision is to deliver a unique, engaging, and motivating reminder experience. All users must authenticate before accessing the app.

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
- **Rudy Character System**: An interactive mascot widget (`RudyWidget`) provides animated speech bubbles with dynamic, context-aware "rude" or "positive" lines triggered by various user events (e.g., reminder creation, task completion, slider changes). Rudy images are managed in `client/public/rudy/`.
- **Subscription System**: Differentiates features for free and premium users, including AI-generated content and monthly reminder limits. Free users have a monthly reminder limit that steps down after 6 months. Premium access is managed via RevenueCat webhooks and a whitelist for specific accounts. Expired subscriptions are gracefully downgraded.
- **Analytics Event Log**: A separate `reminder_events` table stores completion/missed history, independent of reminders, ensuring graph data persistence even after reminder deletion. A daily cleanup task manages subscription expirations and data integrity.
- **Comprehensive User Personalization**: Allows gender and cultural background selection for tailored content.
- **Mobile-Native Architecture**: Full native iOS/Android support via Capacitor, including AdMob integration, local notifications, and camera access.
    - **Photo Picker**: Production-ready photo capture and gallery selection optimized for iPad (`@capawesome/capacitor-file-picker`, Capacitor Camera plugin). Files are uploaded to `/api/upload` and stored in `attached_assets/`.
    - **Notification Attachments**: Photos are handled for iOS notifications by downloading server URLs and converting them to local file paths.
    - **Quick Reminder Settings**: Inline quick-action buttons facilitate rapid reminder creation with pre-filled form data, including AI-generated messages, photos, quotes, and voice preferences.
- **Forgot Password Flow**: Email-based password reset for email/password accounts with token validation and expiry.
- **Authentication**: Multi-provider authentication supporting Apple, Google, and Facebook sign-in.
    - **Login Page Layout**: Social login buttons are positioned below the email/password form.
    - **Apple Sign-In**: Native iOS integration with full JWT token verification.
    - **Google & Facebook Sign-In**: App Store-compliant in-app browser OAuth flow using Capacitor Browser plugin for native iOS/Android, and standard redirect for web. Custom URL schemes handle native callbacks.
    - **Session Management**: 2-week session expiry with slide-renewal.
    - **Native Mobile Auth Tokens**: Bearer `authToken`s are used for native iOS/Android due to cross-origin limitations of Capacitor WebView with API server.
    - **Security**: Cryptographically random state parameters protect against CSRF attacks.
- **UI/UX**: Eliminated browser autofill popups for a cleaner login experience and ensured Apple Guideline 2.3.10 compliance.

## External Dependencies
- **React Ecosystem**: React, React DOM, Wouter
- **State Management**: TanStack Query
- **UI Framework**: Radix UI, Tailwind CSS
- **Form Handling**: React Hook Form, Zod
- **Database**: Drizzle ORM, Neon Database (PostgreSQL)
- **Authentication**: OpenID Client, Passport.js, `@capacitor-community/apple-sign-in`, `jsonwebtoken`, `jwks-rsa`, `google-auth-library`
- **Session Management**: Express Session, connect-pg-simple
- **AI Integration**: DeepSeek API
- **Voice Synthesis**: Centralized TTS via `ttsService.ts`. Uses `@capacitor-community/text-to-speech` for native iOS/Android and browser `speechSynthesis` for web. Supports 4 voice characters (Scarlett, Will, Gerald, Karen).
- **Mobile Development**: Capacitor
- **Subscription Management**: RevenueCat SDK (mobile), RevenueCat Web SDK (web dashboard)