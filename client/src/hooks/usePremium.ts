import { useQuery } from "@tanstack/react-query";

interface PremiumStatus {
  isPremium: boolean;
  features: {
    aiGeneratedResponses: boolean;
    aiGeneratedQuotes: boolean;
    unlimitedReminders: boolean;
    advancedVoiceCharacters: boolean;
  };
}

export function usePremium() {
  const { data, isLoading, error } = useQuery<PremiumStatus>({
    queryKey: ["/api/user/premium-status"],
    retry: false,
  });

  return {
    isPremium: data?.isPremium || false,
    features: data?.features || {
      aiGeneratedResponses: false,
      aiGeneratedQuotes: false,
      unlimitedReminders: false,
      advancedVoiceCharacters: false
    },
    isLoading,
    error,
  };
}