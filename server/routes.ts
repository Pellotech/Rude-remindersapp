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
      const validatedData = insertReminderSchema.parse(requestData);
      const reminder = await storage.createReminder(userId, validatedData);

      // Schedule the reminder
      reminderService.scheduleReminder(reminder);

      res.status(201).json(reminder);
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
          name: "Amy (British Butler)",
          unrealId: "Amy", 
          personality: "Polite but passive-aggressive",
          testMessage: "I do beg your pardon, but perhaps it's time you attended to your responsibilities."
        },
        {
          id: "mom",
          name: "Scarlett (Disappointed Mom)",
          unrealId: "Scarlett",
          personality: "Guilt-inducing maternal energy", 
          testMessage: "I'm not angry, I'm just disappointed. You know how much this means to me."
        },
        {
          id: "motivational-coach",
          name: "Dan (Motivational Coach)",
          unrealId: "Dan",
          personality: "High-energy motivational speaker",
          testMessage: "You've got this! Let's crush those goals and make it happen!"
        },
        {
          id: "wise-teacher",
          name: "Amy (Wise Teacher)",
          unrealId: "Amy",
          personality: "Patient but firm educator",
          testMessage: "Remember, every small step forward is progress towards your goal."
        },
        {
          id: "confident-leader",
          name: "Will (Confident Leader)", 
          unrealId: "Will",
          personality: "Executive leadership style",
          testMessage: "Let's execute this plan efficiently and deliver results."
        },
        {
          id: "calm-narrator",
          name: "Scarlett (Calm Narrator)",
          unrealId: "Scarlett", 
          personality: "Soothing and reassuring",
          testMessage: "Take a deep breath and focus on what needs to be accomplished."
        },
        {
          id: "energetic-trainer",
          name: "Dan (Energetic Trainer)",
          unrealId: "Dan",
          personality: "Fitness coach energy",
          testMessage: "Come on! Push through and show me what you're made of!"
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

      const voiceId = notificationService.getUnrealVoiceId(voiceCharacter);
      const message = testMessage || "This is a test of your selected voice character.";
      
      const audioUrl = await notificationService.generateUnrealSpeech(message, voiceId);
      
      if (audioUrl) {
        res.json({ audioUrl, voiceId, message });
      } else {
        res.status(500).json({ message: "Failed to generate voice test" });
      }
    } catch (error) {
      console.error("Error testing voice:", error);
      res.status(500).json({ message: "Failed to test voice" });
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

      // Generate preview data with Unreal Speech audio
      let audioUrl = null;
      if (sampleReminder.voiceCharacter) {
        const voiceId = notificationService.getUnrealVoiceId(sampleReminder.voiceCharacter);
        audioUrl = await notificationService.generateUnrealSpeech(sampleReminder.rudeMessage, voiceId);
      }

      const previewData = {
        reminder: sampleReminder,
        audioUrl,
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
            audioUrl
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