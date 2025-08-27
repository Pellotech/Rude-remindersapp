import { DeepSeekService } from './deepseekService.js';
import { isUserPremium } from '../utils/premiumCheck.js';
import { storage } from '../storage.js';

interface QuoteGenerationContext {
  category?: string;
  ethnicity?: string;
  gender?: string;
  timeOfDay?: string;
}

export class PremiumQuotesService {
  private deepseekService: DeepSeekService | null = null;

  constructor() {
    try {
      this.deepseekService = new DeepSeekService();
    } catch (error) {
      console.warn('DeepSeek service not available for quotes:', error);
      this.deepseekService = null;
    }
  }

  /**
   * Get a personalized quote for the user
   * Premium users get AI-generated quotes, free users get pre-made cultural quotes
   */
  async getPersonalizedQuote(userId: string, context: QuoteGenerationContext = {}): Promise<string> {
    const isPremium = await isUserPremium(userId);

    if (isPremium && this.deepseekService) {
      try {
        const aiQuote = await this.generateAIQuote(userId, context);
        if (aiQuote) {
          console.log(`Generated AI quote for premium user ${userId}`);
          return aiQuote;
        }
      } catch (error) {
        console.error('AI quote generation failed, falling back to cultural quotes:', error);
      }
    } else if (!isPremium) {
      console.log(`User ${userId} needs premium subscription for AI-generated quotes. Using cultural quotes.`);
    }

    // Fallback to cultural quotes for free users or if AI fails
    return this.getFallbackQuote(userId, context);
  }

  /**
   * Generate AI-powered quotes using DeepSeek
   */
  private async generateAIQuote(userId: string, context: QuoteGenerationContext): Promise<string | null> {
    if (!this.deepseekService) return null;

    try {
      const user = await storage.getUser(userId);
      const now = new Date();
      const timeOfDay = this.getTimeOfDay(now);

      const prompt = this.buildQuotePrompt({
        ...context,
        ethnicity: context.ethnicity || user?.ethnicity || undefined,
        gender: context.gender || user?.gender || undefined,
        timeOfDay: context.timeOfDay || timeOfDay
      });

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are a motivational quote generator that creates inspiring, personalized quotes. Generate only the quote and attribution, nothing else.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 150
        })
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content?.trim();
      
      if (content) {
        return content;
      }
    } catch (error) {
      console.error('Error generating AI quote:', error);
    }

    return null;
  }

  /**
   * Build a prompt for AI quote generation
   */
  private buildQuotePrompt(context: QuoteGenerationContext): string {
    const { category, ethnicity, gender, timeOfDay } = context;
    
    let prompt = `Generate a motivational quote that is:
- Inspiring and uplifting
- Brief but impactful (1-2 sentences max)
- Relevant to ${timeOfDay || 'daily motivation'}`;

    if (category) {
      prompt += `\n- Related to ${category} (work, health, personal growth, etc.)`;
    }

    if (ethnicity) {
      prompt += `\n- Culturally resonant for someone from a ${ethnicity} background`;
    }

    if (gender) {
      prompt += `\n- Appropriate and inspiring for a ${gender} individual`;
    }



    prompt += `\n\nFormat: "Quote text" - Author Name
Example: "The best time to plant a tree was 20 years ago. The second best time is now." - Chinese Proverb

Generate ONE unique quote now:`;

    return prompt;
  }

  /**
   * Get fallback quote from static cultural/historical quotes
   */
  private getFallbackQuote(userId: string, context: QuoteGenerationContext): string {
    const { category, ethnicity, gender } = context;

    // Cultural quotes by ethnicity
    const culturalQuotes: Record<string, string[]> = {
      'african': [
        '"If you want to go fast, go alone. If you want to go far, go together." - African Proverb',
        '"However far the stream flows, it never forgets its source." - African Proverb',
        '"Smooth seas do not make skillful sailors." - African Proverb'
      ],
      'asian': [
        '"The best time to plant a tree was 20 years ago. The second best time is now." - Chinese Proverb',
        '"Fall seven times, stand up eight." - Japanese Proverb',
        '"A journey of a thousand miles begins with a single step." - Lao Tzu'
      ],
      'hispanic': [
        '"El que no arriesga, no gana." (He who doesn\'t take risks, doesn\'t win) - Spanish Proverb',
        '"Camarón que se duerme, se lo lleva la corriente." (The shrimp that falls asleep gets carried away by the current) - Mexican Proverb',
        '"No hay mal que por bien no venga." (There\'s no bad from which good doesn\'t come) - Spanish Proverb'
      ],
      'european': [
        '"What doesn\'t kill you makes you stronger." - Friedrich Nietzsche',
        '"The only impossible journey is the one you never begin." - Tony Robbins',
        '"In the middle of difficulty lies opportunity." - Albert Einstein'
      ]
    };

    // Category-based quotes
    const categoryQuotes: Record<string, string[]> = {
      'work': [
        '"The way to get started is to quit talking and begin doing." - Walt Disney',
        '"Innovation distinguishes between a leader and a follower." - Steve Jobs',
        '"Your work is going to fill a large part of your life, and the only way to be truly satisfied is to do what you believe is great work." - Steve Jobs'
      ],
      'health': [
        '"Take care of your body. It\'s the only place you have to live." - Jim Rohn',
        '"Health is a state of complete harmony of the body, mind and spirit." - B.K.S. Iyengar',
        '"The groundwork for all happiness is good health." - Leigh Hunt'
      ],
      'personal': [
        '"Be yourself; everyone else is already taken." - Oscar Wilde',
        '"The only person you are destined to become is the person you decide to be." - Ralph Waldo Emerson',
        '"Life is what happens to you while you\'re busy making other plans." - John Lennon'
      ]
    };

    // Try cultural quotes first if ethnicity is specified
    if (ethnicity && culturalQuotes[ethnicity.toLowerCase()]) {
      const quotes = culturalQuotes[ethnicity.toLowerCase()];
      const randomIndex = Math.floor(Math.random() * quotes.length);
      return quotes[randomIndex];
    }

    // Try category quotes if category is specified
    if (category && categoryQuotes[category.toLowerCase()]) {
      const quotes = categoryQuotes[category.toLowerCase()];
      const randomIndex = Math.floor(Math.random() * quotes.length);
      return quotes[randomIndex];
    }

    // Final fallback - general motivational quotes
    const fallbackQuotes = [
      '"The only way to do great work is to love what you do." - Steve Jobs',
      '"Success is not final, failure is not fatal: it is the courage to continue that counts." - Winston Churchill',
      '"The future belongs to those who believe in the beauty of their dreams." - Eleanor Roosevelt',
      '"It does not matter how slowly you go as long as you do not stop." - Confucius',
      '"Everything you\'ve ever wanted is on the other side of fear." - George Addair',
      '"Believe you can and you\'re halfway there." - Theodore Roosevelt',
      '"Don\'t watch the clock; do what it does. Keep going." - Sam Levenson',
      '"The secret of getting ahead is getting started." - Mark Twain'
    ];

    const randomIndex = Math.floor(Math.random() * fallbackQuotes.length);
    return fallbackQuotes[randomIndex];
  }

  /**
   * Helper method to determine time of day for context
   */
  private getTimeOfDay(date: Date): string {
    const hour = date.getHours();
    if (hour < 6) return 'early morning';
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    if (hour < 21) return 'evening';
    return 'night';
  }
}

// Export singleton instance
export const premiumQuotesService = new PremiumQuotesService();