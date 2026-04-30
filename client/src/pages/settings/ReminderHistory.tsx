import { useQuery } from "@tanstack/react-query";
import SplashScreen from "@/components/SplashScreen";
import { Link, useLocation } from "wouter";
import { ChevronLeft, Home, Search, Trash2, CircleSlash2 } from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Reminder } from "@shared/schema";

const rudenessLevelLabels = {
  1: "Gentle",
  2: "Firm",
  3: "Sarcastic",
  4: "Harsh",
  5: "Savage",
};

export default function ReminderHistory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
  });

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ["/api/reminders"],
  });

  const completeReminderMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/reminders/${id}/complete`, { method: 'PATCH' });
    },
    onSuccess: () => {
      toast({
        title: "Completed!",
        description: "Reminder marked as completed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        setTimeout(() => {
          setLocation("/login");
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to complete reminder.",
        variant: "destructive",
      });
    },
  });

  const deleteReminderMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/reminders/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      toast({
        title: "Deleted!",
        description: "Reminder has been deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        setTimeout(() => {
          setLocation("/login");
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete reminder.",
        variant: "destructive",
      });
    },
  });

  const clearAllRemindersMutation = useMutation({
    mutationFn: async () => {
      const completedReminders = (reminders as Reminder[]).filter(r => r.completed);
      const deletePromises = completedReminders.map(reminder =>
        apiRequest(`/api/reminders/${reminder.id}`, { method: 'DELETE' })
      );
      await Promise.all(deletePromises);
    },
    onSuccess: () => {
      toast({
        title: "History Cleared!",
        description: "All completed reminders have been deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        setTimeout(() => {
          setLocation("/login");
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to clear reminder history.",
        variant: "destructive",
      });
    },
  });

  const filteredReminders = (reminders as Reminder[]).filter((reminder: Reminder) => {
    const matchesSearch = reminder.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reminder.originalMessage.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    const now = new Date();
    const reminderDate = new Date(reminder.scheduledFor);

    switch (filter) {
      case "upcoming":
        return !reminder.completed && reminderDate > now;
      case "past":
        return !reminder.completed && reminderDate <= now;
      case "completed":
        return reminder.completed;
      default:
        return true;
    }
  });

  const formatTimeRemaining = (scheduledFor: string) => {
    const now = new Date();
    const scheduled = new Date(scheduledFor);
    const diff = scheduled.getTime() - now.getTime();

    if (diff <= 0) return "Overdue";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  if (isLoading) {
    return (
      <SplashScreen />
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-lg mx-auto">
        <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-[#38383A] safe-area-header">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/settings">
              <div className="flex items-center text-[#0A84FF] cursor-pointer" data-testid="button-back">
                <ChevronLeft className="h-5 w-5" />
                <span className="text-[17px]">Settings</span>
              </div>
            </Link>
            <Link href="/">
              <div className="text-[#0A84FF] cursor-pointer" data-testid="button-home">
                <Home className="h-5 w-5" />
              </div>
            </Link>
          </div>
          <h1 className="text-[34px] font-bold text-white px-4 pb-2">Reminder History</h1>
        </div>

        <div className="py-6 px-4 space-y-8">
          {stats && (
            <div className="space-y-2">
              <h2 className="text-[13px] text-[#8E8E93] uppercase tracking-wide px-4 mb-2">Your Stats</h2>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#1C1C1E] rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-[#0A84FF]">{(stats as any).activeReminders}</div>
                  <div className="text-[13px] text-[#8E8E93] mt-1">Active</div>
                </div>
                <div className="bg-[#1C1C1E] rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-[#34C759]">{(stats as any).completedToday}</div>
                  <div className="text-[13px] text-[#8E8E93] mt-1">Completed Today</div>
                </div>
                <div className="bg-[#1C1C1E] rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-[#FF9500]">{(stats as any).avgRudeness}</div>
                  <div className="text-[13px] text-[#8E8E93] mt-1">Avg Rudeness</div>
                </div>
              </div>
            </div>
          )}

          <div>
            <h2 className="text-[13px] text-[#8E8E93] uppercase tracking-wide px-4 mb-2">Your Reminders</h2>
            <div className="bg-[#1C1C1E] rounded-xl overflow-hidden p-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-[#8E8E93] h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search reminders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#38383A] text-white text-[17px] pl-10 pr-4 py-2 rounded-lg outline-none placeholder-[#48484A]"
                  data-testid="input-search"
                />
              </div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full bg-[#38383A] text-white text-[17px] px-4 py-2 rounded-lg outline-none"
                data-testid="select-filter"
              >
                <option value="all" className="bg-black text-white">All Reminders</option>
                <option value="upcoming" className="bg-black text-white">Upcoming</option>
                <option value="past" className="bg-black text-white">Past Due</option>
                <option value="completed" className="bg-black text-white">Completed</option>
              </select>
            </div>
          </div>

          {filteredReminders.length === 0 ? (
            <div className="text-center py-12 px-4">
              <CircleSlash2 className="mx-auto h-12 w-12 text-[#8E8E93] mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No reminders found</h3>
              <p className="text-[#8E8E93]">
                {searchTerm || filter !== "all"
                  ? "Try adjusting your filters"
                  : "Create your first reminder to get started!"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReminders.map((reminder: Reminder) => (
                <div key={reminder.id} className="bg-[#1C1C1E] rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-white text-[17px] font-semibold">{reminder.title}</h3>
                      <p className="text-[#8E8E93] text-[13px] mt-1">{reminder.originalMessage.substring(0, 60)}...</p>
                    </div>
                    <span className="bg-[#38383A] text-[#8E8E93] text-[13px] px-2 py-1 rounded">
                      {rudenessLevelLabels[reminder.rudenessLevel as keyof typeof rudenessLevelLabels] || 'Normal'}
                    </span>
                  </div>
                  <div className="text-[13px] text-[#8E8E93] mb-3">
                    {formatTimeRemaining(reminder.scheduledFor)}
                  </div>
                  <div className="flex gap-2">
                    {!reminder.completed && (
                      <button
                        onClick={() => completeReminderMutation.mutate(reminder.id)}
                        className="flex-1 bg-[#34C759] text-white py-2 rounded-lg text-[13px] font-semibold active:opacity-70"
                        data-testid={`button-complete-${reminder.id}`}
                      >
                        Mark Done
                      </button>
                    )}
                    <button
                      onClick={() => deleteReminderMutation.mutate(reminder.id)}
                      className="flex-1 bg-[#38383A] text-[#FF3B30] py-2 rounded-lg text-[13px] font-semibold active:opacity-70"
                      data-testid={`button-delete-${reminder.id}`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(reminders as Reminder[]).some(r => r.completed) && (
            <button
              onClick={() => clearAllRemindersMutation.mutate()}
              className="w-full py-3.5 bg-[#FF3B30] text-white font-semibold text-[17px] rounded-xl active:opacity-70"
              data-testid="button-clear-all"
            >
              Clear Completed
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
