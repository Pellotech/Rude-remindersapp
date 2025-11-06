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
  const cardRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = 100; // pixels to trigger delete
  const MAX_SWIPE = 150; // maximum swipe distance

  const handlePointerDown = (e: ReactPointerEvent) => {
    if (disabled) return;
    
    // Capture the pointer to continue receiving events even when element moves
    e.currentTarget.setPointerCapture(e.pointerId);
    
    startX.current = e.clientX;
    setIsSwiping(true);
  };

  const handlePointerMove = (e: ReactPointerEvent) => {
    if (disabled || !isSwiping) return;
    
    const currentX = e.clientX;
    const diff = startX.current - currentX;
    
    // Only allow left swipe (positive diff)
    if (diff > 0) {
      setSwipeOffset(Math.min(diff, MAX_SWIPE));
    } else {
      setSwipeOffset(0);
    }
  };

  const handlePointerUp = (e: ReactPointerEvent) => {
    if (disabled) return;
    
    // Release pointer capture
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    setIsSwiping(false);

    if (swipeOffset >= SWIPE_THRESHOLD) {
      onDelete();
      setSwipeOffset(0);
    } else {
      setSwipeOffset(0);
    }
  };

  const handlePointerCancel = (e: ReactPointerEvent) => {
    if (disabled) return;
    
    // Release pointer capture
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    
    setIsSwiping(false);
    setSwipeOffset(0);
  };

  const deleteOpacity = Math.min(swipeOffset / SWIPE_THRESHOLD, 1);

  return (
    <div 
      className="relative overflow-hidden"
      data-testid="swipeable-reminder-card"
    >
      {/* Delete background that appears when swiping */}
      <div 
        className="absolute inset-0 bg-red-500 flex items-center justify-end pr-6"
        style={{ 
          opacity: deleteOpacity,
          zIndex: 0 
        }}
      >
        <Trash2 className="h-6 w-6 text-white" />
      </div>

      {/* Card content */}
      <div
        ref={cardRef}
        className={cn(
          "relative bg-white dark:bg-gray-800 transition-transform cursor-grab touch-none select-none",
          isSwiping && "cursor-grabbing",
          !isSwiping && "duration-300 ease-out"
        )}
        style={{
          transform: `translateX(-${swipeOffset}px)`,
          zIndex: 1
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
