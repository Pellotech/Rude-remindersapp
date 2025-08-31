# AdMob Integration Setup Guide

## What's Been Implemented

✅ **AdMob Service**: Complete service layer for banner, interstitial, and reward ads
✅ **React Hook**: `useAdMob` hook for easy integration in components  
✅ **AdMob Manager**: Component that automatically shows ads for free users
✅ **Capacitor Config**: Basic configuration file for AdMob plugin
✅ **Integration**: Added to home-free page with reward ad functionality

## Next Steps for Production

### 1. Get Your AdMob Account Ready
- Sign up at [AdMob Console](https://admob.google.com/)
- Create your app in AdMob
- Generate your real Ad Unit IDs

### 2. Replace Test Ad Unit IDs
In `client/src/services/admobService.ts`, replace the test IDs with your real ones:

```typescript
private readonly adUnitIds = {
  banner: {
    android: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', // Your banner ID
    ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX'     // Your banner ID
  },
  interstitial: {
    android: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', // Your interstitial ID  
    ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX'     // Your interstitial ID
  },
  reward: {
    android: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', // Your reward ID
    ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX'     // Your reward ID
  }
};
```

### 3. Update Capacitor Config
In `capacitor.config.json`, replace the test App ID:
```json
{
  "plugins": {
    "AdMob": {
      "appId": "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX",
      "initializeForTesting": false
    }
  }
}
```

### 4. Production Settings
Set `isTesting: false` in all ad options in `admobService.ts`

### 5. Build for Mobile
```bash
npm run build
npx cap sync
npx cap open android  # or ios
```

## How It Works

- **Free Users**: Automatically see banner ads at bottom of screen
- **Premium Users**: No ads shown (ads are hidden/removed)
- **Reward Ads**: Users can watch for bonus features
- **Interstitial Ads**: Can be triggered on specific actions
- **Development Mode**: Test controls visible only in development

## Features Included

- ✅ Automatic banner display for free users
- ✅ Banner hiding for premium users  
- ✅ Reward ad system with callbacks
- ✅ Interstitial ad support
- ✅ Development test controls
- ✅ Platform detection (Android/iOS)
- ✅ Error handling and logging

The AdMob integration is now ready for testing and production use!