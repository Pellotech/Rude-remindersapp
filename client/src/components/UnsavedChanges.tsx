/**
 * Shared "unsaved changes" pieces for settings pages.
 *
 *  <SaveBar>          — slides up from the bottom only when something actually changed.
 *                       Never moves the page or auto-scrolls (that was the "glitchy" part).
 *  useLeaveGuard()    — wraps Back / Home: leaving with unsaved changes throws them away
 *                       (no second pop-up). Also catches Android's back button.
 */
import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Capacitor } from "@capacitor/core";

export function SaveBar({ visible, saving, onSave, onDiscard }: {
  visible: boolean; saving: boolean; onSave: () => void; onDiscard: () => void;
}) {
  return (
    <div
      aria-hidden={!visible}
      className="fixed left-0 right-0 z-40 px-4 transition-all duration-300 ease-out"
      style={{
        bottom: 0,
        paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)",
        transform: visible ? "translateY(0)" : "translateY(120%)",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div className="max-w-lg mx-auto flex items-center gap-3 rounded-2xl bg-ui-card border border-reem-gold/50 px-4 py-3 shadow-[0_-4px_24px_rgba(0,0,0,0.5)]">
        <span className="flex-1 text-body-sm text-ui-label-4">Unsaved changes</span>
        <button onClick={onDiscard} disabled={saving}
          className="px-3 py-2 text-body text-ui-label-2 disabled:opacity-40" data-testid="button-discard">
          Discard
        </button>
        <button onClick={onSave} disabled={saving}
          className="px-5 py-2 rounded-xl bg-reem-gold text-reem-ink font-semibold text-body disabled:opacity-60" data-testid="button-save">
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

/** Space to leave at the bottom of the page so the bar never covers the last row. */
export const SAVE_BAR_SPACE = 96;

/**
 * Leaving a settings page without pressing Save throws the changes away
 * (Mohammed's choice: the Save bar is the only prompt — no second pop-up).
 * `discard` puts any live previews back (e.g. the text size).
 * `save` is kept in the signature so pages don't need to change.
 */
export function useLeaveGuard(hasChanges: boolean, _save: () => Promise<unknown>, discard: () => void) {
  const [, setLocation] = useLocation();
  const hasChangesRef = useRef(hasChanges);
  hasChangesRef.current = hasChanges;
  const discardRef = useRef(discard);
  discardRef.current = discard;

  /** Use instead of <Link>/setLocation for Back and Home. */
  const leave = useCallback((to: string) => {
    if (hasChangesRef.current) discardRef.current();
    setLocation(to);
  }, [setLocation]);

  // Android hardware back button: same thing — drop unsaved changes, go back to Settings
  useEffect(() => {
    if (!hasChanges || Capacitor.getPlatform() !== "android") return;
    let remove: (() => void) | undefined;
    import("@capacitor/app").then(({ App }) =>
      App.addListener("backButton", () => { discardRef.current(); setLocation("/settings"); }).then((h) => { remove = () => h.remove(); })
    ).catch(() => {});
    return () => remove?.();
  }, [hasChanges, setLocation]);

  return { leave, dialog: null as JSX.Element | null };
}
