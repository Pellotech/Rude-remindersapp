// Developer & testing tools: previews, premium toggle, DeepSeek test, test email
import type { Express } from "express";
import { storage } from "../storage";
import { zonedHour } from "../utils/userTime";
import { type Reminder } from "@shared/schema";
import { reminderService } from "../services/reminderService";
import { notificationService } from "../services/notificationService";
import { isUserPremium } from "../utils/premiumCheck";
import crypto from "crypto";
import { getAuthUserId, isAdmin, requireDevSession, deepseekService, isAuthenticated, signedInUserId } from "./shared";

export function registerDevToolsRoutes(app: Express) {
  // Developer preview endpoint
  app.post('/api/dev/preview', isAuthenticated, async (req: any, res) => {
    try {
      const userId = signedInUserId(req);
      const { task, rudenessLevel, voiceCharacter, category } = req.body;

      console.log(`Generating preview for user ${userId}:`, { task, rudenessLevel, voiceCharacter, category });

      // Create a sample reminder object
      const sampleReminder: Partial<Reminder> = {
        id: ('preview-' + Date.now()) as `${string}-${string}-${string}-${string}-${string}`,
        userId,
        title: task || 'Sample Task',
        originalMessage: task || 'Sample Task',
        rudeMessage: '',
        responses: [],
        scheduledFor: new Date(),
        rudenessLevel: rudenessLevel || 3,
        voiceCharacter: voiceCharacter || 'default',
        motivationalQuote: '',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Generate AI responses for premium users, templates for free users
      const isPremium = await isUserPremium(userId);

      if (isPremium) {
        try {
          const user = await storage.getUser(userId);
          const now = new Date();
          const hourNow = zonedHour(now); // user's local hour, not the server's
          const timeOfDay = hourNow < 12 ? 'morning' : hourNow < 17 ? 'afternoon' : 'evening';

          const context = {
            task: sampleReminder.title!,
            category: category || 'general',
            rudenessLevel: sampleReminder.rudenessLevel!,
            gender: user?.gender || undefined,
            culturalBackground: user?.ethnicity || undefined,
            timeOfDay
          };

          console.log(`Premium user ${userId} - generating AI responses for preview`);
          const responses = await deepseekService.generatePersonalizedResponses(context, 4);
          sampleReminder.responses = responses;
          sampleReminder.rudeMessage = responses[0] || `Time to ${task}!`;
          console.log(`Premium preview - using AI response: "${sampleReminder.rudeMessage}"`);
        } catch (error) {
          console.error('AI generation failed for preview, using fallback:', error);
          // Fallback to template
          const fallbackMessage = `Time to ${task}! Get moving!`;
          sampleReminder.rudeMessage = fallbackMessage;
          sampleReminder.responses = [fallbackMessage];
          console.log(`Premium preview fallback - using template: "${fallbackMessage}"`);
        }
      } else {
        // Free user - use template
        const templateMessage = `Time to ${task}! Let's get this done!`;
        sampleReminder.rudeMessage = templateMessage;
        sampleReminder.responses = [templateMessage];
        console.log(`Free user preview - using template: "${templateMessage}"`);
      }

      // Generate speech data for voice preview using the AI-generated message
      const speechData = notificationService.generateBrowserSpeech(
        sampleReminder.rudeMessage || 'Time to work!',
        sampleReminder.voiceCharacter || 'default'
      );

      const voiceSettings = notificationService.getBrowserVoiceSettings(sampleReminder.voiceCharacter || 'default');

      const previewData = {
        reminder: sampleReminder,
        speechData,
        voiceSettings,
        useBrowserSpeech: true,
        isPremium, // Add premium status to preview data
        notifications: {
          browser: {
            title: `Reminder: ${sampleReminder.title}`,
            body: sampleReminder.motivationalQuote 
              ? `${sampleReminder.rudeMessage}\n\n💪 ${sampleReminder.motivationalQuote}`
              : sampleReminder.rudeMessage,
            icon: '/favicon.ico'
          },
          voice: {
            text: sampleReminder.rudeMessage,
            character: sampleReminder.voiceCharacter,
            speechData,
            voiceSettings
          }
        }
      };

      res.json(previewData);
    } catch (error) {
      console.error("Error generating preview:", error);
      res.status(500).json({ 
        message: "Failed to generate preview",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Developer endpoint to toggle premium status (only for development)
  app.post('/api/dev/toggle-premium', isAuthenticated, async (req: any, res) => {
    try {
      // Security: dev-only endpoint — must never work in production
      if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ message: 'Not found' });
      }
      const userId = signedInUserId(req);
      const { isPremium } = req.body;

      // Update user subscription status
      const updates = {
        subscriptionPlan: isPremium ? 'premium' : 'free',
        subscriptionStatus: isPremium ? 'active' : 'free',
        subscriptionEndsAt: isPremium ? new Date('2025-12-31') : null
      };

      const updatedUser = await storage.updateUser(userId, updates);

      console.log(`Developer toggle: User ${userId} switched to ${updates.subscriptionPlan} plan`);

      res.json({
        success: true,
        subscriptionPlan: updates.subscriptionPlan,
        subscriptionStatus: updates.subscriptionStatus,
        isPremium
      });
    } catch (error) {
      console.error("Error toggling premium status:", error);
      res.status(500).json({ message: "Failed to toggle premium status" });
    }
  });

  // Test DeepSeek API integration
  app.post('/api/test-deepseek', isAuthenticated, isAdmin, requireDevSession, async (req, res) => {
    try {
      const testContext = {
        task: req.body.task || 'study for exam',
        category: req.body.category || 'learning',
        rudenessLevel: req.body.rudenessLevel || 3,
        timeOfDay: 'evening'
      };

      const responses = await deepseekService.generatePersonalizedResponses(testContext, 3);

      res.json({ 
        success: true,
        context: testContext,
        responses,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('DeepSeek test failed:', error);
      res.status(500).json({ 
        success: false, 
        error: (error as Error).message,
        fallbackMessage: 'DeepSeek API integration failed - check API key and network connection'
      });
    }
  });

  // Generate quick AI preview for testing (doesn't save to database)
  app.post('/api/preview-reminder', isAuthenticated, async (req: any, res) => {
    try {
      const userId = signedInUserId(req);
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const {
        originalMessage,
        context,
        rudenessLevel,
        voiceCharacter
      } = req.body;

      // Create a temporary reminder object for AI generation
      const tempReminder = {
        id: crypto.randomUUID() as `${string}-${string}-${string}-${string}-${string}`,
        userId,
        title: originalMessage,
        originalMessage,
        context: context || null,
        rudeMessage: "",
        rudenessLevel: rudenessLevel || 3,
        scheduledFor: new Date(),
        browserNotification: true,
        voiceNotification: false,
        emailNotification: false,
        voiceCharacter: voiceCharacter || "default",
        attachments: [],
        motivationalQuote: "",
        selectedDays: [],
        isMultiDay: false,
        daySpecificMessages: null,
        completed: false,
        completedAt: null,
        notAccomplished: false,
        notAccomplishedAt: null,
        loggedAt: null,
        hitConfirmed: false,
        hitComment: null,
        hitAt: null,
        responses: [] as string[],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Generate AI response
      const generatedReminder = await reminderService.generateReminderResponse(tempReminder);

      res.json({
        success: true,
        rudeMessage: generatedReminder.rudeMessage,
        responses: generatedReminder.responses || []
      });
    } catch (error) {
      console.error('Error generating preview:', error);
      res.status(500).json({ 
        success: false, 
        error: (error as Error).message,
        rudeMessage: `Time to ${req.body.originalMessage}!`
      });
    }
  });

  // Test email endpoint - Add this route for manual testing
  // Admin-only: otherwise anyone could make the server send email to any address
  app.get('/api/test-email', isAuthenticated, isAdmin, requireDevSession, async (req, res) => {
    try {
      const testEmail = req.query.email as string || 'ruderemindersinfo@gmail.com';
      const success = await notificationService.sendTestEmail(testEmail);

      if (success) {
        res.json({ 
          message: `✅ Test email sent successfully to ${testEmail}`,
          timestamp: new Date().toISOString(),
          recipient: testEmail
        });
      } else {
        res.status(500).json({ 
          message: `❌ Failed to send test email to ${testEmail} - check email configuration`,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Test email error:', error);
      res.status(500).json({ 
        message: '❌ Test email failed', 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });
}
