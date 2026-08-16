import { useState, useEffect } from "react";
import logoImage from "@assets/translusant_logo2_1767108484844.png";

const STORAGE_KEY_INDEX = "rudeReminders_motivationalIndex";
const STORAGE_KEY_LAST_SHOWN = "rudeReminders_lastMotivationalShown";
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

const MESSAGES: Array<(name: string) => string> = [
  () => `Small steps. Big streaks. Keep going. 🔥`,
  (name) => `Hey ${name} — showing up is the win. 💪`,
  () => `Most people quit early. You're still here. 👑`,
  () => `Repeat it daily. That's the whole trick. 🌱`,
  () => `Day one, every day. Let's move. 🎯`,
];

interface MotivationalPopupProps {
  userName?: string;
  blocked?: boolean;
}

export function MotivationalPopup({
  userName = "there",
  blocked = false,
}: MotivationalPopupProps) {
  const [visible, setVisible] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [pendingShow, setPendingShow] = useState(false);

  useEffect(() => {
    const savedIndex = parseInt(localStorage.getItem(STORAGE_KEY_INDEX) || "0", 10);
    const index = isNaN(savedIndex) ? 0 : savedIndex % MESSAGES.length;
    setMessageIndex(index);

    const params = new URLSearchParams(window.location.search);
    const forceShow = params.get("showPopup") === "1";

    if (forceShow) {
      params.delete("showPopup");
      const newUrl =
        window.location.pathname +
        (params.toString() ? "?" + params.toString() : "");
      window.history.replaceState({}, "", newUrl);
      localStorage.removeItem(STORAGE_KEY_LAST_SHOWN);
    }

    const lastShown = localStorage.getItem(STORAGE_KEY_LAST_SHOWN);
    const shouldShow =
      forceShow ||
      !lastShown ||
      Date.now() - parseInt(lastShown, 10) >= THREE_DAYS_MS;

    if (shouldShow) {
      setPendingShow(true);
    }
  }, []);

  useEffect(() => {
    if (!pendingShow) return;
    if (blocked) return;

    const timer = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(timer);
  }, [pendingShow, blocked]);

  function dismiss() {
    const nextIndex = (messageIndex + 1) % MESSAGES.length;
    localStorage.setItem(STORAGE_KEY_INDEX, String(nextIndex));
    localStorage.setItem(STORAGE_KEY_LAST_SHOWN, String(Date.now()));
    setVisible(false);
  }

  if (!visible) return null;

  const displayName =
    userName && userName !== "there" ? userName.split(" ")[0] : "there";

  const message = MESSAGES[messageIndex](displayName);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border-2 border-[#C9A063]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#FDF3E3] px-4 pt-4 pb-4 flex flex-row items-start gap-3">
          <img
            src={logoImage}
            alt="Rude Reminders"
            className="w-14 h-14 object-contain flex-shrink-0"
          />
          <p className="text-[#111827] font-bold text-base leading-snug">
            {message}
          </p>
        </div>

        <div className="bg-[#FDF3E3] px-5 py-4 flex flex-col items-center gap-3">
          <button
            onClick={dismiss}
            className="w-full py-2.5 rounded-xl bg-[#1B2A5E] text-white font-semibold text-sm hover:bg-[#152347] transition-colors"
          >
            Let's get it 💥
          </button>

          <p className="text-xs text-center text-[#111827] leading-relaxed">
            Rude Reminders — the greatest scheduling &amp; habit building app in the world 🌍
          </p>
        </div>
      </div>
    </div>
  );
}
