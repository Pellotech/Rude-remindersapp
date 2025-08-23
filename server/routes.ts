import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertReminderSchema, updateReminderSchema } from "@shared/schema";
import { reminderService } from "./services/reminderService";
import { notificationService } from "./services/notificationService";

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
      const user = await storage.updateUser(userId, updates);
      res.json(user);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
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

  app.post('/api/reminders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Convert string date to Date object before validation
      const requestData = {
        ...req.body,
        scheduledFor: new Date(req.body.scheduledFor)
      };

      console.log("Creating reminder with data:", {
        motivationalQuote: requestData.motivationalQuote,
        attachments: requestData.attachments,
        title: requestData.title
      });

      const validatedData = insertReminderSchema.parse(requestData);
      const reminder = await storage.createReminder(userId, validatedData);

      console.log("Created reminder:", {
        id: reminder.id,
        motivationalQuote: reminder.motivationalQuote,
        attachments: reminder.attachments
      });

      // Set initial status to 'generating' to show loading state
      const pendingReminder = { ...reminder, status: 'generating' as const };
      await storage.updateReminder(reminder.id, userId, { status: 'generating' });
      
      // Return the reminder immediately so user sees it's created
      res.status(201).json(pendingReminder);
      
      // Generate AI response in background
      process.nextTick(async () => {
        try {
          console.log(`Generating AI response for reminder: ${reminder.originalMessage}`);
          const updatedReminder = await reminderService.generateReminderResponse(reminder);
          
          // Update status to 'active' once AI response is ready
          const finalReminder = { ...updatedReminder, status: 'active' as const };
          await storage.updateReminder(reminder.id, userId, finalReminder);
          
          // Schedule the reminder
          reminderService.scheduleReminder(finalReminder);
          
          console.log(`AI response generated successfully for reminder: ${reminder.id}`);
        } catch (error) {
          console.error("Error generating AI response during creation:", error);
          // Set status to 'active' even if AI generation fails, with fallback response
          await storage.updateReminder(reminder.id, userId, { 
            status: 'active',
            rudeMessage: `Time to ${reminder.originalMessage}!`,
            responses: [`Time to ${reminder.originalMessage}!`]
          });
          // Still schedule the reminder
          reminderService.scheduleReminder(reminder);
        }
      });
    } catch (error) {
      console.error("Error creating reminder:", error);
      res.status(400).json({ message: "Failed to create reminder" });
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

  // Generate AI response for a specific reminder
  app.post('/api/reminders/:id/generate-response', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reminder = await storage.getReminder(req.params.id, userId);
      if (!reminder) {
        return res.status(404).json({ message: "Reminder not found" });
      }

      // Generate AI response using the reminder service
      // This assumes reminderService.generateReminderResponse updates the reminder object in place or returns a new one
      const updatedReminder = await reminderService.generateReminderResponse(reminder); 

      // Update the reminder in storage with the new AI response
      await storage.updateReminder(req.params.id, userId, updatedReminder);

      res.json(updatedReminder);
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
          testMessage: "I do beg your pardon, but perhaps it's time you attended to your responsibilities."
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
  app.post('/api/dev/preview', async (req, res) => {
    try {
      const { title, rudenessLevel, voiceCharacter, motivationalQuote } = req.body;

      // Validate input
      if (rudenessLevel && (rudenessLevel < 1 || rudenessLevel > 5)) {
        return res.status(400).json({ message: "Rudeness level must be between 1 and 5" });
      }

      // Get a sample rude phrase for the level
      const phrases = await storage.getRudePhrasesForLevel(rudenessLevel || 3).catch(err => {
        console.error('Error fetching phrases:', err);
        return [{ phrase: 'Get your act together!' }]; // Fallback
      });

      const randomPhrase = phrases && phrases.length > 0 
        ? phrases[Math.floor(Math.random() * phrases.length)]
        : { phrase: 'Get your act together!' };

      const sampleReminder = {
        id: 'preview',
        title: title || 'Sample Reminder',
        rudeMessage: randomPhrase?.phrase || 'Get your act together!',
        rudenessLevel: rudenessLevel || 3,
        voiceCharacter: voiceCharacter || 'default',
        motivationalQuote: motivationalQuote || null,
        scheduledFor: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
        userId: 'preview',
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Generate preview data with browser speech synthesis
      let speechData = null;
      let voiceSettings = null;
      if (sampleReminder.voiceCharacter) {
        voiceSettings = notificationService.getBrowserVoiceSettings(sampleReminder.voiceCharacter);
        speechData = notificationService.generateBrowserSpeech(sampleReminder.rudeMessage, sampleReminder.voiceCharacter);
      }

      const previewData = {
        reminder: sampleReminder,
        speechData,
        voiceSettings,
        useBrowserSpeech: true,
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

  // Test DeepSeek API integration
  app.post('/api/test-deepseek', async (req, res) => {
    try {
      const { DeepSeekService } = await import('./services/deepseekService.js');
      const deepseekService = new DeepSeekService();

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