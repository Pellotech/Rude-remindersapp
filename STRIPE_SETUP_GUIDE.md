# Stripe API Keys Setup Guide

This guide helps you properly configure Stripe API keys for the Rude Reminders app.

## Required Environment Variables

### 1. Backend (Server-side)
- **Variable**: `STRIPE_SECRET_KEY`
- **Format**: `sk_test_...` (test) or `sk_live_...` (live)
- **Used for**: Payment processing, subscription management
- **Access**: Server-side only (never exposed to frontend)

### 2. Frontend (Client-side)
- **Variable**: `VITE_STRIPE_PUBLISHABLE_KEY`
- **Format**: `pk_test_...` (test) or `pk_live_...` (live)
- **Used for**: Stripe Elements, payment forms
- **Access**: Frontend safe (can be publicly visible)

## Getting Your Keys

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com/
2. **Navigate to**: Developers → API Keys
3. **Copy both keys**:
   - **Secret key** → `STRIPE_SECRET_KEY`
   - **Publishable key** → `VITE_STRIPE_PUBLISHABLE_KEY`

## Adding Keys to Replit

### Option 1: Replit Secrets (Recommended)
1. Click **Tools** → **Secrets**
2. Add both environment variables:
   - `STRIPE_SECRET_KEY`: `sk_test_your_secret_key_here`
   - `VITE_STRIPE_PUBLISHABLE_KEY`: `pk_test_your_publishable_key_here`

### Option 2: .env File (Local Development)
Create a `.env` file in project root:
```bash
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

## Verification

Run the verification script to check your setup:
```bash
node scripts/verify-stripe-keys.js
```

This will:
- ✅ Check if both keys exist
- ✅ Validate key formats
- ✅ Ensure test/live environments match
- ✅ Test API connectivity

## Usage in Code

### Backend (Express Routes)
```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create subscription
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: priceId }]
});
```

### Frontend (React Components)
```javascript
// Stripe Elements
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// In component
const stripe = useStripe();
const elements = useElements();
```

## Environment Matching

**Important**: Both keys must be from the same environment:
- **Test Mode**: `sk_test_...` + `pk_test_...`
- **Live Mode**: `sk_live_...` + `pk_live_...`

**Never mix test and live keys!**

## Troubleshooting

### "Stripe key not found" Error
1. Check if environment variables are set
2. Restart the application after adding keys
3. Run verification script to confirm

### "Invalid key format" Error
- Ensure secret key starts with `sk_`
- Ensure publishable key starts with `pk_`
- Check for extra spaces or characters

### Environment Mismatch
- Both keys must be test OR both must be live
- Check Stripe dashboard for correct key pairs

## Security Notes

- **Never commit** `.env` files to version control
- **Never expose** secret keys in frontend code
- **Use test keys** for development
- **Switch to live keys** only for production

## Current App Configuration

The Rude Reminders app uses Stripe for:
- ✅ Monthly subscriptions ($6/month)
- ✅ Yearly subscriptions ($48/year)
- ✅ Subscription management
- ✅ Payment processing
- ✅ Premium feature access

Your keys are properly configured when the verification script shows all green checkmarks! ✅