import { useEffect, useState } from "react";

interface SplashScreenProps {
  onDone?: () => void;
  durationMs?: number;
}

export default function SplashScreen({ onDone, durationMs = 2000 }: SplashScreenProps) {
  const [hiding, setHiding] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    const hideTimer = setTimeout(() => setHiding(true), durationMs);
    const removeTimer = setTimeout(() => {
      setRemoved(true);
      onDone?.();
    }, durationMs + 400);
    return () => {
      clearTimeout(hideTimer);
      clearTimeout(removeTimer);
    };
  }, [durationMs, onDone]);

  if (removed) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#FDF3E3",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        opacity: hiding ? 0 : 1,
        transition: "opacity 0.4s ease",
      }}
    >
      <img
        src="/rose_transparent.png"
        alt="Rude Reminders"
        style={{
          width: 180,
          height: 180,
          objectFit: "contain",
          opacity: 0,
          animation: "roseAppear 1.2s ease forwards",
        }}
      />
      <style>{`
        @keyframes roseAppear {
          0%   { opacity: 0; transform: scale(0.92); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
