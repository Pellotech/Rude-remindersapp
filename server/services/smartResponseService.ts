
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
    const category = this.categorizeReminder(baseMessage);
    
    const styleResponses = {
      'tough-love': this.getToughLoveResponses(baseMessage, category),
      'encouraging': this.getEncouragingResponses(baseMessage, category),
      'humorous': this.getHumorousResponses(baseMessage, category),
      'direct': this.getDirectResponses(baseMessage, category)
    };
    
    return styleResponses[style as keyof typeof styleResponses] || styleResponses.direct;
  }

  private getToughLoveResponses(baseMessage: string, category: string): string[] {
    const base = [
      `${baseMessage} - No excuses, just results!`,
      `${baseMessage} - Your future self is counting on you!`,
      `${baseMessage} - Stop overthinking and start doing!`
    ];

    switch (category) {
      case 'health':
        base.push(`${baseMessage} - Your body is a temple, not a storage unit!`);
        break;
      case 'work':
        base.push(`${baseMessage} - Champions don't make excuses!`);
        break;
      case 'personal':
        base.push(`${baseMessage} - People who matter deserve your effort!`);
        break;
    }
    return base;
  }

  private getEncouragingResponses(baseMessage: string, category: string): string[] {
    const base = [
      `${baseMessage} - You've got this! One step at a time.`,
      `${baseMessage} - Every small step counts. Let's go!`,
      `${baseMessage} - Believe in yourself and make it happen!`
    ];

    switch (category) {
      case 'health':
        base.push(`${baseMessage} - Your health journey is inspiring!`);
        break;
      case 'education':
        base.push(`${baseMessage} - Every moment of learning makes you stronger!`);
        break;
      case 'creative':
        base.push(`${baseMessage} - Your creativity is a gift to the world!`);
        break;
    }
    return base;
  }

  private getHumorousResponses(baseMessage: string, category: string): string[] {
    const base = [
      `${baseMessage} - Your couch is getting too comfortable with you!`,
      `${baseMessage} - Even your coffee is judging your productivity!`,
      `${baseMessage} - Time to adult harder than you've ever adulted before!`
    ];

    switch (category) {
      case 'household':
        base.push(`${baseMessage} - The dishes are plotting their revenge!`);
        break;
      case 'work':
        base.push(`${baseMessage} - Your inbox is laughing at your procrastination!`);
        break;
      case 'finance':
        base.push(`${baseMessage} - Your wallet is crying for attention!`);
        break;
    }
    return base;
  }

  private getDirectResponses(baseMessage: string, category: string): string[] {
    return [
      `${baseMessage} - Clear goal. Clear action. Get it done.`,
      `${baseMessage} - Simple task. Simple execution. Now.`,
      `${baseMessage} - Less thinking. More doing. Go.`
    ];
  }

  private async getUserBehaviorData(userId: string): Promise<UserBehaviorData | null> {
    // This would analyze user's past reminder completion patterns
    // For now, return null - would be implemented with actual analytics
    return null;
  }

  // Categorize reminder type for better personalization
  private categorizeReminder(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    // Health & Fitness
    if (lowerMessage.match(/\b(gym|workout|exercise|run|jog|yoga|diet|water|vitamin|medicine|doctor|appointment)\b/)) {
      return 'health';
    }
    
    // Work & Career
    if (lowerMessage.match(/\b(meeting|deadline|report|email|project|work|office|boss|client|presentation|call)\b/)) {
      return 'work';
    }
    
    // Personal & Family
    if (lowerMessage.match(/\b(mom|dad|family|birthday|anniversary|date|friend|visit|call|text)\b/)) {
      return 'personal';
    }
    
    // Learning & Education
    if (lowerMessage.match(/\b(study|learn|read|course|homework|practice|skill|language|book)\b/)) {
      return 'education';
    }
    
    // Finance & Admin
    if (lowerMessage.match(/\b(pay|bill|tax|bank|insurance|invest|budget|money|finance)\b/)) {
      return 'finance';
    }
    
    // Household & Chores
    if (lowerMessage.match(/\b(clean|wash|dishes|laundry|cook|grocery|shopping|repair|maintenance)\b/)) {
      return 'household';
    }
    
    // Creative & Hobbies
    if (lowerMessage.match(/\b(paint|draw|write|music|hobby|creative|art|craft|garden)\b/)) {
      return 'creative';
    }
    
    return 'general';
  }

  // Generate contextual remarks based on time of day, task type, etc.
  async getContextualRemarks(reminder: Reminder): Promise<string[]> {
    const remarks: string[] = [];
    const now = new Date();
    const hour = now.getHours();
    const category = this.categorizeReminder(reminder.originalMessage);
    
    // Time-based remarks
    if (hour < 9) {
      remarks.push("Early bird gets the worm - and finishes their tasks!");
      remarks.push("Morning productivity is the best productivity!");
    } else if (hour > 18) {
      remarks.push("Burning the midnight oil? Let's make it count!");
      remarks.push("Night owl mode activated - time to conquer this task!");
    }
    
    // Category-specific remarks
    const categoryRemarks = this.getCategorySpecificRemarks(category, hour);
    remarks.push(...categoryRemarks);
    
    return remarks;
  }

  private getCategorySpecificRemarks(category: string, hour: number): string[] {
    const remarks: string[] = [];
    
    switch (category) {
      case 'health':
        remarks.push("Your future self will thank you for this!");
        remarks.push("Health is wealth - invest in yourself!");
        if (hour < 12) remarks.push("Perfect time to get those endorphins flowing!");
        break;
        
      case 'work':
        remarks.push("Professional excellence doesn't happen by accident!");
        remarks.push("Your career depends on crushing these tasks!");
        if (hour > 17) remarks.push("Overtime hero mode activated!");
        break;
        
      case 'personal':
        remarks.push("Your loved ones deserve your attention!");
        remarks.push("Relationships require maintenance too!");
        break;
        
      case 'education':
        remarks.push("Knowledge is power - time to level up!");
        remarks.push("Every expert was once a beginner!");
        break;
        
      case 'finance':
        remarks.push("Your future financial security depends on this!");
        remarks.push("Money doesn't manage itself!");
        break;
        
      case 'household':
        remarks.push("A clean space equals a clear mind!");
        remarks.push("Adulting level: Expert!");
        break;
        
      case 'creative':
        remarks.push("Creativity requires consistent practice!");
        remarks.push("Your artistic soul is calling!");
        break;
        
      default:
        remarks.push("No more excuses - time to execute!");
        remarks.push("Procrastination is the thief of time!");
        break;
    }
    
    return remarks;
  }
}

export const smartResponseService = new SmartResponseService();
