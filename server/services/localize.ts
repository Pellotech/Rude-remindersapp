// Puts server-written text (Reem's template messages, quotes, follow-ups) into
// the user's language. Premium AI messages are written in the right language
// to begin with (see DeepSeekService.buildPrompt); this covers everything that
// starts out as an English template.
//
// Uses DeepSeek to translate, with a cache so the same template line is only
// translated once per language. If translation is unavailable, the English text
// is returned: the user still gets reminded.

import { DeepSeekService } from "./deepseekService.js";
import { languageInfo, type LanguageCode } from "@shared/languages";

let service: DeepSeekService | null | undefined;
function translator(): DeepSeekService | null {
  if (service === undefined) {
    try {
      service = new DeepSeekService();
    } catch {
      service = null;
    }
  }
  return service;
}

const cache = new Map<string, string>();
const CACHE_LIMIT = 5000;
const key = (lang: string, text: string) => `${lang}\u0000${text}`;

export async function localizeLines(lines: string[], language: LanguageCode): Promise<string[]> {
  if (language === "en" || lines.length === 0) return lines;
  const out = [...lines];
  const missing: number[] = [];
  lines.forEach((line, i) => {
    const hit = cache.get(key(language, line));
    if (hit) out[i] = hit;
    else missing.push(i);
  });
  if (missing.length === 0) return out;

  const ds = translator();
  if (!ds) return out;
  const translated = await ds.translateLines(missing.map((i) => lines[i]), language);
  if (!translated) return out;
  missing.forEach((i, k) => {
    out[i] = translated[k];
    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
    cache.set(key(language, lines[i]), translated[k]);
  });
  return out;
}

export async function localizeText(text: string, language: LanguageCode): Promise<string> {
  if (!text) return text;
  return (await localizeLines([text], language))[0];
}

// Last-resort message when nothing else could be generated. Kept as a fixed
// table so it works even when the AI is unreachable.
const TIME_TO: Record<LanguageCode, string> = {
  en: "Time to {task}!",
  es: "¡Es hora de: {task}!",
  fr: "C'est l'heure : {task} !",
  de: "Zeit für: {task}!",
  pt: "Hora de: {task}!",
  it: "È ora di: {task}!",
  ar: "حان الوقت: {task}!",
  ur: "وقت ہو گیا: {task}!",
  hi: "समय हो गया: {task}!",
  zh: "该去做了：{task}！",
  ja: "時間です：{task}！",
  ko: "할 시간이에요: {task}!",
  ru: "Пора: {task}!",
  tr: "Zamanı geldi: {task}!",
  id: "Saatnya: {task}!",
};

export function timeToMessage(task: string, language: LanguageCode): string {
  return (TIME_TO[language] ?? TIME_TO.en).replace("{task}", task);
}

export function languageNameForPrompt(language: LanguageCode): string {
  return languageInfo(language).english;
}
