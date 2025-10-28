# Rude Daily Reminder App

## Overview
The Rude Daily Reminder App is a full-stack application designed to deliver daily reminders with a humorous, "rude" twist. It transforms standard reminders into brutally honest, motivational notifications, allowing users to adjust the rudeness level. The project, initially a web application, has been successfully converted into native iOS and Android mobile apps using Capacitor. Key features include photo/video attachments, historical motivational quotes, voice character selection, cross-platform synchronization, and rich native mobile notifications. The business vision is to provide a unique, engaging reminder experience that blends humor with motivation, offering a distinct alternative in the productivity app market.

## Recent Changes (October 28, 2025)
- **iOS App Store Preparation Completed**: Fixed all build issues and prepared app for App Store submission
  - App Icon: Generated complete AppIcon asset catalog using smiley face branding (1024x1024)
  - Build Settings: Added `-Wno-quoted-include-in-framework-header` flag to suppress Cordova header warnings
  - Info.plist: Configured CFBundleIconName and verified orientation settings
  - Display Name: Confirmed "Rude Reminders" as app display name across iOS project
  - Asset Generation: Installed @capacitor/assets package for automated icon/splash generation
  - Ready for Archive: Project now builds cleanly for App Store Archive and TestFlight

## Previous Changes (September 9, 2025)
- **RevenueCat Migration Completed**: Successfully migrated from Stripe to RevenueCat for mobile-first subscription management
  - Backend: Replaced all Stripe API routes with RevenueCat webhook handlers (`/api/webhooks/revenuecat`)
  - Database: Updated schema to use RevenueCat fields (`revenueCatCustomerId`, `revenueCatEntitlements`)
  - Frontend: Updated subscription pages to show mobile app download prompts instead of web payment forms
  - Mobile Config: Added RevenueCat API key placeholders to iOS Info.plist and Android manifest
  - Documentation: Created comprehensive RevenueCat setup guide (`revenuecat-setup.md`)

## Previous Changes (September 4, 2025)
- **AdMob Integration Fixed**: Resolved mobile app crashes by configuring correct AdMob App IDs
  - Android: `ca-app-pub-2730939178232394~9135087475`
  - iOS: `ca-app-pub-2730939178232394~3691189109`
- **Mobile Setup Documentation**: Created comprehensive setup guide to prevent manual reconfiguration
- **iOS Project Structure**: Properly configured Capacitor iOS project with CocoaPods integration
- **Build System**: Verified web asset compilation and mobile sync process
- **Xcode Integration**: Resolved command line tools path issues for iOS development

## Previous Changes (August 28, 2025)
- **RevenueCat Subscription System**: Migrated from Stripe to RevenueCat for better mobile app store integration
- **Flexible Pricing Model**: Monthly subscription at $6/month and yearly at $48/year ($4/month effective rate)
- **Mobile-First Approach**: Subscriptions now managed through iOS App Store and Google Play Store
- **Premium Feature Gating**: AI-generated responses, cultural personalization, and advanced features require subscription
- **App Store Integration**: Native subscription management with automatic renewal and family sharing support

## User Preferences
Preferred communication style: Simple, everyday language.
UI/UX: Remove intro/landing page - direct authentication flow preferred.

## System Architecture
### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with Shadcn/ui component library
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Build Tool**: Vite
- **UI Components**: Radix UI primitives

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM
- **Database**: PostgreSQL (configured for Neon Database)
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL store
- **Real-time Communication**: WebSocket support
- **Voice Integration**: Unreal Speech API

### Key Design Decisions
- **Monorepo Structure**: Organized into `client/` (React), `server/` (Express.js), and `shared/` (TypeScript schemas/types).
- **Type Safety**: End-to-end type safety using TypeScript, Drizzle ORM, and Zod validation.
- **Component Architecture**: Utilizes Shadcn/ui components built on Radix UI for consistency and accessibility.
- **Dynamic AI Responses**: Integration with DeepSeek AI for personalized, context-aware motivational messages with adjustable humor levels (Level 1-5).
- **Subscription System**: Differentiates features for free and premium users, including access to AI-generated content.
- **Comprehensive User Personalization**: Allows gender and cultural background selection for tailored content, including culturally-specific quotes.
- **Mobile-Native Architecture**: Full native iOS/Android support via Capacitor with proper AdMob integration, local notifications, and camera access.
- **Development Workflow**: Automated mobile sync process with comprehensive setup documentation to prevent manual reconfiguration.

### Key Components
- **Database Schema**: Includes `Users`, `Reminders`, `Rude Phrases`, and `Sessions` tables.
- **Core Services**: Reminder Service, Notification Service, Storage Service, Mobile Services.
- **Authentication System**: Replit Auth, secure session management, and user profile management.
- **Real-time Features**: WebSocket for live updates, browser notifications, and Unreal Speech API for voice notifications.
- **Subscription Integration**: RevenueCat webhooks for real-time subscription status updates from mobile app stores.

## External Dependencies
- **React Ecosystem**: React, React DOM, Wouter (React Router).
- **State Management**: TanStack Query.
- **UI Framework**: Radix UI, Tailwind CSS, class-variance-authority.
- **Form Handling**: React Hook Form, Zod.
- **Database**: Drizzle ORM, Neon Database (PostgreSQL).
- **Authentication**: OpenID Client, Passport.js.
- **Session Management**: Express Session, connect-pg-simple.
- **Utilities**: Date-fns, memoizee.
- **Build Tools**: Vite, ESBuild, TypeScript.
- **Code Quality**: ESLint, Prettier.
- **AI Integration**: DeepSeek API.
- **Voice Synthesis**: Unreal Speech API.
- **Mobile Development**: Capacitor (for iOS and Android conversion).
- **Subscription Management**: RevenueCat SDK (mobile), RevenueCat Web SDK (web dashboard).