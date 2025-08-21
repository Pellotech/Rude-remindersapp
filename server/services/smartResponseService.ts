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
  private responseVersion = Date.now(); // Cache-busting version
  
  // Generate truly personalized AI responses that correlate with the specific task
  async getPersonalizedResponse(reminder: Reminder, forceRefresh = false): Promise<string[]> {
    const userBehavior = await this.getUserBehaviorData(reminder.userId);
    const responses: string[] = [];
    
    // Add randomization to ensure variety even with same inputs
    const randomSeed = forceRefresh ? Date.now().toString() : reminder.id.slice(-8);
    const category = this.categorizeReminder(reminder.originalMessage);
    
    // Generate task-specific AI responses based on the reminder content
    const taskSpecificResponses = this.generateTaskSpecificResponses(reminder, category, randomSeed);
    responses.push(...taskSpecificResponses);
    
    // Add behavior-adapted responses if we have user data
    if (userBehavior) {
      // If user responds better to higher rudeness, make responses more direct
      if (userBehavior.responseToRudenessLevel[reminder.rudenessLevel] < 50) {
        const intensifiedResponses = this.intensifyResponsesForTask(reminder, category, randomSeed);
        responses.push(...intensifiedResponses);
      }
      
      // Add motivational style based on preference
      responses.push(...this.getStyleBasedResponses(reminder, userBehavior.preferredMotivationStyle, randomSeed));
    }
    
    // Fallback to context-aware responses if we still need more
    if (responses.length < 3) {
      const contextualResponses = this.generateContextualResponses(reminder, category, randomSeed);
      responses.push(...contextualResponses);
    }
    
    // Ensure we always return varied, task-correlated responses
    return this.ensureTaskCorrelatedVariety(responses, reminder, randomSeed);
  }

  private shuffleArray(array: any[], seed: string): any[] {
    const seedNum = parseInt(seed, 16) || Date.now();
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor((seedNum + i) % (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Generate task-specific responses based on reminder content
  private generateTaskSpecificResponses(reminder: Reminder, category: string, seed: string): string[] {
    const task = reminder.originalMessage.toLowerCase();
    const context = reminder.context?.toLowerCase() || "";
    const responses: string[] = [];
    const seedNum = parseInt(seed, 16) || Date.now();
    
    // Extract key action words from the task
    const actionWords = this.extractActionWords(task);
    const urgencyLevel = this.determineUrgencyLevel(reminder);
    
    // If we have context, generate context-aware responses first (these are higher quality)
    if (context) {
      responses.push(...this.generateContextAwareResponses(reminder.originalMessage, context, urgencyLevel, seedNum));
    }
    
    // Generate contextually relevant responses based on the specific task
    if (actionWords.length > 0) {
      const primaryAction = actionWords[0];
      responses.push(...this.generateActionSpecificResponses(primaryAction, task, urgencyLevel, seedNum));
    }
    
    // Add category-specific intelligent responses
    responses.push(...this.generateCategoryIntelligentResponses(category, task, urgencyLevel, seedNum));
    
    // Add consequence-based responses specific to the task
    responses.push(...this.generateConsequenceBasedResponses(task, category, seedNum));
    
    return responses.slice(0, 4); // Return top 4 most relevant
  }

  // Generate intensified responses for users who respond better to higher rudeness
  private intensifyResponsesForTask(reminder: Reminder, category: string, seed: string): string[] {
    const task = reminder.originalMessage.toLowerCase();
    const responses: string[] = [];
    const seedNum = parseInt(seed, 16) || Date.now();
    
    const intensityTemplates = {
      health: [
        `Seriously? You're still putting off ${task}? Your body deserves better than your excuses!`,
        `${task} isn't going to happen by itself. Stop making your future self pay for today's laziness!`,
        `Every minute you delay ${task}, you're choosing comfort over your wellbeing. Choose better!`
      ],
      work: [
        `${task} is literally your job! Stop scrolling and start doing what you're paid for!`,
        `Your career depends on completing ${task}. Procrastination isn't a professional strategy!`,
        `That promotion you want? It starts with finishing ${task} today, not tomorrow!`
      ],
      personal: [
        `${task} matters to people who matter to you. Stop letting them down!`,
        `You committed to ${task}. Your word should mean something, even to yourself!`,
        `${task} isn't optional if you value your relationships. Make it happen!`
      ],
      general: [
        `${task} has been on your list long enough. Either do it or admit you don't actually want to achieve anything!`,
        `Stop pretending ${task} will magically complete itself. You know what needs to be done!`,
        `${task} is your responsibility. Own it, do it, move on!`
      ]
    };
    
    const templates = intensityTemplates[category as keyof typeof intensityTemplates] || intensityTemplates.general;
    const selectedTemplate = templates[seedNum % templates.length];
    responses.push(selectedTemplate);
    
    return responses;
  }

  // Generate contextual responses when we need more variety
  private generateContextualResponses(reminder: Reminder, category: string, seed: string): string[] {
    const task = reminder.originalMessage;
    const responses: string[] = [];
    const seedNum = parseInt(seed, 16) || Date.now();
    const hour = new Date().getHours();
    
    // Time-aware responses
    if (hour < 9) {
      responses.push(`Start your day right with ${task}. Morning momentum is everything!`);
    } else if (hour > 18) {
      responses.push(`End your day strong by completing ${task}. You'll sleep better knowing it's done!`);
    } else {
      responses.push(`Perfect timing to tackle ${task}. The day is yours to conquer!`);
    }
    
    // Add motivational context based on task category
    const motivationalContext = this.generateMotivationalContext(task, category, seedNum);
    responses.push(...motivationalContext);
    
    return responses;
  }

  // Replace the old ensureResponseVariety with task-correlated variety
  private ensureTaskCorrelatedVariety(responses: string[], reminder: Reminder, seed: string): string[] {
    const task = reminder.originalMessage;
    const uniqueResponses = Array.from(new Set(responses)); // Remove duplicates
    
    // Add task-specific urgency cues
    const urgencyCues = [
      `Don't let ${task} become tomorrow's regret.`,
      `${task} is calling your name. Answer it!`,
      `Your future self is counting on you to complete ${task} today.`,
      `${task} won't get easier by waiting. Start now!`,
      `Every completed ${task} is a win. Collect your victory!`
    ];
    
    const seedIndex = parseInt(seed, 16) % urgencyCues.length;
    const finalResponses = uniqueResponses.slice(0, 5).map((response, index) => {
      const cue = urgencyCues[(seedIndex + index) % urgencyCues.length];
      return `${response} ${cue}`;
    });
    
    return finalResponses;
  }

  // Helper method to extract action words from task description
  private extractActionWords(task: string): string[] {
    const actionPatterns = [
      /\b(call|email|text|message|contact)\b/g,
      /\b(go to|visit|attend|meet)\b/g,
      /\b(finish|complete|submit|send)\b/g,
      /\b(buy|purchase|get|pick up)\b/g,
      /\b(clean|wash|organize|tidy)\b/g,
      /\b(exercise|workout|run|gym)\b/g,
      /\b(study|read|learn|practice)\b/g,
      /\b(cook|prepare|make)\b/g,
      /\b(fix|repair|replace)\b/g,
      /\b(plan|schedule|book)\b/g
    ];
    
    const foundActions: string[] = [];
    actionPatterns.forEach(pattern => {
      const matches = task.match(pattern);
      if (matches) {
        foundActions.push(...matches);
      }
    });
    
    return Array.from(new Set(foundActions)); // Remove duplicates
  }

  // Helper method to determine urgency level
  private determineUrgencyLevel(reminder: Reminder): 'low' | 'medium' | 'high' {
    const scheduledDate = new Date(reminder.scheduledFor);
    const now = new Date();
    const timeDiff = scheduledDate.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    if (hoursDiff < 2) return 'high';
    if (hoursDiff < 24) return 'medium';
    return 'low';
  }

  // Generate action-specific responses
  private generateActionSpecificResponses(action: string, task: string, urgency: string, seed: number): string[] {
    const responses: string[] = [];
    
    const actionTemplates: Record<string, string[]> = {
      'call': [
        `That ${task} conversation isn't getting easier to start. Dial the number and get it over with!`,
        `${task} requires actual human connection. Put down the phone, pick up the phone, and make it happen!`
      ],
      'email': [
        `${task} needs to leave your drafts folder and enter the real world. Hit send!`,
        `Stop overthinking ${task}. Write it, review it once, send it. Done!`
      ],
      'exercise': [
        `${task} is your body's way of asking for respect. Give it what it deserves!`,
        `Every day you skip ${task}, you're choosing weakness over strength. Choose differently!`
      ],
      'clean': [
        `${task} isn't going to happen by itself. Your space affects your mindspace!`,
        `${task} takes 20 minutes but improves your whole week. Start now!`
      ],
      'study': [
        `${task} is an investment in your future self. Start earning those returns!`,
        `Knowledge compounds daily. ${task} is today's deposit in your mental bank!`
      ]
    };
    
    // Find matching templates for the action
    Object.keys(actionTemplates).forEach(key => {
      if (action.includes(key)) {
        const templates = actionTemplates[key];
        responses.push(templates[seed % templates.length]);
      }
    });
    
    return responses;
  }

  // Generate category-intelligent responses
  private generateCategoryIntelligentResponses(category: string, task: string, urgency: string, seed: number): string[] {
    const responses: string[] = [];
    
    const categoryInsights: Record<string, string[]> = {
      health: [
        `${task} is literally about keeping yourself alive and thriving. Priority level: MAXIMUM!`,
        `Your health is your wealth. ${task} is a deposit, not an expense!`
      ],
      work: [
        `${task} affects your professional reputation. People notice who delivers!`,
        `Career momentum starts with completing ${task}. Build that momentum!`
      ],
      personal: [
        `${task} strengthens the relationships that matter. Show up for people who show up for you!`,
        `Personal commitments like ${task} define who you are when no one's watching!`
      ],
      finance: [
        `${task} is about securing your future. Financial stress isn't worth the procrastination!`,
        `Money problems compound with neglect. ${task} is damage control and growth strategy!`
      ],
      household: [
        `${task} creates the environment for your success. Chaotic space = chaotic mind!`,
        `${task} is self-care disguised as chores. Take care of your space, take care of yourself!`
      ]
    };
    
    const insights = categoryInsights[category] || [
      `${task} matters because you put it on your list. Honor your own priorities!`,
      `${task} is your commitment to yourself. Keep your word, especially to you!`
    ];
    
    responses.push(insights[seed % insights.length]);
    return responses;
  }

  // Generate consequence-based responses
  private generateConsequenceBasedResponses(task: string, category: string, seed: number): string[] {
    const responses: string[] = [];
    
    const consequenceFrames = [
      `If you don't complete ${task} today, what excuse will you give tomorrow?`,
      `${task} delayed is confidence eroded. Build yourself up instead!`,
      `The cost of avoiding ${task} is higher than the effort to do it. Pay now, not later!`,
      `Future you is either grateful for today's action on ${task} or frustrated by today's inaction!`
    ];
    
    responses.push(consequenceFrames[seed % consequenceFrames.length]);
    return responses;
  }

  // Generate motivational context
  private generateMotivationalContext(task: string, category: string, seed: number): string[] {
    const contexts = [
      `${task} is your chance to prove your commitment to yourself!`,
      `Every completed ${task} builds the habit of following through!`,
      `${task} completed = promise kept to yourself. That's how trust is built!`,
      `${task} is small but significant. Small actions, big character!`
    ];
    
    return [contexts[seed % contexts.length]];
  }

  private getStyleBasedResponses(reminder: Reminder, style: string, seed: string): string[] {
    const baseMessage = reminder.originalMessage;
    const category = this.categorizeReminder(baseMessage);
    
    const styleResponses = {
      'tough-love': this.getToughLoveResponses(baseMessage, category),
      'encouraging': this.getEncouragingResponses(baseMessage, category),
      'humorous': this.getHumorousResponses(baseMessage, category),
      'direct': this.getDirectResponses(baseMessage, category)
    };
    
    const responses = styleResponses[style as keyof typeof styleResponses] || styleResponses.direct;
    return this.shuffleArray(responses, seed);
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
      `${baseMessage} - Every small action counts towards your bigger goals.`,
      `${baseMessage} - Believe in yourself, you're capable of amazing things.`
    ];

    switch (category) {
      case 'health':
        base.push(`${baseMessage} - Your body will thank you for this care!`);
        break;
      case 'work':
        base.push(`${baseMessage} - Great careers are built one task at a time!`);
        break;
      case 'personal':
        base.push(`${baseMessage} - Relationships bloom with consistent attention!`);
        break;
    }
    return base;
  }

  private getHumorousResponses(baseMessage: string, category: string): string[] {
    const base = [
      `${baseMessage} - Your procrastination skills are impressive, but maybe try productivity instead?`,
      `${baseMessage} - Even your cat is judging your task-avoidance techniques.`,
      `${baseMessage} - Netflix will still be there after you finish this!`
    ];

    switch (category) {
      case 'health':
        base.push(`${baseMessage} - Your body called, it wants its maintenance back!`);
        break;
      case 'work':
        base.push(`${baseMessage} - Work hard, nap harder... but work first!`);
        break;
      case 'personal':
        base.push(`${baseMessage} - Social battery low? This will charge it right up!`);
        break;
    }
    return base;
  }

  private getDirectResponses(baseMessage: string, category: string): string[] {
    return [
      `${baseMessage} - Do it now.`,
      `${baseMessage} - Complete this task.`,
      `${baseMessage} - Take action immediately.`
    ];
  }

  private async getUserBehaviorData(userId: string): Promise<UserBehaviorData | null> {
    // Mock behavior data - in a real app this would come from analytics
    return null;
  }

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

  // Generate high-quality context-aware responses using user's provided context
  private generateContextAwareResponses(task: string, context: string, urgencyLevel: string, seedNum: number): string[] {
    const responses: string[] = [];
    
    // Analyze the context to understand why this task matters
    const contextIndicators = {
      important: /important|crucial|critical|vital|urgent|deadline|client|boss|meeting/i.test(context),
      health: /health|doctor|medicine|exercise|diet|medical|fitness|wellbeing/i.test(context),
      family: /family|mom|dad|kids|children|spouse|wife|husband|parents|relatives/i.test(context),
      work: /work|job|career|promotion|client|project|business|professional/i.test(context),
      financial: /money|bills|finance|budget|payment|debt|savings|investment/i.test(context),
      social: /friends|social|promise|commitment|event|party|celebration/i.test(context),
      personal: /promised|committed|goal|dream|resolution|habit|self-improvement/i.test(context)
    };

    // Generate responses that directly reference the user's context
    if (contextIndicators.important) {
      responses.push(`${task} - this is clearly important to you because ${context}. Don't let yourself down!`);
      responses.push(`You know ${context} - that's exactly why ${task} can't wait any longer!`);
    }

    if (contextIndicators.health) {
      responses.push(`Your health is on the line here! ${task} matters because ${context}. Take care of yourself!`);
      responses.push(`${context}? Then ${task} isn't optional - it's essential for your wellbeing!`);
    }

    if (contextIndicators.family) {
      responses.push(`${task} affects the people you love most. Since ${context}, this really matters!`);
      responses.push(`Family first! ${task} is important because ${context} - don't let them down!`);
    }

    if (contextIndicators.work) {
      responses.push(`Your professional reputation depends on this! ${task} is crucial because ${context}.`);
      responses.push(`Career advancement starts with completing ${task}. You said ${context} - prove it!`);
    }

    if (contextIndicators.financial) {
      responses.push(`Money talks, and right now it's saying: complete ${task}! You know ${context}.`);
      responses.push(`Financial security requires action. ${task} is important because ${context} - secure your future!`);
    }

    if (contextIndicators.social) {
      responses.push(`Your relationships matter! ${task} is on your list because ${context} - honor your commitments!`);
      responses.push(`${context}? Then ${task} isn't just about you - keep your word!`);
    }

    if (contextIndicators.personal) {
      responses.push(`You made a commitment to yourself: ${task}. Remember, ${context} - stay true to your goals!`);
      responses.push(`Personal growth requires follow-through. ${task} matters because ${context} - be who you want to be!`);
    }

    // If context doesn't match patterns, create general but personalized responses
    if (responses.length === 0) {
      responses.push(`${task} is on your list for a reason: ${context}. That reason still matters!`);
      responses.push(`You told me ${context} - that's exactly why ${task} deserves your attention right now!`);
      responses.push(`Don't ignore what you said matters: ${context}. Complete ${task} and honor your priorities!`);
    }

    // Add urgency based on context
    if (urgencyLevel === 'high' || contextIndicators.important) {
      responses.push(`URGENT: ${context} means ${task} can't be postponed. Act now!`);
    }

    return responses.slice(0, 3); // Return top 3 context-aware responses
  }
}

export const smartResponseService = new SmartResponseService();