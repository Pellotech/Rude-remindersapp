# iOS Setup Guide for Sign in with Apple

## Error: "UNIMPLEMENTED"
This error occurs when the Capacitor plugin hasn't been synced to your iOS project yet.

## Fix Steps

### 1. Sync Capacitor Plugins
Run this command in your project root to sync all plugins to iOS:
```bash
npx cap sync ios
```

### 2. Open Xcode Project
```bash
npx cap open ios
```

### 3. Add Sign in with Apple Capability in Xcode
1. Select your project in the Project Navigator
2. Select the "App" target
3. Click the "Signing & Capabilities" tab
4. Click "+ Capability" button (top left)
5. Search for "Sign in with Apple"
6. Click to add it to your project

### 4. Verify Bundle ID
1. In the "Signing & Capabilities" tab
2. Confirm Bundle Identifier is: `com.rudereminders.app`

### 5. Configure App ID in Apple Developer Portal
1. Go to https://developer.apple.com/account/resources/identifiers/list
2. Find or create App ID: `com.rudereminders.app`
3. Edit the App ID
4. Enable "Sign in with Apple" capability
5. Save changes

### 6. Clean Build (if needed)
In Xcode:
- Product → Clean Build Folder (Shift + Cmd + K)
- Product → Build (Cmd + B)

### 7. Run on Device/Simulator
- Select your device/simulator
- Click Run (Cmd + R)

## Verification Checklist
- [ ] Ran `npx cap sync ios`
- [ ] Opened Xcode project
- [ ] Added "Sign in with Apple" capability in Xcode
- [ ] Bundle ID is `com.rudereminders.app`
- [ ] App ID registered in Apple Developer Portal
- [ ] Sign in with Apple enabled on App ID
- [ ] Clean build completed
- [ ] App runs on device/simulator

## Expected Result
After completing these steps, the "Sign in with Apple" button should work on your iOS device/simulator without the "UNIMPLEMENTED" error.

## Troubleshooting

### Still Getting UNIMPLEMENTED Error?
1. Verify the plugin is installed:
   ```bash
   npm list @capacitor-community/apple-sign-in
   ```
2. Try removing and reinstalling the plugin:
   ```bash
   npm uninstall @capacitor-community/apple-sign-in
   npm install @capacitor-community/apple-sign-in
   npx cap sync ios
   ```

### Capability Not Showing in Xcode?
- Make sure you're logged in to your Apple Developer account in Xcode
- Xcode → Preferences → Accounts
- Add or verify your Apple ID

### Build Errors?
- Ensure you have the latest Xcode version
- Ensure iOS deployment target is 13.0 or higher
- Check that all provisioning profiles are valid
