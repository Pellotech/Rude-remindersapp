import { useState, useEffect, useRef } from "react";

const SLOGANS = [
  "We'll annoy you into becoming a better person.",
  "Started with a laugh. Built a habit.",
  "Your goals deserve more than a gentle nudge.",
  "Hilarious reminders. Real accountability. Actual results.",
  "Most apps remind you. We hold you accountable.",
  "We'll roast you into your best self.",
];

const TAP_LINES = [
  "Oi. You tapped me. Now go do something.",
  "Stop poking me and go finish your tasks.",
  "What are you waiting for? Create a reminder.",
  "I'm watching you. Don't disappoint me.",
  "You think this is a game? It is. And you're losing.",
];

const IDLE_IMGS = [
  "/rudy/Rudy_leaning_2_transparent.png",
  "/rudy/Rudy_idle_smile_transparent.png",
];
const TAPPED_IMG = "/rudy/Rudy_smirk_content_transparent.png";
const THUMBS_IMG = "/rudy/Rudy_thumbs_up_smile_transparent.png";

export interface RudyWidgetProps {
  nudgeEvent?: "reminder_created" | "streak" | null;
  onNudgeHandled?: () => void;
}

export default function RudyWidget({ nudgeEvent, onNudgeHandled }: RudyWidgetProps) {
  const [rudyImg, setRudyImg] = useState(IDLE_IMGS[0]);
  const [bubbleText, setBubbleText] = useState(SLOGANS[0]);
  const [bubbleVisible, setBubbleVisible] = useState(true);

  const sloganIdxRef  = useRef(0);
  const idleImgIdxRef = useRef(0);
  const modeRef       = useRef<"slogan" | "tapped" | "event">("slogan");
  const timersRef     = useRef<ReturnType<typeof setTimeout>[]>([]);

  function addTimer(fn: () => void, delay: number) {
    const id = setTimeout(fn, delay);
    timersRef.current.push(id);
  }

  function clearAllTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }

  function returnToIdle() {
    setBubbleVisible(false);
    addTimer(() => {
      setRudyImg(IDLE_IMGS[idleImgIdxRef.current]);
      setBubbleText(SLOGANS[sloganIdxRef.current]);
      setBubbleVisible(true);
      modeRef.current = "slogan";
    }, 350);
  }

  // Slogan rotation every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (modeRef.current !== "slogan") return;
      setBubbleVisible(false);
      setTimeout(() => {
        if (modeRef.current !== "slogan") return;
        const next = (sloganIdxRef.current + 1) % SLOGANS.length;
        sloganIdxRef.current = next;
        setBubbleText(SLOGANS[next]);
        setBubbleVisible(true);
      }, 350);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Idle image swap every 12 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (modeRef.current !== "slogan") return;
      const next = (idleImgIdxRef.current + 1) % IDLE_IMGS.length;
      idleImgIdxRef.current = next;
      setRudyImg(IDLE_IMGS[next]);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  // Handle nudge events (reminder created / streak)
  useEffect(() => {
    if (!nudgeEvent) return;
    clearAllTimers();
    modeRef.current = "event";
    setRudyImg(THUMBS_IMG);
    const msg =
      nudgeEvent === "reminder_created"
        ? "Nice one. Now actually do it."
        : "Look at you. Almost forming a habit.";
    setBubbleVisible(false);
    addTimer(() => {
      setBubbleText(msg);
      setBubbleVisible(true);
    }, 350);
    addTimer(() => {
      returnToIdle();
      addTimer(() => onNudgeHandled?.(), 400);
    }, 3000);
  }, [nudgeEvent]);

  function handleTap() {
    if (modeRef.current === "event") return;
    clearAllTimers();
    modeRef.current = "tapped";
    setRudyImg(TAPPED_IMG);
    const line = TAP_LINES[Math.floor(Math.random() * TAP_LINES.length)];
    setBubbleVisible(false);
    addTimer(() => {
      setBubbleText(line);
      setBubbleVisible(true);
    }, 150);
    // Swap back to idle image after 1200ms
    addTimer(() => {
      setRudyImg(IDLE_IMGS[idleImgIdxRef.current]);
    }, 1200);
    // Return to slogan mode after 3 seconds
    addTimer(() => returnToIdle(), 3000);
  }

  return (
    <div
      onClick={handleTap}
      className="flex items-center bg-[#FDF3E3] border border-[#C9A063] rounded-[12px] px-3 mt-2 gap-3"
      style={{ height: "90px", cursor: "pointer", userSelect: "none" }}
    >
      <img
        src={rudyImg}
        alt="Rudy"
        style={{
          width: "64px",
          height: "64px",
          objectFit: "contain",
          flexShrink: 0,
          mixBlendMode: "multiply",
        }}
      />
      <div
        className="flex-1 bg-white rounded-full px-4 py-2"
        style={{
          border: "1px solid #E5D5B0",
          minHeight: "40px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <p
          className="text-[11px] text-[#111827] leading-snug"
          style={{
            opacity: bubbleVisible ? 1 : 0,
            transition: "opacity 0.35s ease",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as const,
            overflow: "hidden",
          }}
        >
          {bubbleText}
        </p>
      </div>
    </div>
  );
}
