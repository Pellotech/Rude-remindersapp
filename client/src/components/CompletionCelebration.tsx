
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, Star, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompletionCelebrationProps {
  isOpen: boolean;
  onClose: () => void;
  reminderTitle: string;
  completionStreak?: number;
}

export function CompletionCelebration({
  isOpen,
  onClose,
  reminderTitle,
  completionStreak = 1
}: CompletionCelebrationProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      // Auto close after 5 seconds if user doesn't interact
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  const getCelebrationMessage = () => {
    if (completionStreak >= 7) {
      return {
        title: "🔥 AMAZING STREAK!",
        message: `Just completed "${reminderTitle}" - that's ${completionStreak} reminders in a row! Rude Reminders keeps me crushing my goals!`,
        icon: Trophy,
        color: "text-yellow-500"
      };
    } else if (completionStreak >= 3) {
      return {
        title: "⭐ GREAT PROGRESS!",
        message: `Completed "${reminderTitle}" and ${completionStreak} other tasks! Rude Reminders is keeping me on track.`,
        icon: Star,
        color: "text-blue-500"
      };
    } else {
      return {
        title: "✅ TASK COMPLETE!",
        message: `Just finished "${reminderTitle}" thanks to Rude Reminders! This app gives me exactly the push I need.`,
        icon: Zap,
        color: "text-green-500"
      };
    }
  };

  const celebration = getCelebrationMessage();
  const IconComponent = celebration.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md text-center">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center space-x-2 text-xl">
            <IconComponent className={cn("h-6 w-6", celebration.color)} />
            <span>{celebration.title}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className={cn("space-y-4", showConfetti && "animate-pulse")}>
          <div className="text-4xl">🎉</div>
          <p className="text-muted-foreground">
            Way to go! You completed your reminder successfully.
          </p>
          
          <div className="space-y-3">
            <Button 
              onClick={onClose}
              className="w-full"
            >
              Continue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
