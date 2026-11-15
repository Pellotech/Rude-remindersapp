// Content: rude phrases, AdMob ad IDs, voices, text-to-speech
import type { Express } from "express";
import { storage } from "../storage";
import { notificationService } from "../services/notificationService";

export function registerContentRoutes(app: Express) {
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

  // AdMob config endpoint — returns publishable AdMob IDs from server-side secrets.
  // Public on purpose: ad unit IDs are visible inside any compiled app binary.
  app.get('/api/config/admob', (_req, res) => {
    res.json({
      appId: process.env.ADMOB_APP_ID || '',
      ios: {
        banner: process.env.ADMOB_IOS_BANNER_ID || '',
        interstitial: process.env.ADMOB_IOS_INTERSTITIAL_ID || '',
        reward: process.env.ADMOB_IOS_REWARD_ID || '',
      },
      android: {
        banner: process.env.ADMOB_ANDROID_BANNER_ID || '',
        interstitial: process.env.ADMOB_ANDROID_INTERSTITIAL_ID || '',
        reward: process.env.ADMOB_ANDROID_REWARD_ID || '',
      },
    });
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
          testMessage: "This is Scarlett, your professional reminder voice.",
          premium: false
        },
        {
          id: "confident-leader",
          name: "Will (Confident Leader)", 
          unrealId: "Will",
          personality: "Bold, executive leadership style",
          testMessage: "Let's execute this plan efficiently and deliver results.",
          premium: true
        },
        {
          id: "british-butler",
          name: "Gerald (British Butler)",
          unrealId: "Dan", 
          personality: "Polite but passive-aggressive",
          testMessage: "I do beg your Pardon, but perhaps it's time you attended to your responsibilities.",
          premium: true
        },
        {
          id: "karen-nag",
          name: "Karen (The Disappointed Mother)",
          unrealId: "Liv",
          personality: "Nagging, impatient, impossible to ignore",
          testMessage: "I'm not angry, I'm just disappointed. Again. Are you even listening to me?",
          premium: true
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

      const message = testMessage || "This is a test of your selected voice character.";
      const voiceSettings = notificationService.getBrowserVoiceSettings(voiceCharacter);
      const speechData = notificationService.generateBrowserSpeech(message, voiceCharacter);
      res.json({ speechData, voiceSettings, message, useBrowserSpeech: true });
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
}
