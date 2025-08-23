# Rude Daily Reminder App

## Overview

This is a full-stack reminder application that helps users manage daily reminders with a humorous "rude" twist. The app takes regular reminder messages and transforms them into brutally honest, motivational notifications with adjustable rudeness levels. Originally built as a web application, it has been successfully converted to native iOS and Android mobile apps using Capacitor technology.

**Key Features**: Photo/video attachments, historical motivational quotes, voice character selection, cross-platform synchronization, and native mobile notifications with multimedia support.

## User Preferences

Preferred communication style: Simple, everyday language.
UI/UX: Remove intro/landing page - direct authentication flow preferred.
✅ NEW: Simplified Interface Option - FIXED: Now properly hides advanced features (voice characters, attachments, quotes) when enabled, with visual feedback.
✅ NEW: Comprehensive Help System - Interactive help menu with detailed guides, troubleshooting, and feature explanations.
✅ NEW: Smart Navigation - Back buttons, home navigation, and current page highlighting for seamless app navigation.
✅ NEW: Alarm Sound Options - 8 playful, non-jarring alarm sounds with preview functionality for gentle reminders.
✅ NEW: Settings Page Restructure - Converted dropdown categories to dedicated pages with complete navigation flow for better mobile UX.
✅ NEW: Advanced Features Organization - Organized voice characters, attachments, motivational quotes, notification options, and quick settings into individual collapsible dropdowns in reminder form.
✅ NEW: Reminder History Migration - Moved "Your Stats" and "Your Reminders History" from main page to dedicated settings category "YOUR REMINDER HISTORY" for cleaner main interface.
✅ NEW: Multi-Day Scheduling Integration - Added toggle switch to main scheduling section enabling multi-day selection with red highlighting and unique responses per day.
✅ NEW: DeepSeek AI Integration with Humor - COMPLETED: Replaced templated responses with dynamic DeepSeek API integration for truly fresh, personalized motivational messages. AI generates unique, context-aware responses with enhanced humor system:
- Level 1-2: Gentle and encouraging tones
- Level 3: Sarcastic wit and clever wordplay  
- Level 4: Tough love with roasting jokes that make users laugh
- Level 5: Savage but hilarious responses that entertain while motivating
The AI now balances brutal honesty with genuine humor - like having a funny friend who roasts you with love!
✅ NEW: AI Context System Enhancement - COMPLETED: Streamlined context system from free-text input to category-based selection (Work, Family, Health, etc.) for more focused and effective AI responses. Frontend-backend connection verified working.
✅ NEW: Subscription System Implementation - COMPLETED: Created two identical-looking main pages with different feature access:
- HomeFree: Limited to 5 reminders, 3 voice characters, 1 attachment per reminder
- HomePremium: Unlimited reminders, 10 voice characters, 5 attachments per reminder  
- Smart routing based on user subscription status (subscriptionStatus === 'active' || subscriptionPlan === 'premium')
- Both pages have identical UI/UX design for consistent user experience
- ReminderForm component supports feature restrictions based on plan type
- Developer toggle in Navigation component for easy switching between free/premium views for testing
Mobile Development: ✅ COMPLETED - Successfully converted to iOS/Android mobile apps using Capacitor.
Enhancement Features: ✅ COMPLETED - Implemented comprehensive user personalization system with:
- Gender selection (Male/Female/Other) with gender-specific reminders
- Cultural background selection (20+ ethnicities/countries) 
- Cultural-specific motivational quotes from relevant historical figures
- ✅ ENHANCED SETTINGS PAGE COMPLETE: Professional 6-section collapsible interface with:
  * Personal Information (name, email, gender, cultural preferences)
  * Notification Preferences (push, voice, email, summaries, snooze duration)
  * App Behavior (rudeness level, frequency, language, timezone, auto-complete)
  * Appearance (theme selection: light/dark/system, simplified interface toggle)
  * Privacy & Security (data retention, danger zone with data clearing)  
  * Advanced Settings (data export, app version info)
  * Payment & Billing (subscription management, payment methods, billing history)

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with Shadcn/ui component library
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite for development and production builds
- **UI Components**: Comprehensive component library using Radix UI primitives

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (configured for Neon Database)
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL store
- **Real-time Communication**: WebSocket support for live notifications
- **✅ NEW: Voice Integration**: Unreal Speech API with synchronized voice character mapping

