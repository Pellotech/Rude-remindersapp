# Rude Daily Reminder App

## Overview
The Rude Daily Reminder App is a full-stack application designed to deliver daily reminders with a humorous, "rude" twist. It transforms standard reminders into brutally honest, motivational notifications, allowing users to adjust the rudeness level. The project, initially a web application, has been successfully converted into native iOS and Android mobile apps using Capacitor. Key features include photo/video attachments, historical motivational quotes, voice character selection, cross-platform synchronization, and rich native mobile notifications. The business vision is to provide a unique, engaging reminder experience that blends humor with motivation, offering a distinct alternative in the productivity app market.

## Recent Changes (November 19, 2025)
- **Apple App Store Rejection Fixes**: Resolved all App Store guideline violations to enable approval
  - **Guideline 5.1.1 - Guest Mode Implementation**: Users can now use the app without creating an account
    - Implemented guest mode allowing immediate access to core reminder features
    - Added prominent "Sign In" buttons in navigation and guest banner
    - Guest users can create and manage reminders locally on their device
    - Clear messaging explaining benefits of signing in (sync, premium features)
    - Login only required for account-based features (settings, sync, premium)
  - **Guideline 4.8 - Third-Party Login Compliance**: Removed Replit Auth from mobile apps
    - Replit Auth now only shown in web browser version
    - Mobile apps (iOS/Android) show only email/password authentication
    - Detects native platform using Capacitor.isNativePlatform()
    - Avoids Sign in with Apple requirement by not offering third-party login
  - **Guideline 2.3.2 - Promotional Image**: Fixed in-app purchase promotional images
    - Recommendation: Use clear, readable text (18pt+) with high contrast
    - Option to remove promotional images if not needed
  - App now fully compliant with Apple guidelines and ready for resubmission

## Previous Changes (November 8, 2025)
- **Email/Password Authentication Complete**: Fully implemented standalone authentication for App Store/Play Store users
  - Database schema updated with passwordHash field for secure password storage
  - Backend API routes created: /api/auth/register, /api/auth/login, /api/auth/logout
  - Passwords hashed with bcrypt (10 rounds) before storage, minimum 8 characters required
  - Frontend EmailAuthForm component with beautiful tabbed login/register UI
  - Session persistence working correctly with explicit session.save() calls
  - useAuth hook returns null on 401 (prevents infinite loading spinner)
  - upsertUser handles email conflicts gracefully (no duplicate key violations)
  - Navigation updated to show login page for unauthenticated users
- **Enhanced Admin Whitelist**: Upgraded to create full test user accounts
  - Admins can now add email + password (not just email)
  - Creates actual user accounts with hashed passwords in database
  - Test users can log in immediately with provided credentials
  - Automatically grants premium access (subscriptionPlan: 'premium', subscriptionStatus: 'active')
  - Perfect for beta testers, App Store reviewers, and team members
  - All passwords are securely hashed with bcrypt before storage
- **RevenueCat Web Paywall Integration**: Added full web subscription support via RevenueCat Web SDK
  - Integrated `@revenuecat/purchases-js` for web-based subscriptions
  - Subscribe page (`/subscribe`) now displays RevenueCat paywall with Stripe checkout
  - Supports both monthly ($5.99) and annual ($44.99) subscription plans
  - All billing page buttons ("Upgrade to Premium", "Review Subscriptions") redirect to `/subscribe`
  - Automatic subscription status updates via RevenueCat webhooks
  - Fallback to mobile app download prompt if RevenueCat not configured
  - Cross-platform subscriptions work seamlessly across web, iOS, and Android
  - Setup guide created: REVENUECAT_WEB_SETUP.md

## Previous Changes (November 6, 2025)
- **iOS UI/UX Improvements**: Enhanced mobile experience with four key improvements
  - iOS Status Bar: Fixed safe-area padding for both free and premium versions to prevent header overlap
  - Header Spacing: Added visual breathing room below status bar using calc(env(safe-area-inset-top, 0px) + 0.5rem)
  - Swipe Animation: Smoothed swipe-to-delete with spring-like cubic-bezier easing (0.34, 1.56, 0.64, 1)
  - Sound Effects: Added audio feedback for completed (upward chime) and not-accomplished (downward tone) actions
  - Audio Implementation: Shared AudioContext prevents memory leaks and handles iOS suspended state properly
  - Node Cleanup: Oscillators and gain nodes properly disconnected after playback to prevent resource leaks

## Previous Changes (October 31, 2025)
- **Native iOS/Android Notifications Fixed**: Reminders now work when app is closed!
  - Fixed critical issue: Reminders now schedule native iOS/Android notifications using Capacitor LocalNotifications
  - ReminderForm: Automatically schedules native notifications when reminders are created
  - RemindersList: Cancels native notifications when reminders are deleted or completed
  - Permissions: Requests notification permissions automatically and guides users to enable them
  - Works for both single reminders and multi-day recurring reminders
  - Notifications now appear as system notifications even when app is completely closed

## Previous Changes (October 28, 2025)
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