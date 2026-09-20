import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

// This is the fix for the "app takes a moment to open" complaint: React Query's
// cache normally lives only in memory, so every cold app launch starts empty
// and the UI has to wait on a live network round-trip (/api/auth/user, plus
// reminders/stats/voices) before anything renders. By persisting the cache to
// disk, a returning user's last-known data is available synchronously on
// launch — the app can paint immediately from that snapshot while a background
// refetch quietly confirms/updates it (see staleTime on the auth query in
// useAuth.ts, which controls whether that background refetch fires).
//
// Uses Capacitor Preferences on native (same durable, OS-backed storage the
// auth token already uses — more resilient than WebView localStorage, which
// iOS can evict under storage pressure) and localStorage on web.

const CACHE_KEY = "rude_reminders_query_cache";

const nativeStorage = {
  getItem: async (key: string) => (await Preferences.get({ key })).value,
  setItem: async (key: string, value: string) => {
    await Preferences.set({ key, value });
  },
  removeItem: async (key: string) => {
    await Preferences.remove({ key });
  },
};

const webStorage = {
  getItem: async (key: string) => localStorage.getItem(key),
  setItem: async (key: string, value: string) => {
    localStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    localStorage.removeItem(key);
  },
};

export const queryPersister = createAsyncStoragePersister({
  key: CACHE_KEY,
  storage: Capacitor.isNativePlatform() ? nativeStorage : webStorage,
  throttleTime: 1000,
});

// Bump this if the shape of cached query data ever changes incompatibly
// (e.g. a field removed from the user object) so old persisted caches are
// discarded instead of causing weird UI states.
export const QUERY_CACHE_BUSTER = "v1";