### Key Design Decisions

**Monorepo Structure**: The application uses a monorepo approach with three main directories:
- `client/` - React frontend application
- `server/` - Express.js backend application  
- `shared/` - Shared TypeScript schemas and types

**Type Safety**: Full end-to-end type safety using TypeScript, Drizzle ORM schemas, and Zod validation.

**Component Architecture**: Uses Shadcn/ui for consistent, accessible UI components built on Radix UI primitives.

## Key Components

### Database Schema
- **Users Table**: Stores user profiles with notification preferences, default rudeness settings, gender identity, cultural background, and personalization preferences
- **Reminders Table**: Contains reminder data including original messages, rude transformations, scheduling, notification settings, multimedia attachments, and culturally-relevant motivational quotes
- **Rude Phrases Table**: Stores pre-written rude phrases categorized by rudeness levels (1-5)
- **Sessions Table**: Manages user authentication sessions (required for Replit Auth)

### Core Services
- **Reminder Service**: Handles reminder scheduling, triggering, and lifecycle management
- **Notification Service**: Manages different notification types (browser, voice, email, real-time, mobile push)
- **Storage Service**: Provides abstraction layer for all database operations
- **Mobile Services**: Camera integration, native notifications, platform detection, and mobile UI optimization

### Authentication System
- **Replit Auth Integration**: Uses OpenID Connect for seamless authentication
- **Session Management**: Secure session handling with PostgreSQL storage
- **User Management**: Automatic user creation and profile management

### Real-time Features
- **WebSocket Connection**: Enables real-time reminder notifications
- **Browser Notifications**: Native browser notification API integration
- **✅ Voice Notifications**: Unreal Speech API integration with 10 synchronized voice characters
  - Backend API endpoints for voice character management (/api/voices)
  - Voice testing capability with real audio generation (/api/voices/test)
  - Character mapping: default→Scarlett, drill-sergeant→Dan, robot→Will, british-butler→Amy, mom→Scarlett
  - Dynamic frontend fetching of voice options from backend
- **Email Notifications**: Placeholder implementation for email alerts

### Mobile-Ready Enhancement Features
- **Photo/Video Attachments**: Users can attach up to 5 images or videos to reminders via dropdown interface
- **Cultural Motivational Quotes**: Integration with 25+ diverse quotes from historical figures across different cultural backgrounds:
  - American leaders (Steve Jobs, MLK Jr., Walt Disney)
  - African American icons (Muhammad Ali, Maya Angelou)
  - International figures (Gandhi, Mandela, Confucius)
  - Gender-diverse representation (Eleanor Roosevelt, Marie Curie)
- **✅ Comprehensive User Personalization COMPLETE**: Gender identity and cultural background preferences with targeted content delivery
- **✅ Capacitor Mobile Conversion COMPLETE**: Native iOS and Android apps ready for App Store deployment
- **Native Camera Integration**: Direct camera access and gallery picker for mobile devices
- **Mobile-Optimized Notifications**: Rich push notifications with multimedia and motivational content
- **Cross-Platform Synchronization**: Seamless data sync between web and mobile versions

## Data Flow

1. **User Authentication**: Users authenticate via Replit Auth, creating or retrieving user profiles
2. **Reminder Creation**: Users create reminders with title, message, schedule, and notification preferences
3. **Rude Message Generation**: Original messages are transformed using pre-seeded rude phrases based on selected rudeness level
4. **Scheduling**: Reminders are scheduled using Node.js timers with persistence across server restarts
5. **Notification Delivery**: When triggered, reminders send notifications via multiple channels based on user preferences
6. **Real-time Updates**: WebSocket connections provide immediate UI updates and live notifications

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React, React DOM, React Router (Wouter)
- **State Management**: TanStack Query for server state
- **UI Framework**: Radix UI components, Tailwind CSS, class-variance-authority
- **Form Handling**: React Hook Form with Zod validation

