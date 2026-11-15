// Subscriptions (RevenueCat): premium status, customer info, sync, cancel, webhook
import type { Express } from "express";
import { storage } from "../storage";
import { log as slog } from "../utils/logger";
import { getAuthUserId, isAuthenticated } from "./shared";

export function registerSubscriptionsRoutes(app: Express) {
  // Check premium status endpoint
  app.get('/api/user/premium-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      const { isPremium, user, source } = await import('../utils/premiumCheck').then(m => m.getUserPremiumStatus(userId));

      res.json({ 
        isPremium,
        source, // 'subscription', 'whitelist', 'free', etc.
        features: {
          aiGeneratedResponses: isPremium,
          aiGeneratedQuotes: isPremium,
          monthlyReminderLimit: isPremium ? 120 : 15,
          advancedVoiceCharacters: isPremium
        }
      });
    } catch (error) {
      console.error("Error checking premium status:", error);
      res.status(500).json({ message: "Failed to check premium status" });
    }
  });

  // RevenueCat subscription endpoints

  // RevenueCat customer info route
  app.get('/api/customer-info', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Return stored RevenueCat customer info or default free status
      const customerInfo = {
        userId: userId,
        entitlements: user.revenueCatEntitlements || {},
        subscriptionStatus: user.subscriptionStatus || 'free',
        subscriptionPlan: user.subscriptionPlan || 'free',
        subscriptionEndsAt: user.subscriptionEndsAt
      };

      res.json(customerInfo);
    } catch (error: any) {
      console.error('Error fetching customer info:', error);
      res.status(500).json({ error: { message: error.message } });
    }
  });

  // Sync subscription status from mobile app after successful purchase
  // Verifies entitlements directly with RevenueCat — never trusts the client payload
  app.post('/api/sync-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
      }

      // Verify entitlements directly from RevenueCat — never trust the client
      const rcResponse = await fetch(
        `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.REVENUECAT_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!rcResponse.ok) {
        slog.error('subscription_sync_failed', {
          userId,
          source: 'revenuecat',
          status: rcResponse.status,
        });
        return res.status(402).json({ success: false, message: 'Could not verify subscription' });
      }

      const rcData = await rcResponse.json();
      const entitlements = rcData?.subscriber?.entitlements || {};
      const isPremium = Object.values(entitlements).some(
        (e: any) => e.expires_date === null || new Date(e.expires_date) > new Date()
      );

      if (isPremium) {
        await storage.updateUser(userId, {
          subscriptionStatus: 'active',
          subscriptionPlan: 'premium',
        });
        slog.info('subscription_synced', {
          userId,
          plan: 'premium',
          source: 'revenuecat',
        });
        res.json({ success: true, message: 'Subscription verified and synced' });
      } else {
        slog.info('subscription_synced', {
          userId,
          plan: 'free',
          source: 'revenuecat',
          reason: 'no_active_entitlements',
        });
        res.json({ success: false, message: 'No active entitlements found' });
      }
    } catch (error: any) {
      console.error('Error syncing subscription:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Note: RevenueCat subscriptions are cancelled through the mobile app stores
  // This route handles subscription status updates from webhooks
  app.post('/api/cancel-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      const user = await storage.getUser(userId);

      if (!user || user.subscriptionStatus === 'free') {
        return res.status(404).json({ message: 'No active subscription found' });
      }

      // For RevenueCat, users cancel through app store settings
      // We just return instructions (iOS-focused for App Store compliance)
      res.json({
        message: 'To cancel your subscription, please use your device settings:\\n\\niOS: Settings > Your Name > Subscriptions',
        platform: 'mobile_store'
      });
    } catch (error: any) {
      console.error('Error processing cancellation request:', error);
      res.status(400).json({ error: { message: error.message } });
    }
  });

  // RevenueCat webhook handler
  app.post('/api/webhooks/revenuecat', async (req, res) => {
    // Verify RevenueCat webhook authorization header
    const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
    if (webhookSecret) {
      const authHeader = req.headers['authorization'];
      if (!authHeader || authHeader !== webhookSecret) {
        console.warn('[Webhook] Unauthorized request rejected — bad or missing auth header');
        return res.status(401).send('Unauthorized');
      }
    }

    const rcEvent = req.body;

    try {
      if (!rcEvent || !rcEvent.event || !rcEvent.event.app_user_id) {
        return res.status(400).send('Invalid RevenueCat webhook payload');
      }
    } catch (err: any) {
      console.error('Webhook payload validation failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      const eventType = rcEvent.event.type;
      const appUserId = rcEvent.event.app_user_id;
      
      switch (eventType) {
        case 'INITIAL_PURCHASE':
        case 'RENEWAL':
        case 'PRODUCT_CHANGE':
          // User has active subscription
          const entitlements = rcEvent.event.entitlements || {};
          await storage.updateUser(appUserId, {
            subscriptionStatus: 'active',
            subscriptionPlan: 'premium',
            revenueCatEntitlements: entitlements,
            subscriptionEndsAt: null
          });
          break;
          
        case 'CANCELLATION':
        case 'EXPIRATION':
          // Subscription ended
          await storage.updateUser(appUserId, {
            subscriptionStatus: 'canceled',
            subscriptionPlan: 'free',
            revenueCatEntitlements: {},
            subscriptionEndsAt: new Date()
          });
          break;

        default:
          console.log('Unhandled RevenueCat event type:', eventType);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });
}
