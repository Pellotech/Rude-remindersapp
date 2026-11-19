import { languageInfo, type LanguageCode } from "@shared/languages";

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
  genderSpecificReminders?: boolean;
  culturalBackground?: string;
  timeOfDay: string;
  clientLocalTime?: string;
  /** Write the messages in this language (default English) */
  language?: LanguageCode;
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

      // Use client's local time if provided; fall back to server UTC only as last resort
      const currentDateTimeStr = context.clientLocalTime || new Date().toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

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
              content: `The current date and time for the user is: ${currentDateTimeStr}. Use this to make your reminder message time-aware and accurate. Do NOT assume it is night, morning, or any specific time of day unless it matches this timestamp. Never say "before you sleep", "tonight", "this morning" etc. unless the current time actually supports that.\n\nYou are a motivational reminder assistant that generates fresh, personalized reminder messages. Be creative, engaging, and avoid repetitive patterns.${context.language && context.language !== 'en' ? `\n\nWrite every message in ${languageInfo(context.language).english}. Use natural, everyday ${languageInfo(context.language).english} the way a witty native speaker talks, not a word-for-word translation of English.` : ''}`
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

      const parsed = this.parseResponses(content, count, context.language);
      return this.scoreAndRankResponses(parsed, context.rudenessLevel, context.task);
    } catch (error) {
      const { log: slog } = await import('../utils/logger');
      slog.error('ai_generation_failed', {
        provider: 'deepseek',
        task: context.task,
        rudenessLevel: context.rudenessLevel,
        retryCount: 0,
        error: error instanceof Error ? error.message : String(error),
      });
      // Fallback to basic responses if API fails
      return this.generateFallbackResponses(context, count);
    }
  }

  private buildPrompt(context: ReminderContext, count: number): string {
    const { task, category, rudenessLevel, gender, genderSpecificReminders, culturalBackground, timeOfDay } = context;
    
    const rudenessMap = {
      1: 'SYMPATHETIC and encouraging — warm, kind and understanding. Acknowledge that it might be hard, that they may be tired, busy or not feeling it, then gently encourage them that even a small step counts and that you believe in them. No sarcasm, no teasing, no insults, no pressure or guilt',
      2: 'motivational and uplifting',
      3: 'direct and no-nonsense with sarcastic humor - be witty and clever',
      4: 'tough love and brutally honest with joking tone at the end - roast them but make them laugh',
      5: 'harshly motivating and unfiltered with humor at the end - be savage but hilarious'
    };

    const tone = rudenessMap[rudenessLevel as keyof typeof rudenessMap] || 'motivating';
    
    // Build gender-specific guidance if enabled
    let genderGuidance = '';
    if (genderSpecificReminders && gender) {
      if (gender === 'male') {
        genderGuidance = '\n- Use masculine terms like "Big guy", "Chief", "Sir", "Mr", or "Boss" when appropriate';
      } else if (gender === 'female') {
        genderGuidance = '\n- Use friendly, encouraging terms that feel supportive and empowering';
      } else {
        genderGuidance = '\n- Use respectful, gender-neutral language throughout';
      }
    }
    
    return `Generate ${count} unique, personalized reminder messages for this task: "${task}"

Context:
- Category: ${category}
- Tone: ${tone} (level ${rudenessLevel}/5)
- Time: ${timeOfDay}
${gender ? `- User identifies as: ${gender}` : ''}
${culturalBackground ? `- Cultural background: ${culturalBackground}` : ''}${genderGuidance}

Requirements:
1. Each message must start with a DIFFERENT opening word or phrase — vary your openers creatively. Do NOT start more than one message with the same word. If you use "Time to" or "Don't forget" use it maximum once across all ${count} messages.
2. Make each response unique and fresh - no repetitive patterns
3. Consider the specific category context (${category})
4. Match the requested tone level - for levels 3-5, include humor/jokes/wit but keep it motivational
5. Keep responses concise but impactful (1-2 sentences max)
6. Make it feel personal and motivational, not generic
7. For sarcastic/joking tones: Use clever wordplay, witty observations, or playful roasts that make people smile while pushing them to act
8. Reference the actual task ("${task}") creatively rather than just saying it generically

${context.language && context.language !== 'en' ? `LANGUAGE: Write all ${count} messages in ${languageInfo(context.language).english}. Keep the task wording recognisable. The rules about English openers above apply to their ${languageInfo(context.language).english} equivalents.

` : ''}${rudenessLevel === 1 ? `9. SYMPATHY LEVEL: lead with empathy ("I know it's been a long day", "It's okay if you're not feeling it"), then encourage. Sound like a caring friend, never a drill sergeant.

` : ''}Format: Return exactly ${count} messages, one per line, numbered 1-${count}.`;
  }

  private parseResponses(content: string, expectedCount: number, language?: LanguageCode): string[] {
    // Chinese, Japanese and Korean pack a full sentence into fewer characters
    const minLength = language === 'zh' || language === 'ja' || language === 'ko' ? 4 : 10;
    // Extract numbered responses from the AI output
    const lines = content.split('\n').filter(line => line.trim());
    const responses: string[] = [];
    
    for (const line of lines) {
      // Match patterns like "1. message" or "1) message" or just "message"
      const match = line.match(/^\d+[.)]\s*(.+)$/) || [null, line.trim()];
      if (match[1] && match[1].length > minLength) { // Ensure meaningful response
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
    
    if (rudenessLevel === 1) {
      return [
        `I know it's not always easy, but ${task} is worth it — and so are you.`,
        `Long day? Even a small step toward "${task}" counts. I believe in you.`,
        `It's okay if you're not feeling it. Just start "${task}" — you've got more in you than you think.`,
        `Be kind to yourself today, and when you're ready, ${task}. You've got this.`,
      ].slice(0, count);
    }

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

  private scoreResponse(message: string, rudenessLevel: number, taskText: string): number {
    let score = 0;

    const weakOpeners = ['Time to', "It's time", "Don't forget", 'Reminder:', 'Just a reminder'];
    if (weakOpeners.some(o => message.startsWith(o))) score -= 1;

    const taskWords = taskText.toLowerCase().split(' ');
    if (taskWords.some(w => w.length > 3 && message.toLowerCase().includes(w))) score += 2;

    if (message.includes('?')) score += 1;

    if (rudenessLevel >= 4 && message.includes(',')) score += 1;

    const words = message.split(' ').length;
    if (words >= 8 && words <= 25) score += 1;

    return score;
  }

  private scoreAndRankResponses(responses: string[], rudenessLevel: number, taskText: string): string[] {
    if (responses.length <= 2) return responses;

    const scored = responses.map((msg, idx) => ({
      msg,
      idx,
      score: this.scoreResponse(msg, rudenessLevel, taskText),
    }));

    scored.sort((a, b) => b.score - a.score);

    const top2 = scored.slice(0, 2).sort((a, b) => a.idx - b.idx);
    const rest = scored.slice(2).sort((a, b) => a.idx - b.idx);

    return [...top2.map(x => x.msg), ...rest.map(x => x.msg)];
  }

  /**
   * Translates short app messages into another language, keeping the tone
   * (sarcastic stays sarcastic) and any emoji. Returns null on any failure so
   * callers can fall back to English.
   */
  async translateLines(lines: string[], language: LanguageCode): Promise<string[] | null> {
    if (lines.length === 0) return [];
    const target = languageInfo(language).english;
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
              role: 'system',
              content: `You translate short messages from a cheeky reminder app into ${target}. Keep the meaning, tone and humour (kind stays kind, sarcastic stays sarcastic, savage stays savage), and keep emoji. Sound like a natural, witty native ${target} speaker, not a literal translation. Keep the user's own task wording recognisable. Reply with only a JSON array of strings: the translations, in the same order and the same count as the input.`
            },
            { role: 'user', content: JSON.stringify(lines) }
          ],
          temperature: 0.3,
          max_tokens: Math.min(4000, 200 + lines.join(' ').length * 3)
        })
      });
      if (!response.ok) throw new Error(`DeepSeek API error: ${response.status}`);
      const data: DeepSeekResponse = await response.json();
      const content = data.choices[0]?.message?.content ?? '';
      const jsonText = content.slice(content.indexOf('['), content.lastIndexOf(']') + 1);
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed) || parsed.length !== lines.length || !parsed.every((s) => typeof s === 'string' && s.trim())) {
        throw new Error('translation came back in the wrong shape');
      }
      return parsed.map((s: string) => s.trim());
    } catch (error) {
      const { log: slog } = await import('../utils/logger');
      slog.error('ai_translation_failed', {
        provider: 'deepseek',
        language,
        count: lines.length,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
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