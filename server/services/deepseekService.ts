interface DeepSeekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface ReminderContext {
  task: string;
  category: string;
  rudenessLevel: number;
  gender?: string;
  culturalBackground?: string;
  timeOfDay: string;
}

export class DeepSeekService {
  private apiKey: string;
  private baseUrl = 'https://api.deepseek.com/v1';

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('DEEPSEEK_API_KEY environment variable is required');
    }
  }

  async generatePersonalizedResponses(context: ReminderContext, count: number = 4): Promise<string[]> {
    try {
      const prompt = this.buildPrompt(context, count);
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are a motivational reminder assistant that generates fresh, personalized reminder messages. Be creative, engaging, and avoid repetitive patterns.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
      }

      const data: DeepSeekResponse = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content received from DeepSeek API');
      }

      return this.parseResponses(content, count);
    } catch (error) {
      console.error('DeepSeek API error:', error);
      // Fallback to basic responses if API fails
      return this.generateFallbackResponses(context, count);
    }
  }

  private buildPrompt(context: ReminderContext, count: number): string {
    const { task, category, rudenessLevel, gender, culturalBackground, timeOfDay } = context;
    
    const rudenessMap = {
      1: 'gentle and encouraging',
      2: 'friendly but motivating',
      3: 'direct and no-nonsense',
      4: 'tough love and brutally honest',
      5: 'harshly motivating and unfiltered'
    };

    const tone = rudenessMap[rudenessLevel as keyof typeof rudenessMap] || 'motivating';
    
    return `Generate ${count} unique, personalized reminder messages for this task: "${task}"

Context:
- Category: ${category}
- Tone: ${tone} (level ${rudenessLevel}/5)
- Time: ${timeOfDay}
${gender ? `- User identifies as: ${gender}` : ''}
${culturalBackground ? `- Cultural background: ${culturalBackground}` : ''}

Requirements:
1. Each message should start with "Time to" or similar action-oriented phrasing
2. Make each response unique and fresh - no repetitive patterns
3. Consider the specific category context (${category})
4. Match the requested tone level
5. Keep responses concise but impactful (1-2 sentences max)
6. Make it feel personal and motivational, not generic

Format: Return exactly ${count} messages, one per line, numbered 1-${count}.`;
  }

  private parseResponses(content: string, expectedCount: number): string[] {
    // Extract numbered responses from the AI output
    const lines = content.split('\n').filter(line => line.trim());
    const responses: string[] = [];
    
    for (const line of lines) {
      // Match patterns like "1. message" or "1) message" or just "message"
      const match = line.match(/^\d+[.)]\s*(.+)$/) || [null, line.trim()];
      if (match[1] && match[1].length > 10) { // Ensure meaningful response
        responses.push(match[1]);
      }
    }

    // If we don't get enough responses, pad with variations
    while (responses.length < expectedCount && responses.length > 0) {
      const base = responses[responses.length % responses.length];
      responses.push(base.replace(/Time to/, 'Now\'s the time to'));
    }

    return responses.slice(0, expectedCount);
  }

  private generateFallbackResponses(context: ReminderContext, count: number): string[] {
    const { task, rudenessLevel } = context;
    
    const fallbacks = [
      `Time to ${task} - your future self will thank you!`,
      `Ready to tackle "${task}"? Let's make it happen!`,
      `${task} is calling your name - time to answer!`,
      `Every moment you delay "${task}" is a missed opportunity!`
    ];

    if (rudenessLevel >= 4) {
      fallbacks.push(
        `Seriously, ${task} isn't going to do itself!`,
        `Stop procrastinating and just ${task} already!`
      );
    }

    return fallbacks.slice(0, count);
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'user',
              content: 'Say "API connection successful" if you can read this.'
            }
          ],
          max_tokens: 50
        })
      });

      return response.ok;
    } catch (error) {
      console.error('DeepSeek connection test failed:', error);
      return false;
    }
  }
}