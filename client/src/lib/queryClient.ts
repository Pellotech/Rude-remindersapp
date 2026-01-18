import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";

// Production API URL for native apps (when UI is bundled locally)
const PRODUCTION_API_URL = "https://rudereminder.replit.app";

// Token storage key
const AUTH_TOKEN_KEY = "rude_reminders_auth_token";

// Store auth token
export function setAuthToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

// Get stored auth token
export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

// Clear auth token (on logout)
export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
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

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Request failed: ${response.statusText}`);
  }

  // Handle 204 No Content responses (e.g., DELETE requests)
  if (response.status === 204) {
    return null;
  }

  return response.json();
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
