// ─────────────────────────────────────────────────────────────────────────────
// Text Size (Settings → Text Size & Time Zone, also shown in Notifications).
//
// One setting that makes ALL the words in the app bigger — screens and the
// reminder popup — whatever unit the font size was written in.
//   • iPhone / web: the CSS `text-size-adjust` percentage on <body>.
//   • Android: the WebView's own text zoom, through the @capacitor/text-zoom
//     plugin. We multiply by the zoom Android started with, so people who use
//     a large system font keep that on top.
// If the plugin isn't installed, the setting does nothing on Android.
// ─────────────────────────────────────────────────────────────────────────────
import { Capacitor, registerPlugin } from "@capacitor/core";

export type TextSize = "normal" | "large" | "xlarge";

// One setting for the whole app AND the reminder popup. It's shown in two
// places (Settings → Text Size & Time Zone, and Settings → Notifications) and
// both change this same value.
export const TEXT_SIZES: { id: TextSize; label: string; scale: number }[] = [
  { id: "normal", label: "Regular", scale: 1 },
  { id: "large", label: "Large", scale: 1.15 },
  { id: "xlarge", label: "Billboard 😜", scale: 1.3 },
];

/** Fired on window whenever the size changes; `detail` is the new TextSize. */
export const TEXT_SIZE_EVENT = "text_size_changed";

const STORAGE_KEY = "reem_text_size";
// The old popup-only setting from Settings → Notifications.
const OLD_KEY = "text_size_preference";
const FROM_OLD: Record<string, TextSize> = { default: "normal", larger: "large", blind: "xlarge" };

interface TextZoomPlugin {
  get(): Promise<{ value: number }>;
  set(options: { value: number }): Promise<void>;
}
// Registered by name so the app still builds and runs when the native plugin
// is missing — the calls below just fail and we use the CSS fallback.
const TextZoom = registerPlugin<TextZoomPlugin>("TextZoom");

export function getTextSize(): TextSize {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (TEXT_SIZES.some((s) => s.id === stored)) return stored as TextSize;
    // Someone who picked Large / Billboard in the old popup setting keeps it.
    const old = FROM_OLD[localStorage.getItem(OLD_KEY) || ""];
    if (old) {
      localStorage.setItem(STORAGE_KEY, old);
      localStorage.removeItem(OLD_KEY);
      return old;
    }
  } catch { /* storage unavailable */ }
  return "normal";
}

function scaleFor(size: TextSize): number {
  return TEXT_SIZES.find((s) => s.id === size)?.scale ?? 1;
}

// The text zoom Android's WebView had when the app opened (includes the
// phone's own font-size setting). Read once, before we change anything.
let androidBaseline: number | null = null;

function applyCss(scale: number) {
  const pct = `${Math.round(scale * 100)}%`;
  document.body.style.setProperty("-webkit-text-size-adjust", pct);
  document.body.style.setProperty("text-size-adjust", pct);
}

/** Apply the saved (or given) size to the whole app. Safe to call any time. */
export async function applyTextSize(size: TextSize = getTextSize()): Promise<void> {
  const scale = scaleFor(size);

  if (Capacitor.getPlatform() === "android") {
    try {
      if (androidBaseline === null) {
        const current = (await TextZoom.get()).value;
        androidBaseline = current > 0 ? current : 1;
      }
      await TextZoom.set({ value: androidBaseline * scale });
      document.documentElement.dataset.textSize = size;
    } catch {
      // Plugin not installed: Android can't scale text, so don't let the
      // "hold these rows back" CSS rules (index.css) shrink anything either.
      document.documentElement.dataset.textSize = "normal";
    }
    return;
  }
  document.documentElement.dataset.textSize = size;
  applyCss(scale);
}

export function setTextSize(size: TextSize): void {
  try {
    localStorage.setItem(STORAGE_KEY, size);
    localStorage.removeItem(OLD_KEY);
  } catch { /* storage unavailable */ }
  void applyTextSize(size);
  window.dispatchEvent(new CustomEvent(TEXT_SIZE_EVENT, { detail: size }));
}

/**
 * Base font size (px) for the reminder message in the popup. The whole app is
 * already scaled by the setting, so these end up at about 14 / 18 / 21 px —
 * the same sizes the old popup-only setting gave.
 */
export const POPUP_MESSAGE_PX: Record<TextSize, number> = { normal: 14, large: 15.5, xlarge: 16 };
