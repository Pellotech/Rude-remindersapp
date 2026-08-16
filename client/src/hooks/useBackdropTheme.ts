import { useEffect } from "react";

export type BackdropTheme = "light" | "dark" | "auto";

/**
 * "Zero Dark Thirty" — an optional dark backdrop for the main screen.
 *
 * Scope is deliberately narrow: this only ever toggles a `dark` class on
 * <html>, which Tailwind's `darkMode: ["class"]` config picks up. Only
 * elements that explicitly opt in with a `dark:` variant change — every
 * card, pill, and button keeps its own explicit background color and is
 * untouched by this.
 */
function resolveIsDark(theme: BackdropTheme): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyBackdropTheme(theme: BackdropTheme) {
  document.documentElement.classList.toggle("dark", resolveIsDark(theme));
}

function getSavedTheme(): BackdropTheme {
  const saved = localStorage.getItem("backdrop_theme");
  return saved === "dark" || saved === "auto" ? saved : "light";
}

export function useBackdropTheme() {
  useEffect(() => {
    applyBackdropTheme(getSavedTheme());

    const handleThemeChanged = (e: Event) => {
      const detail = (e as CustomEvent<BackdropTheme>).detail;
      applyBackdropTheme(detail ?? getSavedTheme());
    };
    window.addEventListener("backdrop_theme_changed", handleThemeChanged);

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = () => {
      if (getSavedTheme() === "auto") applyBackdropTheme("auto");
    };
    mql.addEventListener("change", handleSystemChange);

    return () => {
      window.removeEventListener("backdrop_theme_changed", handleThemeChanged);
      mql.removeEventListener("change", handleSystemChange);
    };
  }, []);
}
