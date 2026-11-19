import { useEffect } from "react";
import { zonedNow } from "@/lib/timeZone";

export type BackdropTheme = "light" | "dark" | "auto";

/**
 * Backdrop for the main screen: Light, "Concrete Grey" (stored as "dark"; it was
 * called "Zero Dark Thirty" before), or Auto.
 *
 * This toggles a `dark` class on <html>, which Tailwind's `darkMode: ["class"]`
 * picks up. Elements opt in with `dark:` classes (colours in lib/theme.ts,
 * concrete*), and inline-styled ones read the --cg-* variables in index.css.
 *
 * Auto goes by the time of day in the user's time zone (the manual one from
 * Settings if they set it): Concrete Grey from 7 PM to 7 AM, Light otherwise.
 * It re-checks every minute and when the app comes back to the front.
 */
export const AUTO_DARK_FROM_HOUR = 19; // 7 PM
export const AUTO_DARK_UNTIL_HOUR = 7; // 7 AM

export function isNightTime(now: Date = zonedNow()): boolean {
  const h = now.getHours();
  return h >= AUTO_DARK_FROM_HOUR || h < AUTO_DARK_UNTIL_HOUR;
}

function resolveIsDark(theme: BackdropTheme): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return isNightTime();
}

let fadeTimer: ReturnType<typeof setTimeout> | undefined;

function applyBackdropTheme(theme: BackdropTheme, fade: boolean) {
  const root = document.documentElement;
  const dark = resolveIsDark(theme);
  if (root.classList.contains("dark") === dark) return;
  if (fade) {
    // Fade colours instead of snapping (see .theme-fading in index.css)
    root.classList.add("theme-fading");
    clearTimeout(fadeTimer);
    fadeTimer = setTimeout(() => root.classList.remove("theme-fading"), 800);
  }
  root.classList.toggle("dark", dark);
}

function getSavedTheme(): BackdropTheme {
  try {
    const saved = localStorage.getItem("backdrop_theme");
    return saved === "dark" || saved === "auto" ? saved : "light";
  } catch {
    return "light";
  }
}

export function useBackdropTheme() {
  useEffect(() => {
    // No fade on first paint: the app should open already in the right colours
    applyBackdropTheme(getSavedTheme(), false);

    const handleThemeChanged = (e: Event) => {
      const detail = (e as CustomEvent<BackdropTheme>).detail;
      applyBackdropTheme(detail ?? getSavedTheme(), true);
    };
    window.addEventListener("backdrop_theme_changed", handleThemeChanged);

    // Auto: follow the clock (and a time zone change made in Settings)
    const recheck = () => {
      if (getSavedTheme() === "auto") applyBackdropTheme("auto", true);
    };
    const minuteTimer = setInterval(recheck, 60_000);
    const handleVisible = () => {
      if (document.visibilityState === "visible") recheck();
    };
    document.addEventListener("visibilitychange", handleVisible);
    window.addEventListener("focus", recheck);

    return () => {
      window.removeEventListener("backdrop_theme_changed", handleThemeChanged);
      clearInterval(minuteTimer);
      document.removeEventListener("visibilitychange", handleVisible);
      window.removeEventListener("focus", recheck);
    };
  }, []);
}
