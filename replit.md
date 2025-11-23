# Rude Daily Reminder App

## Overview
The Rude Daily Reminder App is a full-stack application that provides daily reminders with a humorous, "rude" twist, allowing users to customize the rudeness level. It aims to transform standard reminders into motivational notifications. The project, originally a web application, has been converted into native iOS and Android mobile apps using Capacitor, offering cross-platform synchronization and rich native mobile notifications. Key capabilities include photo/video attachments, historical motivational quotes, voice character selection, and an adjustable humor level via AI. The business vision is to deliver a unique, engaging, and motivating reminder experience.

Guest users have limited free access, while all authenticated users (including developers) experience the premium interface.

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
- **Authentication**: Native iOS Sign in with Apple integration, meeting App Store Guideline 4.8.
  - **Security**: Full JWT token verification using Apple's JWKS (public key validation, signature verification, claims validation)
  - **Privacy**: Respects Apple's "Hide My Email" feature - only stores email if Apple provides it
  - **Platform Detection**: Button only appears on native iOS (auto-detected via Capacitor)
  - **Equal Prominence**: Apple Sign-In button positioned with equal prominence to email/password authentication
  - **Token Verification**: Backend validates identity tokens against Apple's public keys from `https://appleid.apple.com/auth/keys`
  - **Audience Validation**: Ensures token audience matches app bundle ID (`com.rudereminders.app`)
  - **Session Management**: 1-week session expiry for Apple-authenticated users
  - **Xcode Setup Required**: Developer must add "Sign in with Apple" capability in Xcode and register app ID in Apple Developer Portal
- **UI/UX**: Eliminated browser autofill popups across all major browsers for a cleaner login experience. Ensured Apple Guideline 2.3.10 compliance with platform-specific UI rendering.

## External Dependencies
- **React Ecosystem**: React, React DOM, Wouter
- **State Management**: TanStack Query
- **UI Framework**: Radix UI, Tailwind CSS
- **Form Handling**: React Hook Form, Zod
- **Database**: Drizzle ORM, Neon Database (PostgreSQL)
- **Authentication**: OpenID Client, Passport.js, `@capacitor-community/apple-sign-in`, `jsonwebtoken`, `jwks-rsa`
- **Session Management**: Express Session, connect-pg-simple
- **AI Integration**: DeepSeek API
- **Voice Synthesis**: Unreal Speech API
- **Mobile Development**: Capacitor
- **Subscription Management**: RevenueCat SDK (mobile), RevenueCat Web SDK (web dashboard)