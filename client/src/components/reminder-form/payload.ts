// Create Reminder form: the extra details sent with every new reminder.
import { getFullApiUrl, getAuthToken } from "@/lib/queryClient";
import { getEffectiveTimeZone } from "@/lib/timeZone";
import { QuotesService } from "@/services/quotesService";
import { CulturalQuotesService } from "@/services/culturalQuotesService";

/** The user's notification choices from Settings, plus their time zone. */
export function reminderExtras(userSettings: any) {
  return {
    browserNotification: userSettings?.browserNotifications ?? true,
    voiceNotification: userSettings?.voiceNotifications ?? false,
    emailNotification: userSettings?.emailNotifications ?? false,
    timeZone: getEffectiveTimeZone(),
    clientLocalTime: new Date().toLocaleString('en-US', {
      timeZone: getEffectiveTimeZone(),
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    }),
  };
}

/** A motivational quote for the chosen category (server first, then built-in lists). */
export async function fetchMotivationalQuote(category: string, userSettings: any): Promise<string | null> {
  try {
    // Make API call to get quote for the specific category - use getFullApiUrl and auth token
    const token = getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(getFullApiUrl(`/api/quotes/${category}`), {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch quote: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.quote) {
      return data.quote;
    } else {
      throw new Error("No quote received from API");
    }
  } catch (error) {
    console.error("Error fetching quote for submission:", error);

    // Fallback to client-side quotes if API fails
    const userData = userSettings;
    if (userData?.ethnicitySpecificQuotes && userData?.ethnicity) {
      const culturalQuote = CulturalQuotesService.getPersonalizedQuote(
        userData.ethnicity,
        true,
        userData.gender,
        userData.genderSpecificReminders
      );
      if (culturalQuote) {
        return culturalQuote;
      }
    }

    // Final fallback to general quotes
    const quote = QuotesService.getRandomQuote(category);
    if (quote) {
      return QuotesService.formatQuote(quote);
    }

    return null;
  }
}
