import { useQuery } from "@tanstack/react-query";
import { getFullApiUrl, getAuthToken } from "@/lib/queryClient";

interface QuoteContext {
  category?: string;
  ethnicity?: string;
  gender?: string;
  mood?: string;
}

interface QuoteResponse {
  quote: string;
  isPremium: boolean;
  source: 'ai-generated' | 'cultural-library';
  generatedAt: string;
}

export function usePremiumQuotes(context: QuoteContext = {}) {
  const queryParams = new URLSearchParams();
  
  if (context.category) queryParams.append('category', context.category);
  if (context.ethnicity) queryParams.append('ethnicity', context.ethnicity);
  if (context.gender) queryParams.append('gender', context.gender);
  if (context.mood) queryParams.append('mood', context.mood);

  const { data, isLoading, error, refetch } = useQuery<QuoteResponse>({
    queryKey: ["/api/quotes/personalized", context],
    queryFn: async () => {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(getFullApiUrl(`/api/quotes/personalized?${queryParams.toString()}`), {
        headers,
        credentials: 'include',
      });
      return response.json();
    },
    retry: false,
  });

  return {
    quote: data?.quote || '',
    isPremium: data?.isPremium || false,
    source: data?.source || 'cultural-library',
    generatedAt: data?.generatedAt,
    isLoading,
    error,
    generateNewQuote: refetch,
  };
}