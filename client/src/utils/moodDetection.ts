// Mood detection utility for reminder tone analysis
export type ReminderMood = 'motivational' | 'harsh' | 'humorous' | 'gentle' | 'aggressive' | 'sarcastic';

export interface MoodAnalysis {
  mood: ReminderMood;
  confidence: number; // 1-10
  keywords: string[];
}

// Keyword patterns for different moods
const moodKeywords = {
  motivational: [
    'achieve', 'succeed', 'accomplish', 'reach', 'goal', 'dream', 'potential', 
    'overcome', 'progress', 'improve', 'excellence', 'victory', 'triumph', 
    'inspire', 'empower', 'believe', 'confident', 'strength', 'determination'
  ],
  harsh: [
    'stop being', 'quit making', 'enough excuses', 'pathetic', 'weak', 'failure',
    'disappointing', 'useless', 'waste', 'lazy', 'procrastinating', 'terrible',
    'awful', 'horrible', 'disgusting', 'shameful', 'embarrassing'
  ],
  humorous: [
    'lol', 'haha', 'funny', 'joke', 'hilarious', 'ridiculous', 'silly', 'absurd',
    'comedy', 'amusing', 'witty', 'clever', 'ironic', 'sarcasm', 'meme',
    'epic fail', 'seriously?', 'really?', 'come on'
  ],
  gentle: [
    'kindly', 'please', 'gently', 'softly', 'calmly', 'peacefully', 'lovingly',
    'sweetly', 'tenderly', 'warmly', 'friendly', 'nice', 'pleasant', 'polite',
    'courteous', 'respectful', 'considerate', 'thoughtful'
  ],
  aggressive: [
    'NOW!', 'IMMEDIATELY', 'RIGHT NOW', 'GET OFF', 'MOVE IT', 'HURRY UP',
    'STOP WASTING', 'GET UP', 'DO IT', 'NO EXCUSES', 'JUST DO',
    'angry', 'furious', 'mad', 'annoyed', 'irritated', 'frustrated'
  ],
  sarcastic: [
    'oh sure', 'great job', 'brilliant', 'fantastic', 'wonderful', 'amazing',
    'perfect', 'lovely', 'absolutely', 'totally', 'definitely', 'obviously',
    'clearly', 'sure thing', 'right', 'uh huh', 'yeah right'
  ]
};

// Intensity words that boost confidence
const intensityWords = [
  'very', 'extremely', 'absolutely', 'completely', 'totally', 'really',
  'seriously', 'definitely', 'certainly', 'obviously', 'clearly'
];

export function detectReminderMood(message: string): MoodAnalysis {
  if (!message) {
    return { mood: 'gentle', confidence: 1, keywords: [] };
  }

  const lowerMessage = message.toLowerCase();
  const scores: Record<ReminderMood, number> = {
    motivational: 0,
    harsh: 0,
    humorous: 0,
    gentle: 0,
    aggressive: 0,
    sarcastic: 0
  };

  const foundKeywords: string[] = [];

  // Count keyword matches for each mood
  for (const [mood, keywords] of Object.entries(moodKeywords)) {
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        scores[mood as ReminderMood]++;
        foundKeywords.push(keyword);
        
        // Boost score if intensity words are nearby
        const keywordIndex = lowerMessage.indexOf(keyword.toLowerCase());
        const surrounding = lowerMessage.substring(
          Math.max(0, keywordIndex - 20), 
          keywordIndex + keyword.length + 20
        );
        
        for (const intensifier of intensityWords) {
          if (surrounding.includes(intensifier)) {
            scores[mood as ReminderMood] += 0.5;
            break;
          }
        }
      }
    }
  }

  // Check for punctuation patterns
  const exclamationCount = (message.match(/!/g) || []).length;
  const questionCount = (message.match(/\?/g) || []).length;
  const capsCount = (message.match(/[A-Z]{2,}/g) || []).length;

  // Aggressive indicators
  if (exclamationCount >= 2 || capsCount >= 2) {
    scores.aggressive += exclamationCount + capsCount;
  }

  // Sarcastic indicators (questions + certain patterns)
  if (questionCount > 0 && (lowerMessage.includes('really') || lowerMessage.includes('seriously'))) {
    scores.sarcastic += questionCount * 2;
  }

  // Find the mood with highest score
  let topMood: ReminderMood = 'gentle';
  let topScore = 0;

  for (const [mood, score] of Object.entries(scores)) {
    if (score > topScore) {
      topScore = score;
      topMood = mood as ReminderMood;
    }
  }

  // Calculate confidence (1-10 scale)
  const totalWords = message.split(' ').length;
  const keywordDensity = foundKeywords.length / Math.max(totalWords, 1);
  const confidence = Math.min(10, Math.max(1, Math.round(topScore + keywordDensity * 5)));

  // Default to gentle if no clear mood detected
  if (topScore === 0) {
    topMood = 'gentle';
  }

  return {
    mood: topMood,
    confidence,
    keywords: foundKeywords.slice(0, 5) // Limit to top 5 keywords
  };
}

