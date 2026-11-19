// The app's languages. Shared by the app (menus, Settings, voice) and the server
// (tells the AI which language to write Reem's messages in).
//
// To add a language: add a row here, then add client/src/i18n/locales/<code>.json.

export type LanguageCode =
  | "en" | "es" | "fr" | "de" | "pt" | "it" | "ar" | "ur"
  | "hi" | "zh" | "ja" | "ko" | "ru" | "tr" | "id";

export interface LanguageInfo {
  code: LanguageCode;
  /** The language's own name, shown in the picker */
  native: string;
  /** English name, used in AI prompts and logs */
  english: string;
  /** Written right to left: the screen mirrors */
  rtl?: boolean;
  /** Phone voice language to ask for */
  speech: string;
}

export const LANGUAGES: LanguageInfo[] = [
  { code: "en", native: "English", english: "English", speech: "en-US" },
  { code: "es", native: "Español", english: "Spanish", speech: "es-ES" },
  { code: "fr", native: "Français", english: "French", speech: "fr-FR" },
  { code: "de", native: "Deutsch", english: "German", speech: "de-DE" },
  { code: "pt", native: "Português (Brasil)", english: "Brazilian Portuguese", speech: "pt-BR" },
  { code: "it", native: "Italiano", english: "Italian", speech: "it-IT" },
  { code: "ar", native: "العربية", english: "Arabic", rtl: true, speech: "ar-SA" },
  { code: "ur", native: "اردو", english: "Urdu", rtl: true, speech: "ur-PK" },
  { code: "hi", native: "हिन्दी", english: "Hindi", speech: "hi-IN" },
  { code: "zh", native: "简体中文", english: "Simplified Chinese", speech: "zh-CN" },
  { code: "ja", native: "日本語", english: "Japanese", speech: "ja-JP" },
  { code: "ko", native: "한국어", english: "Korean", speech: "ko-KR" },
  { code: "ru", native: "Русский", english: "Russian", speech: "ru-RU" },
  { code: "tr", native: "Türkçe", english: "Turkish", speech: "tr-TR" },
  { code: "id", native: "Bahasa Indonesia", english: "Indonesian", speech: "id-ID" },
];

export const DEFAULT_LANGUAGE: LanguageCode = "en";

const BY_CODE = new Map(LANGUAGES.map((l) => [l.code, l]));

/** "es-MX", "pt_BR", "zh-Hans-CN" → a supported code, or null if we don't have it. */
export function matchLanguage(input: unknown): LanguageCode | null {
  if (typeof input !== "string" || !input) return null;
  const base = input.trim().toLowerCase().replace("_", "-").split("-")[0];
  // Traditional Chinese readers usually prefer it to Simplified; we only have
  // Simplified, so only match zh when it isn't explicitly Traditional.
  if (base === "zh" && /hant|-tw|-hk|-mo/i.test(input)) return null;
  return BY_CODE.has(base as LanguageCode) ? (base as LanguageCode) : null;
}

export function languageInfo(code: string | null | undefined): LanguageInfo {
  return BY_CODE.get((matchLanguage(code) ?? DEFAULT_LANGUAGE)) as LanguageInfo;
}
