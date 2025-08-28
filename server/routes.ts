import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertReminderSchema, updateReminderSchema, type Reminder, type User } from "@shared/schema";
import { reminderService } from "./services/reminderService";
import { notificationService } from "./services/notificationService";
import { premiumQuotesService } from "./services/premiumQuotesService";
import { isUserPremium } from "./utils/premiumCheck";
import crypto from 'crypto'; // Import crypto module for UUID generation

import { DeepSeekService } from './services/deepseekService';

const deepseekService = new DeepSeekService();


export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Initialize storage (will auto-detect database availability)
  await storage.seedRudePhrases();

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User settings routes
  app.patch('/api/user/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updates = req.body;
      const user = await storage.updateUser(userId, updates);
      res.json(user);
    } catch (error) {
      console.error("Error updating user settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // Settings route (alias for user settings)
  app.put('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updates = req.body;

      // Ensure notification settings are properly stored
      const allowedSettings = [
        'firstName', 'lastName', 'timezone', 'darkMode', 'simplifiedInterface',
        'browserNotifications', 'voiceNotifications', 'emailNotifications', 'emailSummary',
        'snoozeTime', 'reminderFrequency', 'ethnicity', 'gender', 
        'ethnicitySpecificQuotes', 'genderSpecificReminders'
      ];

      const sanitizedUpdates = Object.keys(updates)
        .filter(key => allowedSettings.includes(key))
        .reduce((obj, key) => {
          obj[key] = updates[key];
          return obj;
        }, {} as any);

      // Update user in storage
      await storage.updateUser(userId, sanitizedUpdates);

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ 
        error: "Failed to update settings",
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Reminder routes
  app.get('/api/reminders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reminders = await storage.getReminders(userId);
      res.json(reminders);
    } catch (error) {
      console.error("Error fetching reminders:", error);
      res.status(500).json({ message: "Failed to fetch reminders" });
    }
  });

  // Create a new reminder
  app.post('/api/reminders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const {
        originalMessage,
        context,
        scheduledFor,
        rudenessLevel,
        voiceCharacter,
        attachments,
        motivationalQuote,
        selectedDays,
        isMultiDay
      } = req.body;

      // Use user's notification settings from their profile
      const browserNotification = user.browserNotifications !== false; // Default to true if not set
      const voiceNotification = user.voiceNotifications || false;
      const emailNotification = user.emailNotifications || false;

      // Handle multi-day reminders
      if (isMultiDay && selectedDays && selectedDays.length > 0) {
        const createdReminders = [];

        for (const day of selectedDays) {
          // Calculate the next occurrence of this day
          const nextOccurrence = getNextDayOccurrence(day, scheduledFor);

          const reminderDataForDay = {
            originalMessage: originalMessage,
            context: context,
            scheduledFor: nextOccurrence.toISOString(),
            rudenessLevel: rudenessLevel,
            voiceCharacter: voiceCharacter,
            attachments: attachments,
            motivationalQuote: motivationalQuote,
            isMultiDay: false, // Individual reminders are not multi-day
            selectedDays: [], // Clear selected days for individual reminders
            title: `${originalMessage} (${day})` // Add day to title for clarity
          };

          // Create base reminder for the specific day
          let reminder = {
            id: crypto.randomUUID() as `${string}-${string}-${string}-${string}-${string}`,
            userId,
            title: reminderDataForDay.title,
            originalMessage: reminderDataForDay.originalMessage,
            context: reminderDataForDay.context || null,
            rudeMessage: "", // Will be generated by AI
            rudenessLevel: reminderDataForDay.rudenessLevel,
            scheduledFor: new Date(reminderDataForDay.scheduledFor),
            browserNotification,
            voiceNotification,
            emailNotification,
            voiceCharacter: reminderDataForDay.voiceCharacter || "default",
            attachments: reminderDataForDay.attachments || [],
            motivationalQuote: reminderDataForDay.motivationalQuote || "",
            selectedDays: [], // Individual reminders don't have selectedDays
            isMultiDay: false,
            daySpecificMessages: null,
            completed: false,
            completedAt: null,
            responses: [] as string[],
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Auto-generate motivational quote if none provided but context is available
          if (!reminder.motivationalQuote && reminder.context) {
            try {
              // Check if user has cultural preferences
              if (user.ethnicitySpecificQuotes && user.ethnicity) {
                // Generate cultural quote (this would use CulturalQuotesService logic)
                const culturalCategories = ['work', 'family', 'health', 'learning'];
                if (culturalCategories.includes(reminder.context)) {
                  // Simulate cultural quote generation - in real implementation this would use the service
                  const sampleCulturalQuotes = {
                    work: "Hard work is the foundation of success - African Proverb",
                    family: "Family is the anchor that holds us through storms - Latin Proverb", 
                    health: "A healthy body is a guest-chamber for the soul - Francis Bacon",
                    learning: "Education is the passport to the future - Malcolm X"
                  };
                  reminder.motivationalQuote = sampleCulturalQuotes[reminder.context as keyof typeof sampleCulturalQuotes] || "";
                }
              }

              // Fallback to general motivational quotes if no cultural quote generated
              if (!reminder.motivationalQuote) {
                // Import and use quotes service
                const { QuotesService } = await import('../client/src/services/quotesService');

                // Map context to quote categories
                const contextToCategory: Record<string, string> = {
                  work: 'entrepreneurs',
                  family: 'motivational', 
                  health: 'sports',
                  meditation: 'motivational',
                  learning: 'scientists',
                  cooking: 'motivational',
                  household: 'motivational',
                  finance: 'entrepreneurs',
                  entertainment: 'motivational'
                };

                const category = contextToCategory[reminder.context] || 'motivational';
                const quote = QuotesService.getRandomQuote(category);
                if (quote) {
                  reminder.motivationalQuote = QuotesService.formatQuote(quote);
                }
              }
            } catch (error) {
              console.error("Error generating motivational quote:", error);
              // Continue without quote if generation fails
            }
          }

          // Generate AI response automatically during form submission
          try {
            const generatedReminder = await reminderService.generateReminderResponse(reminder);
            reminder = { ...reminder, ...generatedReminder };
          } catch (error) {
            console.error("Error generating AI response:", error);
            // Fallback to basic message if AI generation fails
            reminder.rudeMessage = `Time to ${reminder.originalMessage}!`;
            reminder.responses = [`Time to ${reminder.originalMessage}!`];

          }

          // Update timestamp since everything is generated
          reminder.updatedAt = new Date();

          console.log("Created reminder with auto-generated content:", {
            id: reminder.id,
            motivationalQuote: reminder.motivationalQuote,
            rudeMessage: reminder.rudeMessage,
            responses: reminder.responses
          });

          await storage.createReminder(userId, reminder);
          reminderService.scheduleReminder(reminder);
          createdReminders.push(reminder);
        }

        res.json({
          success: true,
          count: createdReminders.length,
          reminders: createdReminders
        });

      } else {
        // Handle single reminders as before
        // Create base reminder
        let reminder = {
          id: crypto.randomUUID() as `${string}-${string}-${string}-${string}-${string}`,
          userId,
          title: originalMessage,
          originalMessage,
          context: context || null,
          rudeMessage: "", // Will be generated by AI
          rudenessLevel,
          scheduledFor: new Date(scheduledFor),
          browserNotification,
          voiceNotification,
          emailNotification,
          voiceCharacter: voiceCharacter || "default",
          attachments: attachments || [],
          motivationalQuote: motivationalQuote || "",
          selectedDays: [],
          isMultiDay: false,
          daySpecificMessages: null,
          completed: false,
          completedAt: null,
          responses: [] as string[],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Auto-generate motivational quote if none provided but context is available
        if (!reminder.motivationalQuote && context) {
          try {
            // Check if user has cultural preferences
            if (user.ethnicitySpecificQuotes && user.ethnicity) {
              // Generate cultural quote (this would use CulturalQuotesService logic)
              const culturalCategories = ['work', 'family', 'health', 'learning'];
              if (culturalCategories.includes(context)) {
                // Simulate cultural quote generation - in real implementation this would use the service
                const sampleCulturalQuotes = {
                  work: "Hard work is the foundation of success - African Proverb",
                  family: "Family is the anchor that holds us through storms - Latin Proverb", 
                  health: "A healthy body is a guest-chamber for the soul - Francis Bacon",
                  learning: "Education is the passport to the future - Malcolm X"
                };
                reminder.motivationalQuote = sampleCulturalQuotes[context as keyof typeof sampleCulturalQuotes] || "";
              }
            }

            // Fallback to general motivational quotes if no cultural quote generated
            if (!reminder.motivationalQuote) {
              // Import and use quotes service
              const { QuotesService } = await import('../client/src/services/quotesService');

              // Map context to quote categories
              const contextToCategory: Record<string, string> = {
                work: 'entrepreneurs',
                family: 'motivational', 
                health: 'sports',
                meditation: 'motivational',
                learning: 'scientists',
                cooking: 'motivational',
                household: 'motivational',
                finance: 'entrepreneurs',
                entertainment: 'motivational'
              };

              const category = contextToCategory[context] || 'motivational';
              const quote = QuotesService.getRandomQuote(category);
              if (quote) {
                reminder.motivationalQuote = QuotesService.formatQuote(quote);
              }
            }
          } catch (error) {
            console.error("Error generating motivational quote:", error);
            // Continue without quote if generation fails
          }
        }

        // Generate AI response automatically during form submission
        try {
          const generatedReminder = await reminderService.generateReminderResponse(reminder);
          reminder = { ...reminder, ...generatedReminder };
        } catch (error) {
          console.error("Error generating AI response:", error);
          // Fallback to basic message if AI generation fails
          reminder.rudeMessage = `Time to ${originalMessage}!`;
          reminder.responses = [`Time to ${originalMessage}!`];

        }

        // Update timestamp since everything is generated
        reminder.updatedAt = new Date();

        console.log("Created reminder with auto-generated content:", {
          id: reminder.id,
          motivationalQuote: reminder.motivationalQuote,
          rudeMessage: reminder.rudeMessage,
          responses: reminder.responses
        });

        await storage.createReminder(userId, reminder);
        reminderService.scheduleReminder(reminder);

        res.json(reminder);
      }
    } catch (error) {
      console.error("Error creating reminder:", error);
      res.status(500).json({ message: "Failed to create reminder" });
    }
  });

  app.get('/api/reminders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reminder = await storage.getReminder(req.params.id, userId);
      if (!reminder) {
        return res.status(404).json({ message: "Reminder not found" });
      }
      res.json(reminder);
    } catch (error) {
      console.error("Error fetching reminder:", error);
      res.status(500).json({ message: "Failed to fetch reminder" });
    }
  });

  app.patch('/api/reminders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = updateReminderSchema.parse(req.body);
      const reminder = await storage.updateReminder(req.params.id, userId, validatedData);

      // Reschedule if needed
      reminderService.unscheduleReminder(req.params.id);
      if (!reminder.completed) {
        reminderService.scheduleReminder(reminder);
      }

      res.json(reminder);
    } catch (error) {
      console.error("Error updating reminder:", error);
      res.status(400).json({ message: "Failed to update reminder" });
    }
  });

  // Generate AI response for existing reminder
  app.post('/api/reminders/:id/generate-response', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reminder = await storage.getReminder(req.params.id, userId);
      if (!reminder) {
        return res.status(404).json({ message: "Reminder not found" });
      }

      // Generate AI response
      const updatedReminder = await reminderService.generateReminderResponse(reminder);

      // Update the reminder in storage
      await storage.updateReminder(req.params.id, userId, updatedReminder);

      res.json(updatedReminder);
    } catch (error) {
      console.error("Error generating response for existing reminder:", error);
      res.status(500).json({ message: "Failed to generate response" });
    }
  });

  // Get additional responses for a reminder
  app.get('/api/reminders/:id/more-responses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reminder = await storage.getReminder(req.params.id, userId);

      if (!reminder) {
        return res.status(404).json({ message: "Reminder not found" });
      }

      const { smartResponseService } = await import('./services/smartResponseService');

      // Force refresh to ensure new responses
      const forceRefresh = req.query.refresh === 'true';

      // Generate fresh responses with timestamp for uniqueness
      const personalizedResponses = await smartResponseService.getPersonalizedResponse(reminder, forceRefresh);
      const contextualRemarks = await smartResponseService.getContextualRemarks(reminder);

      // Get additional rude phrases for variety with timestamp shuffling
      const phrases = await storage.getRudePhrasesForLevel(reminder.rudenessLevel);
      const timestamp = Date.now();
      const additionalResponses = phrases
        .sort(() => 0.5 - Math.random() + (timestamp % 1000) / 10000)
        .slice(0, 5)
        .map(phrase => `${reminder.originalMessage} ${phrase.phrase} (Generated at ${new Date().toLocaleTimeString()})`);

      res.json({
        personalizedResponses,
        contextualRemarks,
        additionalResponses,
        totalCount: personalizedResponses.length + contextualRemarks.length + additionalResponses.length,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error getting more responses:", error);
      res.status(500).json({ message: "Failed to get more responses" });
    }
  });

  // Generate AI response for a specific reminder (Premium feature)
  app.post('/api/reminders/:id/generate-response', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reminder = await storage.getReminder(req.params.id, userId);
      if (!reminder) {
        return res.status(404).json({ message: "Reminder not found" });
      }

      // Generate AI response using the reminder service
      const updatedReminder = await reminderService.generateReminderResponse(reminder); 

      // Update the reminder in storage with the new AI response
      const finalReminder = {
        ...reminder,
        ...updatedReminder,
        updatedAt: new Date()
      };

      await storage.updateReminder(req.params.id, userId, finalReminder);

      res.json({
        ...updatedReminder,
        isPremium: true, // Assuming this endpoint is for premium users
        aiGenerated: true,
        source: 'ai-deepseek' 
      });
    } catch (error) {
      console.error("Error generating AI response:", error);
      res.status(500).json({ message: "Failed to generate AI response" });
    }
  });


  app.delete('/api/reminders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteReminder(req.params.id, userId);
      reminderService.unscheduleReminder(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting reminder:", error);
      res.status(500).json({ message: "Failed to delete reminder" });
    }
  });

  app.patch('/api/reminders/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reminder = await storage.completeReminder(req.params.id, userId);
      reminderService.unscheduleReminder(req.params.id);
      res.json(reminder);
    } catch (error) {
      console.error("Error completing reminder:", error);
      res.status(500).json({ message: "Failed to complete reminder" });
    }
  });

  // Statistics routes
  app.get('/api/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Rude phrases routes
  app.get('/api/phrases/:level', async (req, res) => {
    try {
      const level = parseInt(req.params.level);
      if (level < 1 || level > 5) {
        return res.status(400).json({ message: "Level must be between 1 and 5" });
      }
      const phrases = await storage.getRudePhrasesForLevel(level);
      res.json(phrases);
    } catch (error) {
      console.error("Error fetching phrases:", error);
      res.status(500).json({ message: "Failed to fetch phrases" });
    }
  });

  // Voice characters endpoint
  app.get('/api/voices', async (req, res) => {
    try {
      const voiceCharacters = [
        {
          id: "default",
          name: "Scarlett",
          unrealId: "Scarlett",
          personality: "Professional and clear",
          testMessage: "This is Scarlett, your professional reminder voice."
        },
        {
          id: "drill-sergeant", 
          name: "Dan (Drill Sergeant)",
          unrealId: "Dan",
          personality: "Tough, no-nonsense military style",
          testMessage: "Listen up! Time to get moving and complete your mission!"
        },
        {
          id: "robot",
          name: "Will (AI Assistant)", 
          unrealId: "Will",
          personality: "Robotic, systematic approach",
          testMessage: "System notification: Your productivity levels require immediate attention."
        },
        {
          id: "british-butler",
          name: "Gerald (British Butler)",
          unrealId: "Amy", 
          personality: "Polite but passive-aggressive",
          testMessage: "I do beg your Pardon, but perhaps it's time you attended to your responsibilities."
        },
        {
          id: "mom",
          name: "Jane (Disappointed Mom)",
          unrealId: "Scarlett",
          personality: "Guilt-inducing maternal energy", 
          testMessage: "I'm not angry, I'm just disappointed. You know how much this means to me."
        },
        {
          id: "confident-leader",
          name: "Will (Confident Leader)", 
          unrealId: "Will",
          personality: "Executive leadership style",
          testMessage: "Let's execute this plan efficiently and deliver results."
        }
      ];

      res.json(voiceCharacters);
    } catch (error) {
      console.error("Error fetching voice characters:", error);
      res.status(500).json({ message: "Failed to fetch voice characters" });
    }
  });

  // Test voice endpoint
  app.post('/api/voices/test', async (req, res) => {
    try {
      const { voiceCharacter, testMessage } = req.body;

      if (!voiceCharacter) {
        return res.status(400).json({ message: "Voice character is required" });
      }

      const voiceSettings = notificationService.getBrowserVoiceSettings(voiceCharacter);
      const message = testMessage || "This is a test of your selected voice character.";
      const speechData = notificationService.generateBrowserSpeech(message, voiceCharacter);

      res.json({ 
        speechData, 
        voiceSettings, 
        message,
        useBrowserSpeech: true 
      });
    } catch (error) {
      console.error("Error testing voice:", error);
      res.status(500).json({ message: "Failed to test voice" });
    }
  });

  // Test speech endpoint for DevPreview compatibility  
  app.post('/api/test-speech', async (req, res) => {
    try {
      const { text, voiceId } = req.body;

      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }

      // Use browser speech synthesis instead of external API
      const character = voiceId || "default";
      const voiceSettings = notificationService.getBrowserVoiceSettings(character);
      const speechData = notificationService.generateBrowserSpeech(text, character);

      res.json({
        speechData,
        voiceSettings,
        useBrowserSpeech: true
      });
    } catch (error) {
      console.error("Error in test speech:", error);
      res.status(500).json({ message: "Failed to generate speech" });
    }
  });

  // Developer preview endpoint
  app.post('/api/dev/preview', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
          const timeOfDay = now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening';

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

  // Premium Quotes API - Get personalized AI or cultural quotes
  app.get('/api/quotes/personalized', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { category, ethnicity, gender } = req.query;

      const context = {
        category: category as string,
        ethnicity: ethnicity as string,
        gender: gender as string
      };

      const quote = await premiumQuotesService.getPersonalizedQuote(userId, context);
      const isPremium = await isUserPremium(userId);

      res.json({
        quote,
        isPremium,
        source: isPremium ? 'ai-generated' : 'cultural-library',
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error getting personalized quote:", error);
      res.status(500).json({ message: "Failed to get personalized quote" });
    }
  });

  // Topic-specific quote routes
  app.get('/api/quotes/sports', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const quote = await premiumQuotesService.getPersonalizedQuote(userId, { category: 'sports' });
      const isPremium = await isUserPremium(userId);

      res.json({
        quote,
        isPremium,
        source: isPremium ? 'ai-generated' : 'cultural-library',
        category: 'sports',
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error getting sports quote:", error);
      res.status(500).json({ message: "Failed to get sports quote" });
    }
  });

  app.get('/api/quotes/historical', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const quote = await premiumQuotesService.getPersonalizedQuote(userId, { category: 'historical' });
      const isPremium = await isUserPremium(userId);

      res.json({
        quote,
        isPremium,
        source: isPremium ? 'ai-generated' : 'cultural-library',
        category: 'historical',
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error getting historical quote:", error);
      res.status(500).json({ message: "Failed to get historical quote" });
    }
  });

  app.get('/api/quotes/entrepreneurs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const quote = await premiumQuotesService.getPersonalizedQuote(userId, { category: 'entrepreneurs' });
      const isPremium = await isUserPremium(userId);

      res.json({
        quote,
        isPremium,
        source: isPremium ? 'ai-generated' : 'cultural-library',
        category: 'entrepreneurs',
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error getting entrepreneurs quote:", error);
      res.status(500).json({ message: "Failed to get entrepreneurs quote" });
    }
  });

  app.get('/api/quotes/scientists', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const quote = await premiumQuotesService.getPersonalizedQuote(userId, { category: 'scientists' });
      const isPremium = await isUserPremium(userId);

      res.json({
        quote,
        isPremium,
        source: isPremium ? 'ai-generated' : 'cultural-library',
        category: 'scientists',
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error getting scientists quote:", error);
      res.status(500).json({ message: "Failed to get scientists quote" });
    }
  });

  app.get('/api/quotes/motivational', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const quote = await premiumQuotesService.getPersonalizedQuote(userId, { category: 'motivational' });
      const isPremium = await isUserPremium(userId);

      res.json({
        quote,
        isPremium,
        source: isPremium ? 'ai-generated' : 'cultural-library',
        category: 'motivational',
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error getting motivational quote:", error);
      res.status(500).json({ message: "Failed to get motivational quote" });
    }
  });

  // Check premium status endpoint
  app.get('/api/user/premium-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const isPremium = await isUserPremium(userId);

      res.json({ 
        isPremium,
        features: {
          aiGeneratedResponses: isPremium,
          aiGeneratedQuotes: isPremium,
          unlimitedReminders: isPremium,
          advancedVoiceCharacters: isPremium
        }
      });
    } catch (error) {
      console.error("Error checking premium status:", error);
      res.status(500).json({ message: "Failed to check premium status" });
    }
  });

  // Developer endpoint to toggle premium status (only for development)
  app.post('/api/dev/toggle-premium', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.post('/api/test-deepseek', async (req, res) => {
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

  const httpServer = createServer(app);

  // WebSocket setup for real-time notifications
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');

    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });
  });

  // Set up notification service with WebSocket server
  notificationService.setWebSocketServer(wss);

  // Initialize reminder scheduling
  reminderService.initializeScheduler();

  return httpServer;
}

