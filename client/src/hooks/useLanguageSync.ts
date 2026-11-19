import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getCurrentLanguage } from "@/i18n";

/**
 * Keeps the account's language in step with the app, so the server writes
 * Reem's messages (and anything it sends later, like follow-ups) in the same
 * language the user sees. Runs on sign-in and whenever the language changes.
 */
export function useLanguageSync() {
  const { data: user } = useQuery<any>({ queryKey: ["/api/auth/user"], retry: false });

  useEffect(() => {
    if (!user?.id) return;
    const current = getCurrentLanguage();
    if (user.language === current) return;
    apiRequest("/api/settings", { method: "PUT", body: { language: current } })
      .then(() => queryClient.setQueryData(["/api/auth/user"], (u: any) => (u ? { ...u, language: current } : u)))
      .catch(() => { /* try again next time the user loads */ });
  }, [user?.id, user?.language]);

  useEffect(() => {
    const onChange = () => {
      const current = getCurrentLanguage();
      apiRequest("/api/settings", { method: "PUT", body: { language: current } })
        .then(() => queryClient.setQueryData(["/api/auth/user"], (u: any) => (u ? { ...u, language: current } : u)))
        .catch(() => {});
    };
    window.addEventListener("language_changed", onChange);
    return () => window.removeEventListener("language_changed", onChange);
  }, []);
}
