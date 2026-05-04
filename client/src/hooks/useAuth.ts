import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
import { getFullApiUrl, getAuthToken, apiRequest, queryClient } from "@/lib/queryClient";
import { revenueCatService } from "@/services/revenueCatService";

// Module-level guard so multiple components mounting useAuth don't all
// fire logIn + sync-subscription concurrently for the same user.
const syncedUserIds = new Set<string>();
const inFlightSync = new Map<string, Promise<void>>();

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

    const subscriptionStatus = (user as any)?.subscriptionStatus;
    if (subscriptionStatus === 'active') return;
    if (syncedUserIds.has(userId)) return;
    if (inFlightSync.has(userId)) return;

    const run = (async () => {
      try {
        await revenueCatService.logIn(userId);
        // After identifying the user with RevenueCat, check for an active
        // entitlement and tell the server to flip the DB to premium. This
        // covers users who purchased before this build (anonymous purchase
        // gets aliased on logIn) as well as fresh launches after upgrades.
        const customerInfo = await revenueCatService.getCustomerInfo();
        const hasActive =
          customerInfo &&
          customerInfo.entitlements &&
          customerInfo.entitlements.active &&
          Object.keys(customerInfo.entitlements.active).length > 0;
        if (hasActive) {
          try {
            await apiRequest('/api/sync-subscription', { method: 'POST' });
            syncedUserIds.add(userId);
            await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
            await queryClient.invalidateQueries({ queryKey: ['/api/user/premium-status'] });
          } catch (e) {
            console.error('sync-subscription after logIn failed:', e);
          }
        }
      } catch (e) {
        console.error('RevenueCat identify failed:', e);
      } finally {
        inFlightSync.delete(userId);
      }
    })();
    inFlightSync.set(userId, run);
  }, [(user as any)?.id, (user as any)?.subscriptionStatus]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    refetch,
  };
}
