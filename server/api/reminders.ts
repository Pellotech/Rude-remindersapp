// Reminders: list, create (single + repeat days), upload photos, edit, delete, done / missed / "it hit"
import type { Express } from "express";
import { getUserLanguage } from "../utils/userLanguage";
import { localizeText, timeToMessage } from "../services/localize";
import { storage } from "../storage";
import { noteClientZone } from "../utils/userTime";
import { updateReminderSchema } from "@shared/schema";
import { reminderService } from "../services/reminderService";
import crypto from "crypto";
import { log as slog } from "../utils/logger";
import multer from "multer";
import { getAuthUserId, isJunkFeedbackText, upload, isAuthenticated, getNextDayOccurrence, signedInUserId } from "./shared";

export function registerRemindersRoutes(app: Express) {
  // Reminder routes
  app.get('/api/reminders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = signedInUserId(req);
      // Prevent HTTP-level caching (Android WebView, CDN, browser) from serving stale reminder lists
      res.set('Cache-Control', 'no-store');
      const reminders = await storage.getReminders(userId);
      res.json(reminders);
    } catch (error) {
      console.error("Error fetching reminders:", error);
      res.status(500).json({ message: "Failed to fetch reminders" });
    }
  });

  // File upload endpoint (protected - requires authentication)
  app.post('/api/upload', isAuthenticated, upload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      // Return the file path relative to attached_assets
      const filePath = `/attached_assets/${req.file.filename}`;
      res.json({ filePath });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'File upload failed' });
    }
  });

  // Multer error handling middleware
  app.use((error: any, req: any, res: any, next: any) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Maximum size is 10MB.' });
      }
      return res.status(400).json({ error: `Upload error: ${error.message}` });
    }
    next(error);
  });

  // Create a new reminder
  app.post('/api/reminders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = signedInUserId(req);
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
        isMultiDay,
        browserNotification,
        voiceNotification, 
        emailNotification,
        clientLocalTime
      } = req.body;

      // Turn away clearly invalid requests with a clear message (they used to
      // crash further down and come back as a 500 "server error").
      if (typeof originalMessage !== 'string' || !originalMessage.trim()) {
        return res.status(400).json({ message: "Please enter what you need to be reminded about", code: 'INVALID_REMINDER' });
      }
      if (!Number.isInteger(rudenessLevel) || rudenessLevel < 1 || rudenessLevel > 5) {
        return res.status(400).json({ message: "Rudeness level must be between 1 and 5", code: 'INVALID_REMINDER' });
      }

      // Older app versions don't send ?tz=, so fall back to hints in the body.
      noteClientZone(req.body?.timeZone, clientLocalTime);

      // Content safety check — covers both the multi-day and single-day paths
      // below since it runs before either. See moderationService.ts for what's
      // blocked and why it fails open rather than closed.
      const { moderationService } = await import('../services/moderationService');
      const moderationInput = [originalMessage, context].filter(Boolean).join('\n');
      const moderationResult = await moderationService.checkContent(moderationInput);
      if (moderationResult.flagged) {
        slog.warn('content_blocked', {
          userId,
          categories: moderationResult.categories,
          stage: 'input',
        });
        return res.status(400).json({
          error: "This reminder can't be created because it may reference harmful or illegal content. Please rephrase it.",
          code: 'CONTENT_BLOCKED',
        });
      }

      // Use notification settings from frontend (which includes user's preferences) or fallback to user profile
      const finalBrowserNotification = browserNotification !== undefined ? browserNotification : (user.browserNotifications !== false);
      const finalVoiceNotification = voiceNotification !== undefined ? voiceNotification : (user.voiceNotifications || false);
      const finalEmailNotification = emailNotification !== undefined ? emailNotification : (user.emailNotifications || false);

      const { checkMonthlyReminderLimit, atomicIncrementAndCheck, getMonthlyResetDate } = await import('../utils/premiumCheck');

      if (isMultiDay && selectedDays && selectedDays.length > 0) {
        const limitCheck = await checkMonthlyReminderLimit(user.id);
        if (limitCheck.currentCount + selectedDays.length > limitCheck.limit) {
          slog.warn('reminder_limit_reached', {
            userId: user.id,
            currentCount: limitCheck.currentCount,
            limit: limitCheck.limit,
            attempted: selectedDays.length,
            isMultiDay: true,
          });
          return res.status(403).json({
            error: `You've reached your ${limitCheck.limit} reminder limit for this month. Your limit resets on ${limitCheck.resetDate}.`,
            code: 'REMINDER_LIMIT_EXCEEDED',
            currentCount: limitCheck.currentCount,
            limit: limitCheck.limit,
            resetDate: limitCheck.resetDate
          });
        }

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
            browserNotification: finalBrowserNotification,
            voiceNotification: finalVoiceNotification,
            emailNotification: finalEmailNotification,
            voiceCharacter: reminderDataForDay.voiceCharacter || "default",
            attachments: reminderDataForDay.attachments || [],
            motivationalQuote: reminderDataForDay.motivationalQuote || "",
            selectedDays: [], // Individual reminders don't have selectedDays
            isMultiDay: false,
            daySpecificMessages: null,
            completed: false,
            completedAt: null,
            notAccomplished: false,
            notAccomplishedAt: null,
            responses: [] as string[],
            loggedAt: null,
            hitConfirmed: false,
            hitComment: null,
            hitAt: null,
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
                const { QuotesService } = await import('../../client/src/services/quotesService');

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
            // The automatic quotes are English; put them in the user's language
            if (reminder.motivationalQuote) {
              reminder.motivationalQuote = await localizeText(reminder.motivationalQuote, await getUserLanguage(userId));
            }
          }

          // Generate AI response automatically during form submission
          try {
            const generatedReminder = await reminderService.generateReminderResponse(reminder, clientLocalTime);
            reminder.rudeMessage = generatedReminder.rudeMessage;
            reminder.responses = generatedReminder.responses || [];
          } catch (error) {
            console.error("Error generating AI response:", error);
            // Fallback to basic message if AI generation fails
            const fallback = timeToMessage(reminder.originalMessage, await getUserLanguage(userId));
            reminder.rudeMessage = fallback;
            reminder.responses = [fallback];

          }

          // Update timestamp since everything is generated
          reminder.updatedAt = new Date();

          console.log("Created reminder with auto-generated content:", {
            id: reminder.id,
            motivationalQuote: reminder.motivationalQuote,
            rudeMessage: reminder.rudeMessage,
            responses: reminder.responses
          });

          const dayLimitResult = await atomicIncrementAndCheck(user.id, 1);
          if (!dayLimitResult.allowed) {
            break;
          }

          await storage.createReminder(userId, reminder);
          reminderService.scheduleReminder(reminder);
          createdReminders.push(reminder);
          slog.info('reminder_created', {
            userId,
            reminderId: reminder.id,
            rudenessLevel: reminder.rudenessLevel,
            isMultiDay: true,
          });
        }

        if (createdReminders.length === 0) {
          return res.status(403).json({
            error: `You've reached your reminder limit for this month. Your limit resets on ${getMonthlyResetDate()}.`,
            code: 'REMINDER_LIMIT_EXCEEDED'
          });
        }

        res.json({
          success: true,
          count: createdReminders.length,
          reminders: createdReminders
        });

      } else {
        // Handle single reminders as before
        // Validate scheduling time for quick reminders
        const scheduledDateTime = new Date(scheduledFor);
        const now = new Date();
        const timeDifference = scheduledDateTime.getTime() - now.getTime();
        const secondsDifference = timeDifference / 1000;

        // Allow quick reminders as short as 5 seconds for testing
        if (secondsDifference < 5) {
          return res.status(400).json({ 
            message: "Reminder must be scheduled at least 5 seconds in the future" 
          });
        }

        // Create base reminder
        let reminder = {
          id: crypto.randomUUID() as `${string}-${string}-${string}-${string}-${string}`,
          userId,
          title: originalMessage,
          originalMessage,
          context: context || null,
          rudeMessage: "", // Will be generated by AI
          rudenessLevel,
          scheduledFor: scheduledDateTime,
          browserNotification: finalBrowserNotification,
          voiceNotification: finalVoiceNotification,
          emailNotification: finalEmailNotification,
          voiceCharacter: voiceCharacter || "default",
          attachments: attachments || [],
          motivationalQuote: motivationalQuote || "",
          selectedDays: [],
          isMultiDay: false,
          daySpecificMessages: null,
          completed: false,
          completedAt: null,
          notAccomplished: false,
          notAccomplishedAt: null,
          responses: [] as string[],
          loggedAt: null,
          hitConfirmed: false,
          hitComment: null,
          hitAt: null,
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
              const { QuotesService } = await import('../../client/src/services/quotesService');

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
          // The automatic quotes are English; put them in the user's language
          if (reminder.motivationalQuote) {
            reminder.motivationalQuote = await localizeText(reminder.motivationalQuote, await getUserLanguage(userId));
          }
        }

        // Generate AI response automatically during form submission
        try {
          const generatedReminder = await reminderService.generateReminderResponse(reminder, clientLocalTime);
          reminder.rudeMessage = generatedReminder.rudeMessage;
          reminder.responses = generatedReminder.responses || [];
        } catch (error) {
          console.error("Error generating AI response:", error);
          // Fallback to basic message if AI generation fails
          const fallback = timeToMessage(originalMessage, await getUserLanguage(userId));
          reminder.rudeMessage = fallback;
          reminder.responses = [fallback];

        }

        // Update timestamp since everything is generated
        reminder.updatedAt = new Date();

        console.log("Created reminder with auto-generated content:", {
          id: reminder.id,
          motivationalQuote: reminder.motivationalQuote,
          rudeMessage: reminder.rudeMessage,
          responses: reminder.responses
        });

        const limitResult = await atomicIncrementAndCheck(user.id, 1);
        if (!limitResult.allowed) {
          slog.warn('reminder_limit_reached', {
            userId: user.id,
            currentCount: limitResult.newCount,
            limit: limitResult.limit,
            attempted: 1,
            isMultiDay: false,
          });
          return res.status(403).json({
            error: `You've reached your ${limitResult.limit} reminder limit for this month. Your limit resets on ${limitResult.resetDate}.`,
            code: 'REMINDER_LIMIT_EXCEEDED',
            currentCount: limitResult.newCount,
            limit: limitResult.limit,
            resetDate: limitResult.resetDate
          });
        }

        await storage.createReminder(userId, reminder);

        reminderService.scheduleReminder(reminder);

        slog.info('reminder_created', {
          userId,
          reminderId: reminder.id,
          rudenessLevel: reminder.rudenessLevel,
          isMultiDay: false,
        });

        res.json(reminder);
      }
    } catch (error) {
      console.error("Error creating reminder:", error);
      res.status(500).json({ message: "Failed to create reminder" });
    }
  });

  app.get('/api/reminders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = signedInUserId(req);
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
      const userId = signedInUserId(req);
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
      const userId = signedInUserId(req);
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
      const userId = signedInUserId(req);
      const reminder = await storage.getReminder(req.params.id, userId);

      if (!reminder) {
        return res.status(404).json({ message: "Reminder not found" });
      }

      const { smartResponseService } = await import('../services/smartResponseService');

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

  app.delete('/api/reminders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = signedInUserId(req);
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
      const userId = signedInUserId(req);
      const reminder = await storage.completeReminder(req.params.id, userId);
      reminderService.unscheduleReminder(req.params.id);
      res.json(reminder);
    } catch (error) {
      console.error("Error completing reminder:", error);
      res.status(500).json({ message: "Failed to complete reminder" });
    }
  });

  app.patch('/api/reminders/:id/not-accomplished', isAuthenticated, async (req: any, res) => {
    try {
      const userId = signedInUserId(req);
      const reminder = await storage.markReminderNotAccomplished(req.params.id, userId);
      reminderService.unscheduleReminder(req.params.id);
      res.json(reminder);
    } catch (error) {
      console.error("Error marking reminder as not accomplished:", error);
      res.status(500).json({ message: "Failed to mark reminder as not accomplished" });
    }
  });

  // "It Hit" feedback — did this rude message land? Comment is optional; when
  // present it's screened for junk (empty/too-short/all-emoji) and then run
  // through the same moderationService used everywhere else, since admin will
  // be reading these comments directly.
  app.patch('/api/reminders/:id/hit', isAuthenticated, async (req: any, res) => {
    try {
      const userId = signedInUserId(req);
      const hit = req.body?.hit !== false; // defaults to true (It Hit) unless explicitly false (Nahh)
      const rawComment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : '';

      let comment: string | undefined = undefined;
      if (rawComment) {
        const junkCheck = isJunkFeedbackText(rawComment);
        if (junkCheck.junk) {
          return res.status(400).json({
            error: "That comment's too short or empty to be useful — try adding a bit more detail, or leave it blank.",
            code: 'FEEDBACK_TOO_SHORT',
          });
        }
        const { moderationService } = await import('../services/moderationService');
        const modResult = await moderationService.checkContent(rawComment);
        if (modResult.flagged) {
          slog.warn('content_blocked', { userId, reminderId: req.params.id, categories: modResult.categories, stage: 'hit_comment' });
          return res.status(400).json({
            error: "This comment can't be saved because it may reference harmful or illegal content. Please rephrase it.",
            code: 'CONTENT_BLOCKED',
          });
        }
        comment = rawComment;
      }

      const reminder = await storage.markReminderHit(req.params.id, userId, hit, comment);
      res.json(reminder);
    } catch (error) {
      console.error("Error marking reminder as hit:", error);
      res.status(500).json({ message: "Failed to mark reminder as hit" });
    }
  });
}