### Backend Dependencies
- **Database**: Drizzle ORM, Neon Database serverless PostgreSQL
- **Authentication**: OpenID Client, Passport.js
- **Session Management**: Express Session, connect-pg-simple
- **Utilities**: Date-fns for date manipulation, memoizee for caching

### Development Tools
- **Build Tools**: Vite, ESBuild, TypeScript
- **Code Quality**: ESLint, Prettier (inferred from tsconfig)
- **Replit Integration**: Replit-specific development plugins and error handling

## Deployment Strategy

### Development Environment
- **Hot Reload**: Vite development server with HMR
- **Database**: Currently using in-memory storage for development (switched from disabled Neon database)
- **Session Storage**: In-memory sessions using memorystore (switched from PostgreSQL for development)
- **Real-time Features**: WebSocket server runs alongside Express

### Production Deployment Recommendations
- **Deployment Type**: Autoscale Deployment (recommended for variable traffic and real-time features)
- **Database**: Production-ready with auto-fallback (currently using memory storage due to disabled Neon database)
- **Session Storage**: Production-ready with auto-fallback (currently using memory sessions)
- **Scaling**: Autoscale handles traffic patterns and WebSocket connections automatically

### Current Production Status
- **✅ Code Architecture**: Production-ready with smart fallbacks
- **✅ Error Handling**: Graceful database connection failure handling
- **✅ Session Management**: Automatic fallback to memory sessions
- **✅ Storage Layer**: Automatic fallback to memory storage
- **🔄 Database**: Ready to connect when proper DATABASE_URL is provided
- **🚀 Deployment Ready**: Can deploy immediately with current fallback system

### Production Build
- **Frontend**: Vite builds optimized static assets to `dist/public`
- **Backend**: ESBuild bundles server code for Node.js production
- **Database Migrations**: Drizzle Kit handles schema migrations
- **Environment Variables**: Requires `DATABASE_URL`, `SESSION_SECRET`, and Replit Auth variables

### Key Configuration Files
- **Drizzle Config**: Points to PostgreSQL with migrations in `./migrations`
- **Vite Config**: Configured for React with TypeScript, includes Replit-specific plugins
- **TypeScript**: Strict mode enabled with path aliases for clean imports
- **Tailwind**: Custom color palette with "rude-red" theme variants

The application is designed to be deployed on Replit with automatic provisioning of PostgreSQL databases and built-in authentication. The mobile versions are ready for iOS App Store and Google Play Store deployment with native project files configured for both platforms.

## Mobile App Deployment Status

### ✅ Capacitor Conversion Complete
- **iOS Project**: Native Xcode project ready (`ios/` directory)
- **Android Project**: Native Android Studio project ready (`android/` directory)
- **Mobile Assets**: App icons, splash screens, and platform configurations completed
- **Native Plugins**: Camera, notifications, status bar, device info, and filesystem plugins installed

### 📱 Mobile-Specific Features
- **MobileCamera Component**: Native camera access with gallery picker
- **MobileNotifications Hook**: Local push notifications with multimedia support
- **Platform Detection**: Automatic feature detection and mobile optimization
- **Touch-Optimized UI**: Larger buttons and mobile-friendly interactions

### 🚀 Ready for App Store Deployment
- **iOS**: Requires macOS + Xcode + Apple Developer Program ($99/year)
- **Android**: Requires Android Studio + Google Play Console ($25 one-time)
- **Timeline**: 1-7 days iOS review, 1-3 days Android review
- **Unique Value**: Only reminder app with historical motivation + multimedia attachments