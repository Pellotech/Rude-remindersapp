// Service for fetching motivational quotes from historical figures
export interface HistoricalQuote {
  quote: string;
  author: string;
  category: string;
}

// Sample database of historical quotes (will be replaced with API calls)
const historicalQuotes: Record<string, HistoricalQuote[]> = {
  sports: [
    {
      quote: "Float like a butterfly, sting like a bee.",
      author: "Muhammad Ali",
      category: "sports"
    },
    {
      quote: "I've failed over and over again in my life. That's why I succeed.",
      author: "Michael Jordan",
      category: "sports"
    },
    {
      quote: "Champions are made from something they have deep inside them - a desire, a dream, a vision.",
      author: "Muhammad Ali",
      category: "sports"
    },
    {
      quote: "You have to expect things of yourself before you can do them.",
      author: "Michael Jordan",
      category: "sports"
    },
    {
      quote: "I really think a champion is defined not by their wins but by how they can recover when they fall.",
      author: "Serena Williams",
      category: "sports"
    }
  ],
  historical: [
    {
      quote: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
      author: "Winston Churchill",
      category: "historical"
    },
    {
      quote: "The best way to predict the future is to create it.",
      author: "Abraham Lincoln",
      category: "historical"
    },
    {
      quote: "It always seems impossible until it's done.",
      author: "Nelson Mandela",
      category: "historical"
    },
    {
      quote: "I have a dream that one day this nation will rise up and live out the true meaning of its creed.",
      author: "Martin Luther King Jr.",
      category: "historical"
    },
    {
      quote: "The only thing we have to fear is fear itself.",
      author: "Franklin D. Roosevelt",
      category: "historical"
    }
  ],
  entrepreneurs: [
    {
      quote: "Innovation distinguishes between a leader and a follower.",
      author: "Steve Jobs",
      category: "entrepreneurs"
    },
    {
      quote: "Success is a lousy teacher. It seduces smart people into thinking they can't lose.",
      author: "Bill Gates",
      category: "entrepreneurs"
    },
    {
      quote: "When something is important enough, you do it even if the odds are not in your favor.",
      author: "Elon Musk",
      category: "entrepreneurs"
    },
    {
      quote: "The biggest risk is not taking any risk.",
      author: "Mark Zuckerberg",
      category: "entrepreneurs"
    },
    {
      quote: "Your work is going to fill a large part of your life, and the only way to be truly satisfied is to do what you believe is great work.",
      author: "Steve Jobs",
      category: "entrepreneurs"
    }
  ],
  scientists: [
    {
      quote: "Imagination is more important than knowledge.",
      author: "Albert Einstein",
      category: "scientists"
    },
    {
      quote: "Nothing in life is to be feared, it is only to be understood.",
      author: "Marie Curie",
      category: "scientists"
    },
    {
      quote: "Look up at the stars and not down at your feet.",
      author: "Stephen Hawking",
      category: "scientists"
    },
    {
      quote: "The present is theirs; the future, for which I really worked, is mine.",
      author: "Nikola Tesla",
      category: "scientists"
    },
    {
      quote: "If I have seen further it is by standing on the shoulders of giants.",
      author: "Isaac Newton",
      category: "scientists"
    }
  ],
  motivational: [
    {
      quote: "The way to get started is to quit talking and begin doing.",
      author: "Walt Disney",
      category: "motivational"
    },
    {
      quote: "Don't be afraid to give up the good to go for the great.",
      author: "John D. Rockefeller",
      category: "motivational"
    },
    {
      quote: "Believe you can and you're halfway there.",
      author: "Theodore Roosevelt",
      category: "motivational"
    },
    {
      quote: "The only impossible journey is the one you never begin.",
      author: "Tony Robbins",
      category: "motivational"
    },
    {
      quote: "Try to be a rainbow in someone's cloud.",
      author: "Maya Angelou",
      category: "motivational"
    }
  ]
};

export class QuotesService {
  // Get a random quote from a specific category
  static getRandomQuote(category: string): HistoricalQuote | null {
    const categoryQuotes = historicalQuotes[category];
    if (!categoryQuotes || categoryQuotes.length === 0) {
      return null;
    }
    
    const randomIndex = Math.floor(Math.random() * categoryQuotes.length);
    return categoryQuotes[randomIndex];
  }

  // Get all quotes from a category
  static getQuotesByCategory(category: string): HistoricalQuote[] {
    return historicalQuotes[category] || [];
  }

  // Get all available categories
  static getCategories(): string[] {
    return Object.keys(historicalQuotes);
  }

  // Format quote for display
  static formatQuote(quote: HistoricalQuote): string {
    return `"${quote.quote}" - ${quote.author}`;
  }

  // Future: API integration with ZenQuotes or API Ninjas
  static async fetchQuoteFromAPI(category: string): Promise<HistoricalQuote | null> {
    // This will be implemented when we add real API integration
    // For now, return from local database
    return this.getRandomQuote(category);
  }
}