// Motivational quotes
import type { Express } from "express";
import { premiumQuotesService } from "../services/premiumQuotesService";
import { isUserPremium } from "../utils/premiumCheck";
import { getAuthUserId, isAuthenticated, signedInUserId } from "./shared";

export function registerQuotesRoutes(app: Express) {
  // Premium Quotes API - Get personalized AI or cultural quotes
  app.get('/api/quotes/personalized', isAuthenticated, async (req: any, res) => {
    try {
      const userId = signedInUserId(req);
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
      const userId = signedInUserId(req);
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
      const userId = signedInUserId(req);
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
      const userId = signedInUserId(req);
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
      const userId = signedInUserId(req);
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
      const userId = signedInUserId(req);
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
}
