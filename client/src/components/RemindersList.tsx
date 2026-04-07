import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { guestStorage } from "@/services/guestStorage";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Search, Clock } from "lucide-react";
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

interface RemindersListProps {
  onEvent?: (event: string) => void;
}

export default function RemindersList({ onEvent }: RemindersListProps = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isGuest } = useAuth();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<"upcoming" | "past">("past");
  const [searchTerm, setSearchTerm] = useState("");
  const overdueEventFiredRef = useRef(false);
  const { cancelReminder: cancelNativeNotification } = useMobileNotifications();

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: isGuest ? ["guest-reminders"] : ["/api/reminders"],
    queryFn: isGuest ? async () => guestStorage.getReminders() : undefined,
    refetchInterval: isGuest ? 1000 : undefined,
    staleTime: 0,          // Always treat cached data as stale so a fresh fetch runs on every mount
    refetchOnMount: true,  // Always re-fetch when the component mounts
  });

  // Fire manage_overdue once when overdue reminders are detected on load
  useEffect(() => {
    if (overdueEventFiredRef.current || !reminders.length) return;
    const now = new Date();
    const hasOverdue = (reminders as any[]).some(
      (r) => !r.completed && !r.notAccomplished && new Date(r.scheduledFor) < now
    );
    if (hasOverdue) {
      overdueEventFiredRef.current = true;
      onEvent?.("manage_overdue");
    }
  }, [reminders, onEvent]);

  const completeReminderMutation = useMutation({
    mutationFn: async (id: string) => {
      if (isGuest) return guestStorage.completeReminder(id);
      return apiRequest(`/api/reminders/${id}/complete`, { method: "PATCH" });
    },
    onSuccess: async (_, id) => {
      onEvent?.("manage_did_it");
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
      onEvent?.("manage_didnt_do_it");
      playNotAccomplishedSound();
      if (supportsNotifications()) {
        try { await cancelNativeNotification(id); } catch {}
      }
      toast({ title: "Noted", description: "Tracking what didn't get done builds awareness too." });
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

  const now = new Date();
  const all = reminders as Reminder[];

  const upcoming = all.filter((r: Reminder) =>
    !r.completed && new Date(r.scheduledFor) >= now &&
    (r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
     r.originalMessage.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const past = all.filter((r: Reminder) => {
    const isUnloggedOverdue = !r.completed && !(r as any).notAccomplished && new Date(r.scheduledFor) < now;
    const loggedAt = (r as any).loggedAt ? new Date((r as any).loggedAt) : null;
    const isLoggedWithin24h = (r.completed || (r as any).notAccomplished) && loggedAt &&
      (now.getTime() - loggedAt.getTime()) < 24 * 60 * 60 * 1000;
    return isUnloggedOverdue || isLoggedWithin24h;
  }).filter((r: Reminder) =>
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.originalMessage.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayed = tab === "upcoming" ? upcoming : past;

  if (isLoading) {
    return (
      <Card className="border border-[#C9A063] bg-[#FDF3E3]">
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A063] mx-auto mb-4" />
          <p className="text-gray-500">Loading your reminders...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-[#C9A063] bg-[#FDF3E3]">
      <CardHeader className="pb-2 pt-3 px-3">
        {/* Tab switcher */}
        <div className="flex rounded-xl border-2 border-[#C9A063] overflow-hidden mb-2">
          <button
            type="button"
            onClick={() => setTab("past")}
            className={`flex-1 py-1.5 text-xs font-semibold transition-all ${
              tab === "past"
                ? "bg-[#C9A063] text-[#111827]"
                : "bg-white text-[#111827] hover:bg-[#FDF8F0]"
            }`}
          >
            Past ({past.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("upcoming")}
            className={`flex-1 py-1.5 text-xs font-semibold transition-all border-l border-[#C9A063] ${
              tab === "upcoming"
                ? "bg-[#C9A063] text-[#111827]"
                : "bg-white text-[#111827] hover:bg-[#FDF8F0]"
            }`}
          >
            Upcoming ({upcoming.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Input
            placeholder="Search reminders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 w-full bg-white border-2 border-[#C9A063] focus-visible:border-[#C9A063] h-8 text-xs"
          />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#C9A063] h-3.5 w-3.5" />
        </div>
      </CardHeader>

      <CardContent className="px-3 pb-3 pt-0">
        {displayed.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-8 w-8 text-[#C9A063] opacity-40 mx-auto mb-2" />
            <p className="text-xs font-medium text-gray-500">
              {searchTerm
                ? "No matching reminders"
                : tab === "upcoming"
                ? "Nothing scheduled yet"
                : "No past reminders"}
            </p>
          </div>
        ) : (
          <div
            className="space-y-2 overflow-y-auto pr-0.5"
            style={{ maxHeight: "calc(100svh - 260px)", minHeight: "420px" }}
          >
            {displayed.map((reminder: Reminder) => {
              const isPast = new Date(reminder.scheduledFor) < now;
              const isLogged = reminder.completed || !!(reminder as any).notAccomplished;
              const loggedAt = (reminder as any).loggedAt ? new Date((reminder as any).loggedAt) : null;
              const clearTime = loggedAt ? new Date(loggedAt.getTime() + 24 * 60 * 60 * 1000) : null;
              const remainingMs = clearTime ? Math.max(0, clearTime.getTime() - now.getTime()) : 0;
              const hoursLeft = Math.floor(remainingMs / (60 * 60 * 1000));
              const minutesLeft = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
              const shareMessage = reminder.completed
                ? `I just crushed it! ✅ ${reminder.title} — tracked with Rude Reminders 🔥`
                : `Keeping it real — missed ${reminder.title} today. Tomorrow I'll do better 💪 — Rude Reminders`;
              return (
                <SwipeableReminderCard
                  key={reminder.id}
                  onDelete={() => {
                    if (isPast) {
                      if (isLogged && clearTime) {
                        toast({
                          title: "Kept for 24h after logging",
                          description: `Clears automatically in ${hoursLeft}h ${minutesLeft}m ⏱`,
                          duration: 3000,
                        });
                      } else {
                        toast({
                          title: "Past reminders are kept for 24h",
                          description: "Log it as done ✅ or missed ❌ and it clears automatically after 24 hours.",
                          duration: 3000,
                        });
                      }
                      return;
                    }
                    deleteReminderMutation.mutate(reminder.id);
                  }}
                  disabled={isPast || deleteReminderMutation.isPending}
                >
                  <Card className={cn(
                    "border border-[#C9A063] w-full",
                    (reminder.completed || (reminder as any).notAccomplished) && "opacity-60"
                  )}>
                    <CardContent className="p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        {/* Left: title + tag + date */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[160px]">
                              {reminder.title}
                            </span>
                            <Badge className={`${rudenessLevelColors[reminder.rudenessLevel as keyof typeof rudenessLevelColors]} text-[10px] px-1.5 py-0 font-medium flex-shrink-0`}>
                              {rudenessLevelLabels[reminder.rudenessLevel as keyof typeof rudenessLevelLabels]}
                            </Badge>
                            {reminder.completed && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px] px-1.5 py-0 flex-shrink-0">
                                Done
                              </Badge>
                            )}
                            {(reminder as any).notAccomplished && !reminder.completed && (
                              <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-300 text-[10px] px-1.5 py-0 flex-shrink-0">
                                Missed
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-gray-400">
                            <Clock className="h-2.5 w-2.5 flex-shrink-0" />
                            <span>{formatShortDate(reminder.scheduledFor)}</span>
                          </div>
                          {isPast && isLogged && remainingMs > 0 && (
                            <div className="text-[10px] text-gray-400 italic mt-0.5">
                              Clears in {hoursLeft}h {minutesLeft}m ⏱
                            </div>
                          )}
                        </div>

                        {/* Right: action buttons */}
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          {/* Share — all past reminders, status-specific text for logged ones */}
                          {isPast && (
                            <ShareButton
                              reminder={reminder}
                              message={isLogged ? shareMessage : undefined}
                              className="h-7 w-7 p-0"
                              iconOnly={true}
                            />
                          )}

                          {/* Smiley/frown log buttons — only for unlogged past reminders */}
                          {isPast && !isLogged && (
                            <>
                              <button
                                type="button"
                                className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-green-50 transition-colors text-base leading-none"
                                onClick={() => completeReminderMutation.mutate(reminder.id)}
                                disabled={completeReminderMutation.isPending}
                                title="Did it!"
                                data-testid={`button-accomplish-${reminder.id}`}
                              >
                                😊
                              </button>
                              <button
                                type="button"
                                className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-red-50 transition-colors text-base leading-none"
                                onClick={() => markNotAccomplishedMutation.mutate(reminder.id)}
                                disabled={markNotAccomplishedMutation.isPending}
                                title="Didn't do it"
                                data-testid={`button-not-accomplish-${reminder.id}`}
                              >
                                😞
                              </button>
                            </>
                          )}

                          {/* Delete button — active for future reminders, locked for past */}
                          {isPast ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-gray-300 hover:text-gray-400 hover:bg-gray-50"
                              onClick={() => {
                                if (isLogged && clearTime) {
                                  toast({
                                    title: "Kept for 24h after logging",
                                    description: `Clears automatically in ${hoursLeft}h ${minutesLeft}m ⏱`,
                                    duration: 3000,
                                  });
                                } else {
                                  toast({
                                    title: "Past reminders are kept for 24h",
                                    description: "Log it as done ✅ or missed ❌ and it clears automatically after 24 hours.",
                                    duration: 3000,
                                  });
                                }
                              }}
                              title="Kept for 24 hours after logging"
                              data-testid={`button-delete-${reminder.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-[#C53B3B] hover:text-[#C53B3B] hover:bg-red-50"
                              onClick={() => deleteReminderMutation.mutate(reminder.id)}
                              disabled={deleteReminderMutation.isPending}
                              title="Delete reminder"
                              data-testid={`button-delete-${reminder.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </SwipeableReminderCard>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
