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


      {/* Quick Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Default Rudeness</span>
              <Select defaultValue={user?.defaultRudenessLevel?.toString() || "3"}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Gentle</SelectItem>
                  <SelectItem value="2">Firm</SelectItem>
                  <SelectItem value="3">Sarcastic</SelectItem>
                  <SelectItem value="4">Harsh</SelectItem>
                  <SelectItem value="5">Savage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Snooze Duration</span>
              <Select defaultValue="5">
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 min</SelectItem>
                  <SelectItem value="10">10 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Voice Button */}
      <Button
        variant="outline"
        className="w-full"
        onClick={testVoice}
      >
        <TestTube className="mr-2 h-4 w-4" />
        Test Voice Reminder
      </Button>
    </div>
  );
}
