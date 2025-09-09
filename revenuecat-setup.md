# RevenueCat Setup Instructions

## Overview
This guide walks you through setting up RevenueCat for subscription management in the Rude Reminders app.

## 1. Create RevenueCat Account
1. Go to [revenuecat.com](https://revenuecat.com) and create an account
2. Create a new project called "Rude Reminders"

## 2. Configure App Store Connect (iOS)
1. Set up your iOS app in App Store Connect
2. Create subscription products:
   - **Monthly Plan**: `premium_monthly` - $6.00/month
   - **Yearly Plan**: `premium_yearly` - $48.00/year
3. Add these product IDs to your RevenueCat project

## 3. Configure Google Play Console (Android)
1. Set up your Android app in Google Play Console
2. Create subscription products:
   - **Monthly Plan**: `premium_monthly` - $6.00/month  
   - **Yearly Plan**: `premium_yearly` - $48.00/year
3. Add these product IDs to your RevenueCat project

## 4. Get RevenueCat API Keys
1. In RevenueCat dashboard, go to your project settings
2. Get your **Public API Keys**:
   - iOS Public API Key
   - Android Public API Key
3. Get your **Secret API Key** for webhooks

## 5. Update Mobile App Configuration

### iOS (`ios/App/App/Info.plist`):
Replace `YOUR_REVENUECAT_IOS_API_KEY_HERE` with your iOS Public API Key

### Android (`android/app/src/main/AndroidManifest.xml`):
Replace `YOUR_REVENUECAT_ANDROID_API_KEY_HERE` with your Android Public API Key

## 6. Update Environment Variables
Add to your `.env` file:
```
REVENUECAT_SECRET_KEY=your_secret_api_key_here
```

## 7. Configure Webhooks
1. In RevenueCat dashboard, go to Integrations → Webhooks
2. Add webhook URL: `https://your-app-domain.replit.app/api/webhooks/revenuecat`
3. Enable these events:
   - Initial Purchase
   - Renewal
   - Cancellation  
   - Expiration
   - Product Change

## 8. Test Subscription Flow
1. Build and deploy your mobile apps
2. Test subscription purchases in sandbox mode
3. Verify webhooks are received correctly
4. Confirm user premium status updates in your database

## Important Notes
- RevenueCat handles all payment processing through app stores
- Subscriptions are managed in device settings (not in your app)
- Webhooks update subscription status in your backend
- Always test in sandbox mode before going live

## Subscription Products Setup

### Product Configuration in App Stores:
- **premium_monthly**: $6/month recurring
- **premium_yearly**: $48/year recurring (33% savings)

### RevenueCat Entitlements:
- **premium**: Grants access to all premium features
  - AI-generated responses
  - Cultural personalization
  - Unlimited reminders
  - Premium voice characters
  - Advanced features

## Support
- RevenueCat Documentation: https://docs.revenuecat.com
- App Store Connect: https://appstoreconnect.apple.com  
- Google Play Console: https://play.google.com/console