// Helper function to get next occurrence of a specific day
function getNextDayOccurrence(dayName: string, baseDateTime: string): Date {
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const targetDayIndex = dayNames.indexOf(dayName.toLowerCase());

  if (targetDayIndex === -1) {
    throw new Error(`Invalid day name: ${dayName}`);
  }

  const baseDate = new Date(baseDateTime);
  const currentDate = new Date();

  // Start from tomorrow to avoid scheduling for today if the base time has passed for today
  const startDate = new Date();
  if (baseDate.getHours() < currentDate.getHours() || (baseDate.getHours() === currentDate.getHours() && baseDate.getMinutes() <= currentDate.getMinutes())) {
    startDate.setDate(startDate.getDate() + 1);
  } else {
    startDate.setDate(startDate.getDate()); // Start from today if the base time is in the future for today
  }


  // Find the next occurrence of the target day
  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(startDate);
    checkDate.setDate(startDate.getDate() + i);

    if (checkDate.getDay() === targetDayIndex) {
      // Set the time from the base date
      checkDate.setHours(baseDate.getHours(), baseDate.getMinutes(), 0, 0);
      return checkDate;
    }
  }

  // Fallback (should not reach here if logic is correct)
  // This might happen if the baseDateTime is very far in the future and the logic needs refinement for edge cases
  // For now, return the original base date as a fallback, though this might not be ideal.
  console.warn(`Could not find next occurrence for ${dayName} starting from ${startDate}. Returning original base date.`);
  return baseDate;
}