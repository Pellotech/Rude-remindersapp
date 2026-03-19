import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { guestStorage } from "@/services/guestStorage";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Check, 
  Trash2, 
  Search, 
  Clock,
  Play
} from "lucide-react";
import type { Reminder } from "@shared/schema";
import { cn } from "@/lib/utils";
import { ShareButton } from "./ShareButton";
import { useMobileNotifications } from "./MobileNotifications";
import { supportsNotifications } from "@/utils/platformDetection";
import { SwipeableReminderCard } from "./SwipeableReminderCard";
import { playCompletedSound, playNotAccomplishedSound } from "@/lib/soundEffects";
import { format } from "date-fns";

const rudenessLevelColors = {
  1: "bg-[#FDF8F0] text-[#C9A063] border border-[#C9A063]",
  2: "bg-[#FDF8F0] text-[#C9A063] border border-[#C9A063]",
  3: "bg-[#FDF8F0] text-[#C9A063] border border-[#C9A063]",
  4: "bg-[#FDF8F0] text-[#C9A063] border border-[#C9A063]",
  5: "bg-[#FDF8F0] text-[#C9A063] border border-[#C9A063]",
};

const rudenessLevelLabels = {
  1: "Gentle",
  2: "Motivational",
  3: "Sarcastic",
  4: "Harsh",
  5: "Savage",
};

const formatShortDate = (scheduledFor: string | Date) => {
  const date = typeof scheduledFor === "string" ? new Date(scheduledFor) : scheduledFor;
  const now = new Date();
  const isOverdue = date < now;
  const dateStr = format(date, "MMM d");
  const timeStr = format(date, "h:mm a");
  return isOverdue ? `${dateStr} • Overdue` : `${dateStr} • ${timeStr}`;
};

