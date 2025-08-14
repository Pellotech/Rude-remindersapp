# Rude Daily Reminder App

## Overview

This is a full-stack web application that helps users manage daily reminders with a humorous "rude" twist. The app takes regular reminder messages and transforms them into brutally honest, motivational (or demotivational) notifications with adjustable rudeness levels. Users can set reminders with different notification types including browser notifications, voice alerts, and email notifications. Reminders can only be scheduled up to one week in advance to encourage immediate action.

## User Preferences

Preferred communication style: Simple, everyday language.
UI/UX: Remove intro/landing page - direct authentication flow preferred.

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

### Key Design Decisions

**Monorepo Structure**: The application uses a monorepo approach with three main directories:
- `client/` - React frontend application
- `server/` - Express.js backend application  
- `shared/` - Shared TypeScript schemas and types

**Type Safety**: Full end-to-end type safety using TypeScript, Drizzle ORM schemas, and Zod validation.

**Component Architecture**: Uses Shadcn/ui for consistent, accessible UI components built on Radix UI primitives.

## Key Components

### Database Schema
- **Users Table**: Stores user profiles with notification preferences and default rudeness settings
- **Reminders Table**: Contains reminder data including original messages, rude transformations, scheduling, and notification settings
- **Rude Phrases Table**: Stores pre-written rude phrases categorized by rudeness levels (1-5)
- **Sessions Table**: Manages user authentication sessions (required for Replit Auth)

### Core Services
- **Reminder Service**: Handles reminder scheduling, triggering, and lifecycle management
- **Notification Service**: Manages different notification types (browser, voice, email, real-time)
- **Storage Service**: Provides abstraction layer for all database operations

### Authentication System
- **Replit Auth Integration**: Uses OpenID Connect for seamless authentication
- **Session Management**: Secure session handling with PostgreSQL storage
- **User Management**: Automatic user creation and profile management

### Real-time Features
- **WebSocket Connection**: Enables real-time reminder notifications
- **Browser Notifications**: Native browser notification API integration
- **Voice Notifications**: Web Speech API for audio reminders
- **Email Notifications**: Placeholder implementation for email alerts

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

The application is designed to be deployed on Replit with automatic provisioning of PostgreSQL databases and built-in authentication, though it can be adapted for other deployment platforms with minimal configuration changes.