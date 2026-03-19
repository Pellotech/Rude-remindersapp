import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

// Production API URL for native apps (when UI is bundled locally)
const PRODUCTION_API_URL = "https://rudereminder.replit.app";

// Token storage key
const AUTH_TOKEN_KEY = "rude_reminders_auth_token";

// In-memory cache for fast synchronous access
let cachedToken: string | null = null;

// Initialize token from persistent storage (call on app start)
export async function initAuthToken(): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { value } = await Preferences.get({ key: AUTH_TOKEN_KEY });
      cachedToken = value;
      console.log("🔑 Auth token loaded from native storage:", cachedToken ? "exists" : "none");
      return cachedToken;
    } catch (error) {
      console.error("Error loading auth token:", error);
      return null;
    }
  } else {
    cachedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    return cachedToken;
  }
}

// Store auth token (async for native, sync for web)
export async function setAuthToken(token: string): Promise<void> {
  cachedToken = token;
  if (Capacitor.isNativePlatform()) {
    try {
      await Preferences.set({ key: AUTH_TOKEN_KEY, value: token });
      console.log("🔑 Auth token saved to native storage");
    } catch (error) {
      console.error("Error saving auth token:", error);
    }
  } else {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }
}

// Get stored auth token (synchronous from cache)
export function getAuthToken(): string | null {
  return cachedToken;
}

// Clear auth token (on logout)
export async function clearAuthToken(): Promise<void> {
  cachedToken = null;
  if (Capacitor.isNativePlatform()) {
    try {
      await Preferences.remove({ key: AUTH_TOKEN_KEY });
      console.log("🔑 Auth token cleared from native storage");
    } catch (error) {
      console.error("Error clearing auth token:", error);
    }
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

// Get the base URL for API calls - production URL for native, relative for web
export function getApiBaseUrl(): string {
  if (Capacitor.isNativePlatform()) {
    return PRODUCTION_API_URL;
  }
  return ""; // Relative URLs for web development
}

// Helper to get full API URL for any path
export function getFullApiUrl(path: string): string {
  return path.startsWith('/') ? `${getApiBaseUrl()}${path}` : path;
}

// Get auth headers (include token if available)
function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (token) {
    return { 'Authorization': `Bearer ${token}` };
  }
  return {};
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(url: string, options?: RequestInit) {
  // Prepend base URL for native platforms
  const fullUrl = url.startsWith('/') ? `${getApiBaseUrl()}${url}` : url;
  console.log('apiRequest fullUrl:', fullUrl);
  
  const fetchOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options?.headers,
    },
    credentials: 'include', // Keep cookies for web
  };

  // Stringify body if it's an object
  if (options?.body && typeof options.body === 'object') {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(fullUrl, fetchOptions);
  const contentType = response.headers.get('content-type') || '';

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('apiRequest error:', response.status, text.slice(0, 200));
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 200) || response.statusText}`);
  }

  // Handle 204 No Content responses (e.g., DELETE requests)
  if (response.status === 204) {
    return null;
  }

  // Only parse JSON if response is JSON
  if (contentType.includes('application/json')) {
    return response.json();
  } else {
    const text = await response.text();
    console.error('Non-JSON response:', text.slice(0, 200));
    throw new Error(`Non-JSON response: ${text.slice(0, 200)}`);
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const path = queryKey.join("/") as string;
    const fullUrl = path.startsWith('/') ? `${getApiBaseUrl()}${path}` : path;
    const res = await fetch(fullUrl, {
      credentials: "include",
      cache: "no-store", // Prevent Android WebView from serving stale cached responses
      headers: getAuthHeaders(),
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
