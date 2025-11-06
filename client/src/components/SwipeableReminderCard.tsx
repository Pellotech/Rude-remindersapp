import { useState, useRef, TouchEvent } from "react";
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
  const touchStartX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = 100; // pixels to trigger delete
  const MAX_SWIPE = 150; // maximum swipe distance

  const handleTouchStart = (e: TouchEvent) => {
    if (disabled) return;
    touchStartX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (disabled || !isSwiping) return;
    
    const currentX = e.touches[0].clientX;
    const diff = touchStartX.current - currentX;
    
    // Only allow left swipe (positive diff)
    if (diff > 0) {
      setSwipeOffset(Math.min(diff, MAX_SWIPE));
    } else {
      setSwipeOffset(0);
    }
  };

  const handleTouchEnd = () => {
    if (disabled) return;
    setIsSwiping(false);

    if (swipeOffset >= SWIPE_THRESHOLD) {
      // Trigger delete
      onDelete();
      setSwipeOffset(0);
    } else {
      // Reset position
      setSwipeOffset(0);
    }
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
          "relative bg-white dark:bg-gray-800 transition-transform",
          !isSwiping && "duration-300 ease-out"
        )}
        style={{
          transform: `translateX(-${swipeOffset}px)`,
          zIndex: 1
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
