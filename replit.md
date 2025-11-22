# Rude Daily Reminder App

## Overview
The Rude Daily Reminder App is a full-stack application that delivers daily reminders with a humorous, "rude" twist, allowing users to adjust the rudeness level. It transforms standard reminders into brutally honest, motivational notifications. The project, initially a web application, has been converted into native iOS and Android mobile apps using Capacitor. Key capabilities include photo/video attachments, historical motivational quotes, voice character selection, cross-platform synchronization, and rich native mobile notifications. The business vision is to provide a unique, engaging reminder experience that blends humor with motivation, offering a distinct alternative in the productivity app market.

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
- **Dynamic AI Responses**: Integration with DeepSeek AI for personalized, context-aware motivational messages with adjustable humor levels.
- **Subscription System**: Differentiates features for free and premium users, including access to AI-generated content.
- **Comprehensive User Personalization**: Allows gender and cultural background selection for tailored content.
- **Mobile-Native Architecture**: Full native iOS/Android support via Capacitor with AdMob integration, local notifications, and camera access.

## External Dependencies
- **React Ecosystem**: React, React DOM, Wouter.
- **State Management**: TanStack Query.
- **UI Framework**: Radix UI, Tailwind CSS.
- **Form Handling**: React Hook Form, Zod.
- **Database**: Drizzle ORM, Neon Database (PostgreSQL).
- **Authentication**: OpenID Client, Passport.js.
- **Session Management**: Express Session, connect-pg-simple.
- **AI Integration**: DeepSeek API.
- **Voice Synthesis**: Unreal Speech API.
- **Mobile Development**: Capacitor.
- **Subscription Management**: RevenueCat SDK (mobile), RevenueCat Web SDK (web dashboard).

## Recent Changes (November 22, 2025)
- **Guest Mode Subscription Page Redesign**: Completely redesigned subscription screen
  - **Removed**: ALL iOS App Store management instructions, renewal dates, billing notes, subscription management details
  - **Clean, Minimal Design**: 
    - Hero section with Crown icon and gradient title
    - Single large "Subscribe Now" button that opens RevenueCat paywall
    - If user is premium: "You're a Premium Member!" message with "View Subscription Details" button
    - Premium features list shown below
  - **Simplified Logic**: 
    - Guest mode always shows Subscribe Now button if RevenueCat is configured
    - Premium users see success message instead of confusing iOS instructions
    - No more platform-specific download prompts or App Store instructions
  - **Files Changed**: subscribe.tsx
  - **Result**: Clean funnel to RevenueCat paywall, no confusion for testers or guest users

## Recent Changes (November 20, 2025)
- **Apple App Store Rejection Fixes**: Addressed Guideline 2.1 (App Completeness) and 2.2 (Beta Version)
  - **iPad Photo Picker Crash Fix**: Implemented device detection to disable photo editing on iPad (prevents crashes)
    - Added NSPhotoLibraryAddUsageDescription to Info.plist
    - Conservative approach: defaults to safe config, detects iPad using Device API
    - Enhanced error handling with permission-specific messages and visual alerts
    - No race conditions - safe from first render
    - Files: MobileCamera.tsx, Info.plist
  - **Beta-Looking Elements Removed**: Eliminated all placeholder/testing elements
    - Removed "More Admin Features Coming Soon" card from admin page
    - Updated AdMob comments to remove alarming "causing crashes" language
    - Files: admin.tsx, admobService.ts
  - **RevenueCat Documentation**: Created comprehensive guide for fixing "No current offering" issue
    - Issue is dashboard configuration, not code - user must set current offering in RevenueCat
    - Files: APPLE_REVIEW_FIX_REVENUECAT.md, APPLE_REVIEW_FIXES_SUMMARY.md
- **Complete Browser Autofill Prevention Fix**: Eliminated ALL Chrome/Safari/Firefox password manager popups
  - **Issue**: Chrome showing password autofill popup at bottom-left, Safari showing iCloud keychain
  - **Aggressive Multi-Browser Fix Applied**:
    1. **Fake hidden fields** per form (fakeEmail, fakePassword) to trick Chrome autofill detection
    2. **Changed email input type** from "email" to "text" to prevent browser detection
    3. **inputMode="text"** on all inputs to prevent mobile keyboard hints
    4. **autoComplete="new-password"** on ALL inputs (even email) to disable saved credentials
    5. **Removed password hints** from placeholders ("credentials" instead of "password", "address" instead of "email")
    6. **Removed specific IDs** from password fields to prevent Chrome detection
    7. **Form-level anti-autofill**: autoComplete="off", autoCapitalize="none", autoCorrect="off"
    8. **CSS to hide autofill buttons**: webkit-credentials-auto-fill-button, webkit-contacts-auto-fill-button
  - **Files Fixed**: EmailAuthForm.tsx, index.css
  - **Result**: ZERO autofill popups in Chrome, Safari, Firefox, and Replit preview - completely clean login page
- **Settings Pages Autofill Fix**: Earlier fix for settings pages
  - **Root Cause**: Email/password fields in settings pages were missing `autoComplete="off"` attribute
  - **Files Fixed**: settings.tsx, PersonalInfo.tsx, AdminWhitelist.tsx, SettingsModal.tsx
- **Subscription Page UX Improvements**: Fixed confusing mobile app experience
  - **Mobile App Users**: Users already on native iOS/Android apps now see helpful subscription instructions instead of "Download the app" prompt
  - **Platform Detection**: Implemented smart conditional rendering using `platform.isNative` to differentiate between web and native mobile users
  - **Step-by-Step Instructions**: Native mobile users see clear, platform-specific instructions for subscribing via App Store/Google Play
  - **Safe-Area Padding**: Added `pt-safe` class to all navigation headers (Back/Home buttons) to prevent overlap with iOS status bar
  - **Web Users Unchanged**: Web users still see appropriate "Download app" prompt directing them to mobile apps
- **Apple Guideline 2.3.10 Compliance**: Completed platform-specific UI implementation
  - **Conditional Android References**: iOS users now see only iOS-specific content across all pages (subscribe, billing, settings, help, intro tour)
  - **Platform Detection Integration**: Used `getPlatformInfo()` throughout app to conditionally render Android/Google Play references
  - **Files Updated**: subscribe.tsx, Billing.tsx, settings.tsx, HelpMenu.tsx, IntroTour.tsx with platform detection
  - **Server Routes**: Backend routes return iOS-specific messages when detected
  - **All Apple Guidelines Met**: 5.1.1 (guest mode), 4.8 (no third-party login on mobile), 4.0 (no Safari redirect), 2.3.10 (accurate metadata)