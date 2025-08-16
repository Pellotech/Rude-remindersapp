import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { User } from "@shared/schema";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TestTube } from "lucide-react";

export default function Sidebar() {
  const { toast } = useToast();
  const { user } = useAuth() as { user: User | undefined };



  const testVoice = () => {
    if ('speechSynthesis' in window) {
      const testMessages = [
        "This is a test of your rude reminder voice, you magnificent procrastinator!",
        "Testing voice notifications, because apparently you need audio abuse to get things done!",
        "Voice test complete, now stop messing around and get back to work!",
      ];
      const randomMessage = testMessages[Math.floor(Math.random() * testMessages.length)];
      const utterance = new SpeechSynthesisUtterance(randomMessage);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    } else {
      toast({
        title: "Not Supported",
        description: "Voice synthesis is not supported in your browser.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">



    </div>
  );
}
