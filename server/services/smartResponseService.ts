
import { storage } from "../storage";
import type { Reminder } from "@shared/schema";

interface UserBehaviorData {
  userId: string;
  averageCompletionTime: number; // in minutes
  responseToRudenessLevel: Record<number, number>; // rudeness level -> effectiveness score
  preferredMotivationStyle: 'tough-love' | 'encouraging' | 'humorous' | 'direct';
  taskCategories: Record<string, number>; // category -> completion rate
}

class SmartResponseService {
  // Analyze user behavior and suggest better responses
  async getPersonalizedResponse(reminder: Reminder): Promise<string[]> {
    const userBehavior = await this.getUserBehaviorData(reminder.userId);
    const responses: string[] = [];
    
    // Get base response variations
    const phrases = await storage.getRudePhrasesForLevel(reminder.rudenessLevel);
    
    // Adapt responses based on user behavior
    if (userBehavior) {
      // If user responds better to higher rudeness, make it spicier
      if (userBehavior.responseToRudenessLevel[reminder.rudenessLevel] < 50) {
        const harshPhrases = await storage.getRudePhrasesForLevel(Math.min(5, reminder.rudenessLevel + 1));
        responses.push(...harshPhrases.slice(0, 2).map(p => `${reminder.originalMessage}${p.phrase}`));
      }
      
      // Add motivational style based on preference
      responses.push(...this.getStyleBasedResponses(reminder, userBehavior.preferredMotivationStyle));
    }
    
    // Fallback to standard responses
    if (responses.length === 0) {
      responses.push(...phrases.slice(0, 3).map(p => `${reminder.originalMessage}${p.phrase}`));
    }
    
    return responses;
  }

  private getStyleBasedResponses(reminder: Reminder, style: string): string[] {
    const baseMessage = reminder.originalMessage;
    
    const styleResponses = {
      'tough-love': [
        `${baseMessage} - No excuses, just results!`,
        `${baseMessage} - Your future self is counting on you!`,
        `${baseMessage} - Stop overthinking and start doing!`
      ],
      'encouraging': [
        `${baseMessage} - You've got this! One step at a time.`,
        `${baseMessage} - Every small step counts. Let's go!`,
        `${baseMessage} - Believe in yourself and make it happen!`
      ],
      'humorous': [
        `${baseMessage} - Your couch is getting too comfortable with you!`,
        `${baseMessage} - Even your coffee is judging your productivity!`,
        `${baseMessage} - Time to adult harder than you've ever adulted before!`
      ],
      'direct': [
        `${baseMessage} - Clear goal. Clear action. Get it done.`,
        `${baseMessage} - Simple task. Simple execution. Now.`,
        `${baseMessage} - Less thinking. More doing. Go.`
      ]
    };
    
    return styleResponses[style as keyof typeof styleResponses] || styleResponses.direct;
  }

  private async getUserBehaviorData(userId: string): Promise<UserBehaviorData | null> {
    // This would analyze user's past reminder completion patterns
    // For now, return null - would be implemented with actual analytics
    return null;
  }

  // Generate contextual remarks based on time of day, task type, etc.
  async getContextualRemarks(reminder: Reminder): Promise<string[]> {
    const remarks: string[] = [];
    const now = new Date();
    const hour = now.getHours();
    
    // Time-based remarks
    if (hour < 9) {
      remarks.push("Early bird gets the worm - and finishes their tasks!");
      remarks.push("Morning productivity is the best productivity!");
    } else if (hour > 18) {
      remarks.push("Burning the midnight oil? Let's make it count!");
      remarks.push("Night owl mode activated - time to conquer this task!");
    }
    
    // Task-type based remarks (if we can infer from the message)
    const taskMessage = reminder.originalMessage.toLowerCase();
    if (taskMessage.includes('gym') || taskMessage.includes('workout')) {
      remarks.push("No pain, no gain! Your muscles are waiting!");
      remarks.push("Sweat now, smile later!");
    } else if (taskMessage.includes('work') || taskMessage.includes('report')) {
      remarks.push("Professional excellence doesn't happen by accident!");
      remarks.push("Your career depends on crushing these tasks!");
    } else if (taskMessage.includes('call') || taskMessage.includes('mom') || taskMessage.includes('family')) {
      remarks.push("Your loved ones deserve your attention!");
      remarks.push("Family first - make that call!");
    }
    
    return remarks;
  }
}

export const smartResponseService = new SmartResponseService();
