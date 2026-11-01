/**
 * Shared "unsaved changes" pieces for settings pages.
 *
 *  <SaveBar>          — slides up from the bottom only when something actually changed.
 *                       Never moves the page or auto-scrolls (that was the "glitchy" part).
 *  useLeaveGuard()    — wraps Back / Home so leaving with unsaved changes asks first:
 *                       Save · Don't Save · Keep Editing. Also catches Android's back button.
 */
import { useCallback, useEffect, useRef, useState } from "react";
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
      <div className="max-w-lg mx-auto flex items-center gap-3 rounded-2xl bg-[#1C1C1E] border border-[#C9A063]/50 px-4 py-3 shadow-[0_-4px_24px_rgba(0,0,0,0.5)]">
        <span className="flex-1 text-[14px] text-[#E5E5EA]">Unsaved changes</span>
        <button onClick={onDiscard} disabled={saving}
          className="px-3 py-2 text-[15px] text-[#8E8E93] disabled:opacity-40" data-testid="button-discard">
          Discard
        </button>
        <button onClick={onSave} disabled={saving}
          className="px-5 py-2 rounded-xl bg-[#C9A063] text-[#111827] font-semibold text-[15px] disabled:opacity-60" data-testid="button-save">
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

/** Space to leave at the bottom of the page so the bar never covers the last row. */
export const SAVE_BAR_SPACE = 96;

export function useLeaveGuard(hasChanges: boolean, save: () => Promise<unknown>, discard: () => void) {
  const [, setLocation] = useLocation();
  const [pendingTo, setPendingTo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const hasChangesRef = useRef(hasChanges);
  hasChangesRef.current = hasChanges;

  /** Use instead of <Link>/setLocation for Back and Home. */
  const leave = useCallback((to: string) => {
    if (hasChangesRef.current) setPendingTo(to);
    else setLocation(to);
  }, [setLocation]);

  // Android hardware back button
  useEffect(() => {
    if (!hasChanges || Capacitor.getPlatform() !== "android") return;
    let remove: (() => void) | undefined;
    import("@capacitor/app").then(({ App }) =>
      App.addListener("backButton", () => setPendingTo("/settings")).then((h) => { remove = () => h.remove(); })
    ).catch(() => {});
    return () => remove?.();
  }, [hasChanges]);

  const dialog = pendingTo ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6" role="dialog" aria-modal="true">
      <div className="w-full max-w-[300px] overflow-hidden rounded-2xl bg-[#1C1C1E] border border-[#38383A]">
        <div className="p-5 text-center">
          <h3 className="text-[17px] font-semibold text-white">Save your changes?</h3>
          <p className="mt-1.5 text-[13px] text-[#AEAEB2]">You changed some settings but haven't saved them yet.</p>
        </div>
        <div className="border-t border-[#38383A]">
          <button
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try { await save(); const to = pendingTo; setPendingTo(null); setLocation(to); }
              catch { /* save() shows its own error; stay on the page */ setPendingTo(null); }
              finally { setSaving(false); }
            }}
            className="w-full py-3 text-[17px] font-semibold text-[#C9A063] border-b border-[#38383A] disabled:opacity-50"
            data-testid="button-leave-save">
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            disabled={saving}
            onClick={() => { discard(); const to = pendingTo; setPendingTo(null); setLocation(to); }}
            className="w-full py-3 text-[17px] text-[#FF453A] border-b border-[#38383A]"
            data-testid="button-leave-discard">
            Don't Save
          </button>
          <button disabled={saving} onClick={() => setPendingTo(null)}
            className="w-full py-3 text-[17px] text-[#0A84FF]" data-testid="button-leave-cancel">
            Keep Editing
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { leave, dialog };
}
