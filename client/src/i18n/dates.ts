// date-fns formatting in the app's language (weekday and month names, AM/PM).
// Urdu has no date-fns pack yet, so it shows English date words.
import { format } from "date-fns";
import { enUS, es, fr, de, ptBR, it, ar, hi, zhCN, ja, ko, ru, tr, id, type Locale } from "date-fns/locale";
import { getCurrentLanguage } from "@/i18n";

const LOCALES: Record<string, Locale> = { en: enUS, es, fr, de, pt: ptBR, it, ar, hi, zh: zhCN, ja, ko, ru, tr, id };

export function formatDate(date: Date | number, pattern: string): string {
  return format(date, pattern, { locale: LOCALES[getCurrentLanguage()] ?? enUS });
}
