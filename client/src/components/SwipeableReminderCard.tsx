import { useState, useRef, PointerEvent as ReactPointerEvent } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SwipeableReminderCardProps {
  children: React.ReactNode;
  onDelete: () => void;
  disabled?: boolean;
}

export function SwipeableReminderCard({ children, onDelete, disabled = false }: SwipeableReminderCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const directionLocked = useRef<"horizontal" | "vertical" | null>(null);
  const pointerCaptured = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = 100;
  const MAX_SWIPE = 150;
  const H_LOCK_THRESHOLD = 20;  // min horizontal px before locking to swipe
  const V_CANCEL_THRESHOLD = 10; // max vertical px allowed before vertical wins

  const handlePointerDown = (e: ReactPointerEvent) => {
    if (disabled) return;

    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, textarea, select")) return;

    startX.current = e.clientX;
    startY.current = e.clientY;
    directionLocked.current = null;
    pointerCaptured.current = false;
    setIsSwiping(false);
  };

  const handlePointerMove = (e: ReactPointerEvent) => {
    if (disabled) return;

    const dx = startX.current - e.clientX; // positive = swiping left
    const dy = Math.abs(e.clientY - startY.current);

    if (directionLocked.current === null) {
      if (dy > V_CANCEL_THRESHOLD) {
        // Clearly scrolling vertically — hand control back to scroll
        directionLocked.current = "vertical";
        return;
      }
      if (dx > H_LOCK_THRESHOLD && dy < V_CANCEL_THRESHOLD) {
        // Clearly swiping horizontally — capture pointer and take control
        directionLocked.current = "horizontal";
        e.currentTarget.setPointerCapture(e.pointerId);
        pointerCaptured.current = true;
        setIsSwiping(true);
      }
      return; // Still deciding direction
    }

    if (directionLocked.current !== "horizontal") return;

    setSwipeOffset(dx > 0 ? Math.min(dx, MAX_SWIPE) : 0);
  };

  const handlePointerUp = (e: ReactPointerEvent) => {
    if (disabled) return;

    if (pointerCaptured.current) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      pointerCaptured.current = false;
    }

    const triggered = swipeOffset >= SWIPE_THRESHOLD;
    setIsSwiping(false);
    directionLocked.current = null;
    setSwipeOffset(0);

    if (triggered) onDelete();
  };

  const handlePointerCancel = (e: ReactPointerEvent) => {
    if (disabled) return;

    if (pointerCaptured.current && e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      pointerCaptured.current = false;
    }

    setIsSwiping(false);
    directionLocked.current = null;
    setSwipeOffset(0);
  };

  const deleteOpacity = Math.min(swipeOffset / SWIPE_THRESHOLD, 1);

  return (
    <div
      className="relative overflow-hidden"
      data-testid="swipeable-reminder-card"
    >
      {/* Delete background */}
      <div
        className="absolute inset-0 bg-red-500 flex items-center justify-end pr-6"
        style={{ opacity: deleteOpacity, zIndex: 0 }}
      >
        <Trash2 className="h-6 w-6 text-white" />
      </div>

      {/* Card content — touch-pan-y lets scroll work; switches to touch-none once horizontal lock confirmed */}
      <div
        ref={cardRef}
        className={cn(
          "relative bg-white dark:bg-gray-800 select-none",
          isSwiping ? "cursor-grabbing touch-none" : "cursor-grab touch-pan-y"
        )}
        style={{
          transform: `translateX(-${swipeOffset}px)`,
          transition: isSwiping ? "none" : "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
          zIndex: 1,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {children}
      </div>
    </div>
  );
}
