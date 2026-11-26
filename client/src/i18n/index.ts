// App translations (i18next). English is built in; other languages load on demand
// from ./locales/<code>.json. Missing words fall back to English.
//
// Language choice: the one picked in Settings → Language if any, otherwise the
// phone's language if we support it, otherwise English.

import i18n from "i18next";
import { useEffect, useState } from "react";
import { initReactI18next } from "react-i18next";
import { Capacitor } from "@capacitor/core";
import en from "./locales/en.json";
import { DEFAULT_LANGUAGE, languageInfo, matchLanguage, type LanguageCode } from "@shared/languages";

const STORAGE_KEY = "reem_language";

const loaders = import.meta.glob<{ default: Record<string, unknown> }>([
  "./locales/*.json",
  "!./locales/en.json",
]);

let phoneLanguage: LanguageCode = DEFAULT_LANGUAGE;

/** The language picked in Settings, or null for "use the phone's language". */
export function getManualLanguage(): LanguageCode | null {
  try {
    return matchLanguage(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export function getPhoneLanguage(): LanguageCode {
  return phoneLanguage;
}

export function getCurrentLanguage(): LanguageCode {
  return matchLanguage(i18n.language) ?? DEFAULT_LANGUAGE;
}

async function detectPhoneLanguage(): Promise<LanguageCode> {
  const tags: string[] = [];
  if (Capacitor.isNativePlatform()) {
    try {
      const { Device } = await import("@capacitor/device");
      tags.push((await Device.getLanguageTag()).value);
    } catch { /* fall through to the WebView's list */ }
  }
  if (typeof navigator !== "undefined") tags.push(...(navigator.languages ?? []), navigator.language);
  for (const tag of tags) {
    const code = matchLanguage(tag);
    if (code) return code;
  }
  return DEFAULT_LANGUAGE;
}

async function loadLanguage(code: LanguageCode): Promise<void> {
  if (code === "en" || i18n.hasResourceBundle(code, "translation")) return;
  const load = loaders[`./locales/${code}.json`];
  if (!load) return;
  const mod = await load();
  i18n.addResourceBundle(code, "translation", mod.default, true, true);
}

function applyToPage(code: LanguageCode) {
  const root = document.documentElement;
  root.lang = code;
  root.dir = languageInfo(code).rtl ? "rtl" : "ltr";
}

async function switchTo(code: LanguageCode) {
  try {
    await loadLanguage(code);
  } catch (err) {
    console.warn("Could not load language", code, err);
    code = DEFAULT_LANGUAGE;
  }
  await i18n.changeLanguage(code);
  applyToPage(code);
}

/** Runs once before the app first renders. */
export async function initI18n(): Promise<void> {
  await i18n.use(initReactI18next).init({
    resources: { en: { translation: en } },
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: { escapeValue: false }, // React already escapes
    returnNull: false,
  });
  phoneLanguage = await detectPhoneLanguage();
  await switchTo(getManualLanguage() ?? phoneLanguage);
}

/** Settings → Language. null = follow the phone. */
export async function setLanguage(code: LanguageCode | null): Promise<void> {
  try {
    if (code) localStorage.setItem(STORAGE_KEY, code);
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* still switch for this session */ }
  await switchTo(code ?? phoneLanguage);
  window.dispatchEvent(new CustomEvent("language_changed", { detail: getCurrentLanguage() }));
}

/**
 * Translate outside React hooks (event handlers, toasts, plain functions).
 * Screens re-render on a language change because App keys the tree on the
 * language (see useLanguageKey), so this is always current at render time.
 */
export function tr(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, options) as string;
}

/** A list of strings from the translations (empty if the key is missing). */
export function trList(key: string): string[] {
  const v = i18n.t(key, { returnObjects: true }) as unknown;
  return Array.isArray(v) ? (v as unknown[]).filter((x): x is string => typeof x === "string") : [];
}

/** Changes whenever the language changes; App uses it to re-render everything. */
export function useLanguageKey(): string {
  const [lang, setLang] = useState(getCurrentLanguage());
  useEffect(() => {
    const onChange = () => setLang(getCurrentLanguage());
    window.addEventListener("language_changed", onChange);
    return () => window.removeEventListener("language_changed", onChange);
  }, []);
  return lang;
}

export default i18n;