// Get UI styling based on mood
export function getMoodStyling(mood: ReminderMood) {
  switch (mood) {
    case 'motivational':
      return {
        cardClass: 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50',
        badgeClass: 'bg-green-500 text-white',
        textColor: 'text-green-800',
        icon: '🚀',
        bgGradient: 'from-green-400 to-emerald-500'
      };
    case 'harsh':
      return {
        cardClass: 'border-red-500 bg-gradient-to-br from-red-50 to-rose-50',
        badgeClass: 'bg-red-500 text-white',
        textColor: 'text-red-800',
        icon: '⚡',
        bgGradient: 'from-red-400 to-rose-500'
      };
    case 'humorous':
      return {
        cardClass: 'border-yellow-500 bg-gradient-to-br from-yellow-50 to-amber-50',
        badgeClass: 'bg-yellow-500 text-white',
        textColor: 'text-yellow-800',
        icon: '😄',
        bgGradient: 'from-yellow-400 to-amber-500'
      };
    case 'gentle':
      return {
        cardClass: 'border-blue-500 bg-gradient-to-br from-blue-50 to-sky-50',
        badgeClass: 'bg-blue-500 text-white',
        textColor: 'text-blue-800',
        icon: '🕊️',
        bgGradient: 'from-blue-400 to-sky-500'
      };
    case 'aggressive':
      return {
        cardClass: 'border-orange-500 bg-gradient-to-br from-orange-50 to-red-50',
        badgeClass: 'bg-orange-500 text-white',
        textColor: 'text-orange-800',
        icon: '🔥',
        bgGradient: 'from-orange-400 to-red-500'
      };
    case 'sarcastic':
      return {
        cardClass: 'border-purple-500 bg-gradient-to-br from-purple-50 to-indigo-50',
        badgeClass: 'bg-purple-500 text-white',
        textColor: 'text-purple-800',
        icon: '😏',
        bgGradient: 'from-purple-400 to-indigo-500'
      };
    default:
      return {
        cardClass: 'border-gray-200 bg-white',
        badgeClass: 'bg-gray-500 text-white',
        textColor: 'text-gray-800',
        icon: '💬',
        bgGradient: 'from-gray-400 to-gray-500'
      };
  }
}

// Get mood description for users
export function getMoodDescription(mood: ReminderMood): string {
  switch (mood) {
    case 'motivational':
      return 'Inspiring and encouraging';
    case 'harsh':
      return 'Direct and uncompromising';
    case 'humorous':
      return 'Light-hearted and funny';
    case 'gentle':
      return 'Kind and supportive';
    case 'aggressive':
      return 'Intense and urgent';
    case 'sarcastic':
      return 'Witty and ironic';
    default:
      return 'Neutral tone';
  }
}