interface CulturalQuote {
  quote: string;
  author: string;
  category: string;
  culturalBackground: string[];
}

// Expanded culturally diverse motivational quotes
export const culturalQuotes: CulturalQuote[] = [
  // American Historical Figures
  {
    quote: "The only way to do great work is to love what you do.",
    author: "Steve Jobs",
    category: "Business Innovators",
    culturalBackground: ["american"]
  },
  {
    quote: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    author: "Winston Churchill",
    category: "Historical Leaders", 
    culturalBackground: ["british"]
  },
  {
    quote: "The way to get started is to quit talking and begin doing.",
    author: "Walt Disney",
    category: "Life Coaches",
    culturalBackground: ["american"]
  },

  // African American Leaders
  {
    quote: "The time is always right to do what is right.",
    author: "Martin Luther King Jr.",
    category: "Historical Leaders",
    culturalBackground: ["african-american", "american"]
  },
  {
    quote: "If you don't like something, change it. If you can't change it, change your attitude.",
    author: "Maya Angelou",
    category: "Life Coaches", 
    culturalBackground: ["african-american", "american"]
  },
  {
    quote: "Champions aren't made in gyms. Champions are made from something deep inside them: a desire, a dream, a vision.",
    author: "Muhammad Ali",
    category: "Sports Champions",
    culturalBackground: ["african-american", "american"]
  },

  // Hispanic/Latino Leaders
  {
    quote: "If you want to be successful, find someone who has achieved the results you want and copy what they do and you'll achieve the same results.",
    author: "Tony Robbins",
    category: "Life Coaches",
    culturalBackground: ["hispanic-latino", "american"]
  },

  // Asian Leaders
  {
    quote: "Vision without execution is just hallucination.",
    author: "Thomas Edison", 
    category: "Great Minds",
    culturalBackground: ["american"]
  },
  {
    quote: "Your time is limited, don't waste it living someone else's life.",
    author: "Steve Jobs", 
    category: "Business Innovators",
    culturalBackground: ["american"]
  },

  // Chinese Wisdom
  {
    quote: "It does not matter how slowly you go as long as you do not stop.",
    author: "Confucius",
    category: "Great Minds",
    culturalBackground: ["chinese"]
  },
  {
    quote: "The man who moves a mountain begins by carrying away small stones.",
    author: "Confucius",
    category: "Great Minds", 
    culturalBackground: ["chinese"]
  },

  // Indian Philosophy
  {
    quote: "Be yourself; everyone else is already taken.",
    author: "Mahatma Gandhi",
    category: "Historical Leaders",
    culturalBackground: ["indian"]
  },
  {
    quote: "Live as if you were to die tomorrow. Learn as if you were to live forever.",
    author: "Mahatma Gandhi", 
    category: "Historical Leaders",
    culturalBackground: ["indian"]
  },

  // Japanese Wisdom
  {
    quote: "Fall seven times, get up eight.",
    author: "Japanese Proverb",
    category: "Life Coaches",
    culturalBackground: ["japanese"]
  },

  // African Leaders
  {
    quote: "It always seems impossible until it's done.",
    author: "Nelson Mandela",
    category: "Historical Leaders",
    culturalBackground: ["african"]
  },
  {
    quote: "The greatest glory in living lies not in never falling, but in rising every time we fall.",
    author: "Nelson Mandela",
    category: "Historical Leaders", 
    culturalBackground: ["african"]
  },

  // Middle Eastern Wisdom
  {
    quote: "Yesterday is gone. Tomorrow has not yet come. We have only today. Let us begin.",
    author: "Mother Teresa",
    category: "Life Coaches",
    culturalBackground: ["middle-eastern"]
  },

  // Mexican/Latin American
  {
    quote: "They thought they could bury us, but they didn't know we were seeds.",
    author: "Mexican Proverb", 
    category: "Life Coaches",
    culturalBackground: ["mexican", "hispanic-latino"]
  },

  // Brazilian
  {
    quote: "I learned that courage was not the absence of fear, but the triumph over it.",
    author: "Paulo Coelho",
    category: "Life Coaches",
    culturalBackground: ["brazilian"]
  },

  // German Philosophy
  {
    quote: "What does not kill me, makes me stronger.",
    author: "Friedrich Nietzsche",
    category: "Great Minds",
    culturalBackground: ["german"]
  },

  // French Inspiration
  {
    quote: "The only impossible journey is the one you never begin.",
    author: "Tony Robbins",
    category: "Life Coaches", 
    culturalBackground: ["french"]
  },

  // Universal Gender-Specific Motivation
  {
    quote: "A woman is like a tea bag; you never know how strong it is until it's in hot water.",
    author: "Eleanor Roosevelt",
    category: "Historical Leaders",
    culturalBackground: ["american"]
  },
  {
    quote: "Well-behaved women seldom make history.",
    author: "Laurel Thatcher Ulrich",
    category: "Historical Leaders",
    culturalBackground: ["american"]
  },
];

export class CulturalQuotesService {
  // Get quotes filtered by user's cultural background
  static getQuotesForCulture(ethnicity: string): CulturalQuote[] {
    return culturalQuotes.filter(quote => 
      quote.culturalBackground.includes(ethnicity)
    );
  }

  // Get quotes filtered by category and culture
  static getQuotesForCultureAndCategory(ethnicity: string, category: string): CulturalQuote[] {
    return culturalQuotes.filter(quote => 
      quote.culturalBackground.includes(ethnicity) && 
      quote.category === category
    );
  }

  // Get random quote based on user preferences
  static getPersonalizedQuote(
    ethnicity?: string, 
    enableCulturalFiltering?: boolean,
    gender?: string,
    enableGenderFiltering?: boolean
  ): string {
    let filteredQuotes = [...culturalQuotes];

    // Filter by cultural background if enabled
    if (enableCulturalFiltering && ethnicity) {
      const culturalQuotes = this.getQuotesForCulture(ethnicity);
      if (culturalQuotes.length > 0) {
        filteredQuotes = culturalQuotes;
      }
    }

    // Additional gender-specific filtering could be added here
    if (enableGenderFiltering && gender) {
      // For now, we include all quotes but this could be expanded
      // to have gender-specific quote collections
    }

    // Return random quote from filtered collection
    if (filteredQuotes.length === 0) {
      filteredQuotes = culturalQuotes; // Fallback to all quotes
    }

    const randomQuote = filteredQuotes[Math.floor(Math.random() * filteredQuotes.length)];
    return `${randomQuote.quote} - ${randomQuote.author}`;
  }

  // Get available cultural backgrounds
  static getAvailableCultures(): string[] {
    const cultures = new Set<string>();
    culturalQuotes.forEach(quote => {
      quote.culturalBackground.forEach(culture => cultures.add(culture));
    });
    return Array.from(cultures).sort();
  }

  // Get statistics about cultural representation
  static getCulturalStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    culturalQuotes.forEach(quote => {
      quote.culturalBackground.forEach(culture => {
        stats[culture] = (stats[culture] || 0) + 1;
      });
    });
    return stats;
  }
}