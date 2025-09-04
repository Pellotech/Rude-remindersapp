# Mobile Setup Guide - Rude Reminders App

This guide ensures you can quickly set up the mobile development environment without repeating manual configuration steps.

## Prerequisites

### macOS Setup (Required for iOS development)
1. **Install Xcode** from the Mac App Store
2. **Set Xcode command line tools path:**
   ```bash
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   ```

### Node.js & Dependencies
1. **Install project dependencies:**
   ```bash
   npm install
   ```

2. **Install iOS platform (if not already installed):**
   ```bash
   npm install @capacitor/ios
   ```

## Quick Mobile Setup

### 1. Build the Web Assets
```bash
npm run build
```

### 2. Sync iOS Project
```bash
npx cap sync ios
```

### 3. Open iOS Project in Xcode
```bash
npx cap open ios
```

### 4. For Android
```bash
npx cap sync android
npx cap open android
```

## Project Configuration

### AdMob App IDs (Already Configured)
- **Android:** `ca-app-pub-2730939178232394~9135087475`
- **iOS:** `ca-app-pub-2730939178232394~3691189109`

### Key Files Already Set Up
- `ios/App/App/Info.plist` - iOS AdMob configuration
- `android/app/src/main/AndroidManifest.xml` - Android AdMob configuration
- `capacitor.config.ts` - Capacitor configuration
- `ios/App/Podfile` - iOS dependencies

## Troubleshooting

### Common Issues

1. **"xcode-select: error: tool 'xcodebuild' requires Xcode"**
   ```bash
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   ```

2. **"Could not find the web assets directory"**
   ```bash
   npm run build
   ```

3. **"ios platform has not been added yet"**
   ```bash
   npm install @capacitor/ios
   ```

4. **Pod install failures**
   - Make sure you're in the project root directory
   - Ensure Xcode is properly installed and set up

## Development Workflow

1. **Make web changes** in `client/src/`
2. **Build:** `npm run build`
3. **Sync:** `npx cap sync ios` or `npx cap sync android`
4. **Test in simulator/device** via Xcode or Android Studio

## Important Notes

- **Firebase:** Not currently used (PostgreSQL/Neon Database instead)
- **Authentication:** Uses Replit Auth
- **Database:** PostgreSQL with Drizzle ORM
- **Push Notifications:** Capacitor Local Notifications (no Firebase needed)

## Project Structure
```
├── client/                 # React frontend
├── server/                 # Express backend
├── shared/                 # Shared TypeScript types
├── ios/                    # iOS Capacitor project
├── android/                # Android Capacitor project
├── dist/                   # Built web assets (created by npm run build)
└── capacitor.config.ts     # Capacitor configuration
```

This setup guide eliminates the need to manually configure CocoaPods, AdMob IDs, and platform-specific settings when setting up the project on a new machine.