export default function RemindersList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isGuest } = useAuth();
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [previewReminder, setPreviewReminder] = useState<Reminder | null>(null);
  const { cancelReminder: cancelNativeNotification } = useMobileNotifications();

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: isGuest ? ["guest-reminders"] : ["/api/reminders"],
    queryFn: isGuest ? async () => guestStorage.getReminders() : undefined,
    refetchInterval: isGuest ? 1000 : undefined,
  });

  const completeReminderMutation = useMutation({
    mutationFn: async (id: string) => {
      if (isGuest) {
        return guestStorage.completeReminder(id);
      }
      return apiRequest(`/api/reminders/${id}/complete`, { method: "PATCH" });
    },
    onSuccess: async (_, id) => {
      playCompletedSound();
      if (supportsNotifications()) {
        try { await cancelNativeNotification(id); } catch {}
      }
      toast({ title: "Reminder completed!", description: "Great job! Keep up the good work." });
      if (isGuest) {
        queryClient.invalidateQueries({ queryKey: ["guest-reminders"] });
        queryClient.invalidateQueries({ queryKey: ["guest-stats"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      }
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => setLocation("/login"), 500);
        return;
      }
      toast({ title: "Error", description: "Failed to complete reminder.", variant: "destructive" });
    },
  });

  const deleteReminderMutation = useMutation({
    mutationFn: async (id: string) => {
      if (isGuest) { guestStorage.deleteReminder(id); return id; }
      await apiRequest(`/api/reminders/${id}`, { method: "DELETE" });
      return id;
    },
    onSuccess: async (id) => {
      if (supportsNotifications()) {
        try { await cancelNativeNotification(id); } catch {}
      }
      toast({ title: "Deleted!", description: "Reminder has been deleted." });
      if (isGuest) {
        await queryClient.refetchQueries({ queryKey: ["guest-reminders"] });
        await queryClient.refetchQueries({ queryKey: ["guest-stats"] });
      } else {
        await queryClient.refetchQueries({ queryKey: ["/api/reminders"] });
        await queryClient.refetchQueries({ queryKey: ["/api/stats"] });
      }
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => setLocation("/login"), 500);
        return;
      }
      toast({ title: "Error", description: "Failed to delete reminder.", variant: "destructive" });
    },
  });

  const markNotAccomplishedMutation = useMutation({
    mutationFn: async (id: string) => {
      if (isGuest) return Promise.resolve(guestStorage.updateReminder(id, { notAccomplished: true } as any));
      return apiRequest(`/api/reminders/${id}/not-accomplished`, { method: "PATCH" });
    },
    onSuccess: async (_, id) => {
      playNotAccomplishedSound();
      if (supportsNotifications()) {
        try { await cancelNativeNotification(id); } catch {}
      }
      toast({ title: "Added to disappointments", description: "Tracking what didn't get done builds awareness too." });
      if (isGuest) {
        await queryClient.refetchQueries({ queryKey: ["guest-reminders"] });
        await queryClient.refetchQueries({ queryKey: ["guest-stats"] });
      } else {
        await queryClient.refetchQueries({ queryKey: ["/api/reminders"] });
        await queryClient.refetchQueries({ queryKey: ["/api/stats"] });
      }
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => setLocation("/login"), 500);
        return;
      }
      toast({ title: "Error", description: "Failed to mark reminder.", variant: "destructive" });
    },
  });

  const filteredReminders = (reminders as Reminder[]).filter((reminder: Reminder) => {
    const matchesSearch = reminder.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reminder.originalMessage.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    const now = new Date();
    const reminderDate = new Date(reminder.scheduledFor);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const reminderDay = new Date(reminderDate.getFullYear(), reminderDate.getMonth(), reminderDate.getDate());

    switch (filter) {
      case "today": return reminderDay.getTime() === today.getTime();
      case "week": {
        const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        return reminderDay >= today && reminderDay <= weekFromNow;
      }
      case "completed": return reminder.completed;
      case "active": return !reminder.completed && reminderDate >= now;
      default: return true;
    }
  });

  const previewNotification = (reminder: Reminder) => {
    setPreviewReminder(reminder);
    if (reminder.browserNotification) {
      toast({
        title: `Preview: ${reminder.title}`,
        description: reminder.rudeMessage || reminder.originalMessage,
        duration: 5000,
      });
    }
    if (reminder.voiceNotification && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(reminder.rudeMessage || reminder.originalMessage);
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      speechSynthesis.speak(utterance);
    }
  };

  if (isLoading) {
    return (
      <Card className="border border-[#C9A063]">
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A063] mx-auto mb-4" />
          <p className="text-gray-500">Loading your reminders...</p>
        </CardContent>
      </Card>
    );
  }

  const renderReminderCard = (reminder: Reminder, showNotAccomplished = false) => (
    <SwipeableReminderCard
      key={reminder.id}
      onDelete={() => deleteReminderMutation.mutate(reminder.id)}
      disabled={deleteReminderMutation.isPending}
    >
      <Card className={cn(
        "border border-[#C9A063] transition-all duration-200 w-full max-w-full",
        reminder.completed && "opacity-60"
      )}>
        <CardContent className="p-3 w-full overflow-x-hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 break-words">
                  {reminder.title}
                </h3>
                <Badge className={`${rudenessLevelColors[reminder.rudenessLevel as keyof typeof rudenessLevelColors]} text-xs flex-shrink-0 font-medium`}>
                  {rudenessLevelLabels[reminder.rudenessLevel as keyof typeof rudenessLevelLabels]}
                </Badge>
                {reminder.completed && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs flex-shrink-0">
                    Done
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Clock className="h-3 w-3 flex-shrink-0" />
                <span>{formatShortDate(reminder.scheduledFor)}</span>
              </div>
            </div>

            <div className="flex items-center gap-0.5 flex-shrink-0">
              <ShareButton reminder={reminder} className="h-8 w-8 p-0" iconOnly={true} />

              {!reminder.completed && showNotAccomplished && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-[#C53B3B] hover:text-[#C53B3B] hover:bg-red-50"
                  onClick={() => markNotAccomplishedMutation.mutate(reminder.id)}
                  disabled={markNotAccomplishedMutation.isPending}
                  title="Mark as not accomplished"
                  data-testid={`button-not-accomplish-${reminder.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}

              {!reminder.completed && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-green-500 hover:text-green-600 hover:bg-green-50"
                  onClick={() => completeReminderMutation.mutate(reminder.id)}
                  disabled={completeReminderMutation.isPending}
                  title="Mark as accomplished"
                  data-testid={`button-accomplish-${reminder.id}`}
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-[#C53B3B] hover:text-[#C53B3B] hover:bg-red-50"
                onClick={() => deleteReminderMutation.mutate(reminder.id)}
                disabled={deleteReminderMutation.isPending}
                title="Delete reminder"
                data-testid={`button-delete-${reminder.id}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </SwipeableReminderCard>
  );

  return (
    <Card className="border border-[#C9A063]">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full sm:w-36 flex-shrink-0 border-2 border-[#C9A063] bg-white text-sm h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Active</SelectItem>
              <SelectItem value="active">Current</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-0">
            <Input
              placeholder="Search reminders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full bg-white border-2 border-[#C9A063] focus-visible:border-[#C9A063] h-9 text-sm"
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#C9A063] h-3.5 w-3.5" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {filteredReminders.length === 0 ? (
          <div className="text-center py-10">
            <Clock className="h-10 w-10 text-[#C9A063] opacity-40 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">
              {searchTerm || filter !== "all" ? "No matching reminders" : "Nothing scheduled yet"}
            </p>
          </div>
        ) : (
          (() => {
            const now = new Date();
            const overdueReminders = filteredReminders.filter((r: Reminder) =>
              !r.completed && new Date(r.scheduledFor) < now
            );
            const upcomingReminders = filteredReminders.filter((r: Reminder) =>
              !r.completed && new Date(r.scheduledFor) >= now
            );

            return (
              <div className="space-y-4 w-full">
                {overdueReminders.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2 px-2 py-1 bg-[#C53B3B] rounded-md">
                      <span className="text-xs font-semibold text-white">
                        Overdue ({overdueReminders.length})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {overdueReminders.map((r: Reminder) => renderReminderCard(r, true))}
                    </div>
                  </div>
                )}

                {upcomingReminders.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2 px-2 py-1 bg-[#FDF8F0] border border-[#C9A063] rounded-md">
                      <span className="text-xs font-semibold text-[#C9A063]">
                        Upcoming ({upcomingReminders.length})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {upcomingReminders.map((r: Reminder) => renderReminderCard(r, false))}
                    </div>
                  </div>
                )}

                {overdueReminders.length === 0 && upcomingReminders.length === 0 && (
                  <div className="text-center py-10">
                    <Clock className="h-10 w-10 text-[#C9A063] opacity-40 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-700">Nothing scheduled yet</p>
                  </div>
                )}
              </div>
            );
          })()
        )}
      </CardContent>

      {previewReminder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[80vh] overflow-y-auto border border-[#C9A063]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Reminder Preview</h3>
              <Button variant="ghost" size="sm" onClick={() => setPreviewReminder(null)} className="text-gray-400 hover:text-gray-600">
                ✕
              </Button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-sm text-gray-600 mb-1">Title</h4>
                <p className="font-semibold text-gray-900">{previewReminder.title}</p>
              </div>

              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <h4 className="font-medium text-sm text-[#C53B3B] mb-1">What you'll see/hear</h4>
                <p className="text-[#C53B3B] font-medium">
                  {previewReminder.rudeMessage || previewReminder.originalMessage}
                </p>
              </div>

              <div className="p-3 bg-[#FDF8F0] rounded-lg border border-[#C9A063]">
                <h4 className="font-medium text-sm text-[#C9A063] mb-1">Rudeness Level</h4>
                <Badge className={rudenessLevelColors[previewReminder.rudenessLevel as keyof typeof rudenessLevelColors]}>
                  {rudenessLevelLabels[previewReminder.rudenessLevel as keyof typeof rudenessLevelLabels]}
                </Badge>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={() => previewNotification(previewReminder)} className="flex items-center gap-2" variant="outline">
                  <Play className="h-4 w-4" />
                  Preview Again
                </Button>
                <Button onClick={() => setPreviewReminder(null)} variant="secondary" className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
