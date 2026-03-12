import { useQuery } from "@tanstack/react-query";

interface PremiumStatus {
  isPremium: boolean;
  features: {
    aiGeneratedResponses: boolean;
    aiGeneratedQuotes: boolean;
    monthlyReminderLimit: number;
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
      monthlyReminderLimit: 15,
      advancedVoiceCharacters: false
    },
    isLoading,
    error,
  };
}