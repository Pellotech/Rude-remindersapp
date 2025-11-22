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
  - **iPad Compatibility (iPadOS 26.1+)**: Optimized photo picker with popover presentation style
    - Disabled `allowEditing` on all iOS devices to prevent iPad crashes
    - Added `presentationStyle: 'popover'` for iPad-native UI
    - Quality set to 85% for optimal performance on iPad
    - Fallback to `image.path` if `webPath` unavailable
    - Enhanced error logging for iPad-specific debugging
    - Removed fixed width/height constraints for large image support
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