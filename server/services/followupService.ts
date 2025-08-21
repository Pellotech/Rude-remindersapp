
import { storage } from "../storage";
import type { Reminder } from "@shared/schema";

interface FollowUpResponse {
  id: string;
  reminderId: string;
  message: string;
  responseType: 'motivational' | 'sarcastic' | 'encouraging' | 'stern' | 'humorous';
  delayMinutes: number;
  createdAt: Date;
}

class FollowUpService {
  // Generate follow-up responses based on rudeness level and time elapsed
  async generateFollowUpResponses(reminder: Reminder): Promise<FollowUpResponse[]> {
    const followUps: FollowUpResponse[] = [];
    const baseMessage = reminder.originalMessage;
    
    // Generate different types of follow-ups based on rudeness level
    const followUpTemplates = this.getFollowUpTemplates(reminder.rudenessLevel);
    
    // Schedule follow-ups at different intervals
    const intervals = [15, 30, 60, 120]; // 15 min, 30 min, 1 hour, 2 hours
    
    followUpTemplates.forEach((template, index) => {
      if (index < intervals.length) {
        followUps.push({
          id: `followup-${reminder.id}-${index}`,
          reminderId: reminder.id,
          message: template.message.replace('{task}', baseMessage),
          responseType: template.type,
          delayMinutes: intervals[index],
          createdAt: new Date()
        });
      }
    });

    return followUps;
  }

  private getFollowUpTemplates(rudenessLevel: number) {
    const templates = {
      1: [ // Gentle
        { type: 'encouraging' as const, message: 'Hey there! Just checking in - how\'s {task} going?' },
        { type: 'motivational' as const, message: 'You\'ve got this! {task} is totally doable.' },
        { type: 'encouraging' as const, message: 'No pressure, but {task} is still waiting for you.' }
      ],
      2: [ // Firm  
        { type: 'stern' as const, message: 'Friendly reminder: {task} isn\'t going to complete itself.' },
        { type: 'motivational' as const, message: 'Come on, you can knock out {task} right now!' },
        { type: 'stern' as const, message: 'Still working on {task}? Time to buckle down.' }
      ],
      3: [ // Sarcastic
        { type: 'sarcastic' as const, message: 'Oh, are we still "getting around" to {task}?' },
        { type: 'humorous' as const, message: 'I see {task} has become a decorative item on your to-do list.' },
        { type: 'sarcastic' as const, message: 'Wow, {task} must be REALLY hard if it\'s taking this long.' }
      ],
      4: [ // Harsh
        { type: 'stern' as const, message: 'Seriously? {task} is STILL not done? What\'s your excuse this time?' },
        { type: 'sarcastic' as const, message: 'At this rate, {task} will be done sometime next century.' },
        { type: 'stern' as const, message: 'Stop making excuses and just DO {task} already!' }
      ],
      5: [ // Savage
        { type: 'sarcastic' as const, message: 'Congrats! You\'ve officially turned {task} into a procrastination masterpiece!' },
        { type: 'stern' as const, message: 'Are you kidding me?! {task} is laughing at you right now!' },
        { type: 'humorous' as const, message: 'I\'ve seen glaciers move faster than your progress on {task}!' }
      ]
    };

    return templates[rudenessLevel as keyof typeof templates] || templates[3];
  }

  // Schedule follow-up reminders
  async scheduleFollowUps(reminder: Reminder) {
    const followUps = await this.generateFollowUpResponses(reminder);
    
    followUps.forEach(followUp => {
      setTimeout(async () => {
        // Check if original reminder is still incomplete
        const currentReminder = await storage.getReminder(reminder.id, reminder.userId);
        if (currentReminder && !currentReminder.completed) {
          // Send follow-up notification
          console.log(`Follow-up for ${reminder.id}: ${followUp.message}`);
          
          // Here you would send the actual notification
          // This could integrate with your existing notification service
        }
      }, followUp.delayMinutes * 60 * 1000);
    });
  }
}

export const followUpService = new FollowUpService();
