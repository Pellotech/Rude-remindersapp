import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
import { getFullApiUrl, getAuthToken } from "@/lib/queryClient";
import { revenueCatService } from "@/services/revenueCatService";

export function useAuth() {
  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const token = getAuthToken();
      const headers: Record<string, string> = {};

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(getFullApiUrl("/api/auth/user"), {
        credentials: "include",
        headers,
      });

      if (res.status === 401) {
        return null;
      }

      if (!res.ok) {
        throw new Error("Failed to fetch user");
      }

      return await res.json();
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Identify the user with RevenueCat on native so purchases are attributed
  // to the actual app user instead of the anonymous $RCAnonymousID.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const userId = (user as any)?.id;
    if (!userId) return;
    revenueCatService.logIn(userId).catch((e) =>
      console.error('RevenueCat identify failed:', e)
    );
  }, [(user as any)?.id]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    refetch,
  };
}
