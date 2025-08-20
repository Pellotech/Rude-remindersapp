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

  // Developer preview route (not accessible to regular users)
  app.get('/api/dev/preview-reminder', async (req, res) => {
    try {
      // Create a sample reminder for preview
      const message = req.query.message as string || 'Take your vitamins';
      const level = parseInt(req.query.level as string) || 3;
      
      // Get actual rude phrase for the level
      const phrases = await storage.getRudePhrasesForLevel(level);
      const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
      const rudeMessage = `${message}${randomPhrase?.phrase || ', get it done!'}`;

      const sampleReminder = {
        id: 'preview-123',
        userId: 'dev-user',
        title: 'Sample Reminder',
        originalMessage: message,
        rudeMessage: rudeMessage,
        rudenessLevel: level,
        scheduledFor: new Date(),
        voiceCharacter: req.query.voice as string || 'default',
        attachments: [],
        motivationalQuote: req.query.quote as string || null,
        browserNotification: true,
        voiceNotification: true,
        emailNotification: false,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const sampleUser = {
        id: 'dev-user',
        email: 'developer@preview.com',
        firstName: 'Dev',
        lastName: 'User',
        defaultRudenessLevel: 3,
        voiceNotifications: true,
        browserNotifications: true,
        emailNotifications: false
      };

      // Generate preview data
      const previewData = {
        reminder: sampleReminder,
        user: sampleUser,
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
            character: sampleReminder.voiceCharacter
          },
          realtime: {
            type: 'reminder',
            reminder: sampleReminder,
            timestamp: new Date()
          }
        }
      };

      res.json(previewData);
    } catch (error) {
      console.error("Error generating preview:", error);
      res.status(500).json({ message: "Failed to generate preview", error: error.message });
    }
  });

  // Developer actual reminder preview route
  app.get('/api/dev/preview-actual-reminder/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reminder = await storage.getReminder(req.params.id, userId);
      
      if (!reminder) {
        return res.status(404).json({ message: "Reminder not found" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Generate preview data for the actual reminder
      const previewData = {
        reminder: reminder,
        user: user,
        notifications: {
          browser: {
            title: `Reminder: ${reminder.title}`,
            body: reminder.motivationalQuote 
              ? `${reminder.rudeMessage}\n\n💪 ${reminder.motivationalQuote}`
              : reminder.rudeMessage,
            icon: '/favicon.ico'
          },
          voice: {
            text: reminder.rudeMessage,
            character: reminder.voiceCharacter
          },
          realtime: {
            type: 'reminder',
            reminder: reminder,
            timestamp: new Date()
          }
        }
      };

      res.json(previewData);
    } catch (error) {
      console.error("Error generating actual reminder preview:", error);
      res.status(500).json({ message: "Failed to generate actual reminder preview", error: error.message });
    }
  });

  // Developer audio preview route
  app.post('/api/dev/preview-audio', async (req, res) => {
    try {
      const { message, voiceCharacter, rudenessLevel } = req.body;

      // Get rude phrase for the level
      const phrases = await storage.getRudePhrasesForLevel(rudenessLevel || 3);
      const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
      const rudeMessage = `${message || 'Sample reminder'}${randomPhrase?.phrase || ', get it done!'}`;

      console.log('Generating audio for rude message:', rudeMessage);

      const audioBuffer = await notificationService.generateUnrealSpeech(
        rudeMessage, 
        notificationService.getUnrealVoiceId(voiceCharacter || 'default')
      );

      if (audioBuffer) {
        res.set({
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBuffer.length.toString(),
        });
        res.send(audioBuffer);
      } else {
        res.status(500).json({ message: "Failed to generate preview audio" });
      }
    } catch (error) {
      console.error("Error generating preview audio:", error);
      res.status(500).json({ message: "Failed to generate preview audio", error: error.message });
    }
  });

  // Test Unreal Speech endpoint
  app.post('/api/test-speech', isAuthenticated, async (req: any, res) => {
    try {
      const { text, voiceCharacter } = req.body;
      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }

      const audioBuffer = await notificationService.generateUnrealSpeech(text, 
        notificationService.getUnrealVoiceId(voiceCharacter || 'default'));

      if (audioBuffer) {
        res.set({
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBuffer.length.toString(),
        });
        res.send(audioBuffer);
      } else {
        res.status(500).json({ message: "Failed to generate speech" });
      }
    } catch (error) {
      console.error("Error testing speech:", error);
      res.status(500).json({ message: "Failed to test speech" });
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