# RevenueCat Web Paywall Setup Guide

## Overview
Your Rude Reminders app now has a RevenueCat Web SDK integration that displays a paywall when users click "Upgrade to Premium" or "Review Subscription Plans" in the Payment & Billing page.

## Setup Steps

### 1. Get Your RevenueCat Web API Key

1. Log in to your [RevenueCat Dashboard](https://app.revenuecat.com)
2. Go to your project
3. Navigate to **API Keys** section
4. Find or create your **Web API Key** (starts with `rcb_`)
5. Copy the key

### 2. Add Environment Variable

Add the RevenueCat Web API key to your Replit Secrets:

**Key:** `VITE_REVENUECAT_WEB_API_KEY`  
**Value:** `rcb_xxxxxxxxxxxxxxxxxx` (your Web API key)

> **Important:** The `VITE_` prefix is required for the frontend to access it!

### 3. Configure RevenueCat Dashboard

#### A. Connect Stripe
1. In RevenueCat Dashboard → **Integrations**
2. Connect your **Stripe** account
3. This handles web payments via Stripe Checkout

#### B. Create Products
1. Go to **Products** section
2. Create your subscription products:
   - **Monthly Plan:** $5.99/month
   - **Annual Plan:** $44.99/year
3. Map these to your Stripe products

#### C. Create Offerings
1. Go to **Offerings** section
2. Create a new offering (e.g., "Premium")
3. Add your monthly and annual products to the offering
4. Set as **Current Offering**

#### D. Create Paywall
1. Go to **Paywalls** section
2. Click **Create Paywall**
3. Choose a template or design from scratch
4. Customize the design, colors, and copy
5. Attach the paywall to your offering
6. Click **Publish Paywall**

### 4. Test Your Integration

1. Restart your Replit app
2. Log in as a free user
3. Go to Settings → Payment & Billing
4. Click "Upgrade to Premium" or "Choose Your Plan"
5. You should see:
   - The `/subscribe` page loads
   - RevenueCat paywall displays with your plans
   - Clicking a plan opens Stripe checkout

### 5. Verify Subscription Flow

After a test purchase:
1. RevenueCat sends webhook to your backend (`/api/webhooks/revenuecat`)
2. User's subscription status updates automatically
3. User gets premium access immediately
4. Check RevenueCat dashboard → **Customers** to verify

## How It Works

### Frontend (`/subscribe` page)
```typescript
// Initializes RevenueCat with user ID
await Purchases.configure(VITE_REVENUECAT_WEB_API_KEY, userId);

// Displays paywall in container
await Purchases.presentPaywall({
  htmlTarget: paywallContainer,
  offering: offerings.current
});
```

### Button Integration
All these buttons redirect to `/subscribe`:
- **Free Users:** "Upgrade to Premium" button
- **Free Users:** "Choose Your Plan" button  
- **Premium Users:** "Review Subscription Plans" button
- **Premium Users:** "Review All Plans" button

### Paywall Behavior
- **If API key configured:** Shows RevenueCat paywall with Stripe checkout
- **If not configured:** Shows instructions + mobile app download option
- **If already premium:** Shows "You're Already Premium!" message

## RevenueCat Features Used

✅ **Web SDK** - `@revenuecat/purchases-js` (already installed)  
✅ **Stripe Billing** - Handles payments and subscriptions  
✅ **Remote Paywalls** - Design in dashboard, no code changes needed  
✅ **Cross-Platform** - Same subscription works on web and mobile  
✅ **Webhooks** - Auto-updates user status via `/api/webhooks/revenuecat`

## Pricing Structure

**Your Current Pricing:**
- Monthly: $5.99/month USD
- Annual: $44.99/year USD (37% savings)

**RevenueCat + Stripe Fees:**
- RevenueCat: Free under $2,500 MTR, then 1%
- Stripe: 2.9% + $0.30 per transaction

## Troubleshooting

### "Configuration Needed" message shows
- Check that `VITE_REVENUECAT_WEB_API_KEY` is set in Replit Secrets
- Restart the app after adding the key
- Verify the key starts with `rcb_`

### Paywall doesn't load
- Check browser console for errors
- Verify you have a "Current Offering" in RevenueCat dashboard
- Make sure paywall is attached to the offering

### Purchase doesn't update subscription
- Check RevenueCat webhook logs in dashboard
- Verify `/api/webhooks/revenuecat` endpoint is working
- Check server logs for webhook processing errors

### "No offerings available" error
- Make sure you've created an offering in RevenueCat dashboard
- Set it as the "Current Offering"
- Wait a few minutes for cache to update

## Testing Tips

1. **Test Mode:** RevenueCat and Stripe have test modes - use test API keys during development
2. **Test Cards:** Use Stripe test cards (4242 4242 4242 4242)
3. **Refunds:** Test subscriptions can be refunded through Stripe dashboard
4. **Webhooks:** Use RevenueCat dashboard to view webhook delivery logs

## Mobile App Integration

The same RevenueCat subscription works across platforms:
- **Web:** Stripe checkout via Web SDK (this integration)
- **iOS:** Apple In-App Purchase
- **Android:** Google Play Billing

Users can subscribe on any platform and access premium on all platforms!

## Documentation Links

- [RevenueCat Web SDK Docs](https://www.revenuecat.com/docs/web/web-billing/web-sdk)
- [Creating Paywalls](https://www.revenuecat.com/docs/tools/paywalls/creating-paywalls)
- [Stripe Integration](https://www.revenuecat.com/docs/integrations/stripe)
- [Webhook Setup](https://www.revenuecat.com/docs/integrations/webhooks)

---

**Last Updated:** November 8, 2025  
**Integration Status:** ✅ Complete - Just needs API key configuration
