import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
  Edit, 
  Check, 
  Trash2, 
  Search, 
  Clock, 
  Bell, 
  Volume2, 
  Mail,
  CircleSlash2,
  Eye,
  Play
} from "lucide-react";
import type { Reminder } from "@shared/schema";
import { cn } from "@/lib/utils";
import { ShareButton } from "./ShareButton";
import { CompletionCelebration } from "./CompletionCelebration";

const rudenessLevelColors = {
  1: "bg-green-100 text-green-800",
  2: "bg-blue-100 text-blue-800", 
  3: "bg-yellow-100 text-yellow-800",
  4: "bg-orange-100 text-orange-800",
  5: "bg-red-100 text-red-800",
};

const rudenessLevelLabels = {
  1: "Gentle",
  2: "Firm", 
  3: "Sarcastic",
  4: "Harsh",
  5: "Savage",
};

export default function RemindersList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [previewReminder, setPreviewReminder] = useState<Reminder | null>(null);
  const [celebrationData, setCelebrationData] = useState({
    isOpen: false,
    reminderTitle: "",
    completionStreak: 0,
  });

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ["/api/reminders"],
  });

  const completeReminderMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PUT", `/api/reminders/${id}/complete`),
    onSuccess: (_, completedId) => {
      const completedReminder = reminders?.find(r => r.id === completedId);
      if (completedReminder) {
        // Show celebration dialog
        setCelebrationData({
          isOpen: true,
          reminderTitle: completedReminder.originalMessage,
          completionStreak: Math.floor(Math.random() * 10) + 1 // You can track this properly
        });
      }

      toast({
        title: "Reminder completed!",
        description: "Great job! Keep up the good work.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized", 
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
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
      await apiRequest("DELETE", `/api/reminders/${id}`);
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
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
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

  // Filter reminders based on selected filter and search term
  const filteredReminders = (reminders as Reminder[]).filter((reminder: Reminder) => {
    const matchesSearch = reminder.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reminder.originalMessage.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    const now = new Date();
    const reminderDate = new Date(reminder.scheduledFor);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const reminderDay = new Date(reminderDate.getFullYear(), reminderDate.getMonth(), reminderDate.getDate());

    switch (filter) {
      case "today":
        return reminderDay.getTime() === today.getTime();
      case "week": {
        const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        return reminderDay >= today && reminderDay <= weekFromNow;
      }
      case "completed":
        return reminder.completed;
      case "active":
        return !reminder.completed && reminderDate >= now;
      default:
        return true;
    }
  });

  const formatTimeRemaining = (scheduledFor: string) => {
    const now = new Date();
    const reminderTime = new Date(scheduledFor);
    const timeDiff = reminderTime.getTime() - now.getTime();

    if (timeDiff < 0) {
      return "Overdue";
    }

    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days !== 1 ? 's' : ''} remaining`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''} remaining`;
    } else {
      return `${minutes} minute${minutes !== 1 ? 's' : ''} remaining`;
    }
  };

  const previewNotification = (reminder: Reminder) => {
    setPreviewReminder(reminder);

    // Simulate what happens when reminder is triggered
    if (reminder.browserNotification) {
      toast({
        title: `Preview: ${reminder.title}`,
        description: reminder.rudeMessage || reminder.originalMessage,
        duration: 5000,
      });
    }

    if (reminder.voiceNotification && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(reminder.rudeMessage || reminder.originalMessage);
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      speechSynthesis.speak(utterance);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rude-red-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading your reminders...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="space-y-4">
          <CardTitle>Your Reminders</CardTitle>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-40 flex-shrink-0">
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
                className="pl-10 w-full"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {filteredReminders.length === 0 ? (
          <div className="text-center py-12">
            <CircleSlash2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || filter !== "all" ? "No matching reminders" : "No reminders yet"}
            </h3>
            <p className="text-gray-500">
              {searchTerm || filter !== "all" 
                ? "Try adjusting your search or filter criteria."
                : "Create your first rude reminder to get started!"
              }
            </p>
          </div>
        ) : (
          (() => {
            const now = new Date();
            const overdueReminders = filteredReminders.filter((reminder: Reminder) => 
              !reminder.completed && new Date(reminder.scheduledFor) < now
            );
            const upcomingReminders = filteredReminders.filter((reminder: Reminder) => 
              !reminder.completed && new Date(reminder.scheduledFor) >= now
            );

            const renderReminder = (reminder: Reminder) => (
              <Card key={reminder.id} className={cn(
                "transition-all duration-200 hover:shadow-md w-full max-w-full",
                reminder.completed && "opacity-60"
              )}>
                <CardContent className="p-4 w-full overflow-x-hidden">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-sm sm:text-base font-medium text-gray-900 break-words">
                            {reminder.title}
                          </h3>
                          <Badge 
                            className={`${rudenessLevelColors[reminder.rudenessLevel as keyof typeof rudenessLevelColors]} text-xs flex-shrink-0`}
                          >
                            {rudenessLevelLabels[reminder.rudenessLevel as keyof typeof rudenessLevelLabels]}
                          </Badge>
                          {reminder.completed && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 text-xs flex-shrink-0">
                              Completed
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-1 mb-2">
                          {reminder.browserNotification && (
                            <Bell className="text-gray-400 h-3 w-3 flex-shrink-0" />
                          )}
                          {reminder.voiceNotification && (
                            <Volume2 className="text-gray-400 h-3 w-3 flex-shrink-0" />
                          )}
                          {reminder.emailNotification && (
                            <Mail className="text-gray-400 h-3 w-3 flex-shrink-0" />
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-gray-400 hover:text-gray-600 h-8 w-8 p-0"
                                    onClick={() => {
                                      // TODO: Implement edit functionality
                                      toast({
                                        title: "Coming Soon",
                                        description: "Edit functionality will be added soon.",
                                      });
                                    }}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>

                                  {!reminder.completed && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-gray-400 hover:text-green-600 h-8 w-8 p-0"
                                      onClick={() => completeReminderMutation.mutate(reminder.id)}
                                      disabled={completeReminderMutation.isPending}
                                    >
                                      <Check className="h-3 w-3" />
                                    </Button>
                                  )}

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-gray-400 hover:text-red-600 h-8 w-8 p-0"
                                    onClick={() => deleteReminderMutation.mutate(reminder.id)}
                                    disabled={deleteReminderMutation.isPending}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                    </div>

                    <p className="text-sm text-gray-600 break-words">
                      "{reminder.originalMessage}"
                    </p>

                    <div className="flex items-center text-xs text-gray-500 flex-wrap">
                      <Clock className="mr-1 h-3 w-3 flex-shrink-0" />
                      <span className="break-all">
                        {new Date(reminder.scheduledFor).toLocaleString()}
                      </span>
                      {!reminder.completed && (
                        <>
                          <span className="mx-2 flex-shrink-0">•</span>
                          <span className="flex-shrink-0">{formatTimeRemaining(reminder.scheduledFor)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );

            return (
              <div className="space-y-6 w-full">
                {/* Overdue Reminders */}
                {overdueReminders.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <h3 className="text-lg font-semibold text-red-700">
                        Overdue ({overdueReminders.length})
                      </h3>
                    </div>
                    <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        Let us know if you accomplished these so we know whether to build a mountain of disappointments or a mountain of accomplishments! ✅❌
                      </p>
                    </div>
                    <div className="max-h-96 overflow-y-auto space-y-3 border border-red-200 rounded-lg p-3 bg-red-50">
                      {overdueReminders.map((reminder: Reminder) => (
                        <Card key={reminder.id} className={cn(
                          "transition-all duration-200 hover:shadow-md w-full max-w-full",
                          reminder.completed && "opacity-60"
                        )}>
                          <CardContent className="p-4 w-full overflow-x-hidden">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <h3 className="text-sm sm:text-base font-medium text-gray-900 break-words">
                                      {reminder.title}
                                    </h3>
                                    <Badge 
                                      className={`${rudenessLevelColors[reminder.rudenessLevel as keyof typeof rudenessLevelColors]} text-xs flex-shrink-0`}
                                    >
                                      {rudenessLevelLabels[reminder.rudenessLevel as keyof typeof rudenessLevelLabels]}
                                    </Badge>
                                    {reminder.completed && (
                                      <Badge variant="outline" className="bg-green-50 text-green-700 text-xs flex-shrink-0">
                                        Completed
                                      </Badge>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1 mb-2">
                                    {reminder.browserNotification && (
                                      <Bell className="text-gray-400 h-3 w-3 flex-shrink-0" />
                                    )}
                                    {reminder.voiceNotification && (
                                      <Volume2 className="text-gray-400 h-3 w-3 flex-shrink-0" />
                                    )}
                                    {reminder.emailNotification && (
                                      <Mail className="text-gray-400 h-3 w-3 flex-shrink-0" />
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {/* Accomplishment tracking buttons for overdue items */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-green-500 hover:text-green-600 hover:bg-green-50 h-8 w-8 p-0"
                                    onClick={() => {
                                      completeReminderMutation.mutate(reminder.id);
                                      toast({
                                        title: "Added to accomplishments! 🎉",
                                        description: "Building that mountain of accomplishments!",
                                      });
                                    }}
                                    disabled={completeReminderMutation.isPending}
                                    title="Mark as accomplished"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                                    onClick={() => {
                                      deleteReminderMutation.mutate(reminder.id);
                                      toast({
                                        title: "Added to disappointments 😔",
                                        description: "Another brick in the wall of regret...",
                                      });
                                    }}
                                    disabled={deleteReminderMutation.isPending}
                                    title="Mark as not accomplished"
                                  >
                                    ❌
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-gray-400 hover:text-gray-600 h-8 w-8 p-0"
                                    onClick={() => {
                                      // TODO: Implement edit functionality
                                      toast({
                                        title: "Coming Soon",
                                        description: "Edit functionality will be added soon.",
                                      });
                                    }}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>

                              <p className="text-sm text-gray-600 break-words">
                                "{reminder.originalMessage}"
                              </p>

                              <div className="flex items-center text-xs text-gray-500 flex-wrap">
                                <Clock className="mr-1 h-3 w-3 flex-shrink-0" />
                                <span className="break-all">
                                  {new Date(reminder.scheduledFor).toLocaleString()}
                                </span>
                                {!reminder.completed && (
                                  <>
                                    <span className="mx-2 flex-shrink-0">•</span>
                                    <span className="flex-shrink-0">{formatTimeRemaining(reminder.scheduledFor)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Current & Upcoming Reminders */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <h3 className="text-lg font-semibold text-blue-700">
                      Current & Upcoming Reminders ({upcomingReminders.length})
                    </h3>
                  </div>
                  <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      Your active reminders that are scheduled for today and beyond. Manage, edit, or complete them here.
                    </p>
                  </div>
                  <div className="max-h-96 overflow-y-auto space-y-3 border border-blue-200 rounded-lg p-3 bg-blue-50">
                    {upcomingReminders.length > 0 ? (
                      upcomingReminders.map(renderReminder)
                    ) : (
                      <div className="text-center py-8">
                        <Clock className="h-12 w-12 text-blue-300 mx-auto mb-3" />
                        <h4 className="text-sm font-medium text-blue-700 mb-1">
                          No upcoming reminders
                        </h4>
                        <p className="text-xs text-blue-600">
                          All caught up! Create a new reminder to get started.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()
        )}
      </CardContent>

      <CompletionCelebration
        isOpen={celebrationData.isOpen}
        onClose={() => setCelebrationData(prev => ({ ...prev, isOpen: false }))}
        reminderTitle={celebrationData.reminderTitle}
        completionStreak={celebrationData.completionStreak}
      />

      {/* Preview Modal */}
      {previewReminder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Reminder Preview</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewReminder(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </Button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-sm text-gray-600 mb-2">Title</h4>
                <p className="font-semibold">{previewReminder.title}</p>
              </div>

              <div className="p-4 bg-rude-red-50 rounded-lg border border-rude-red-200">
                <h4 className="font-medium text-sm text-rude-red-700 mb-2">What you'll see/hear</h4>
                <p className="text-rude-red-800 font-medium">
                  {previewReminder.rudeMessage || previewReminder.originalMessage}
                </p>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-sm text-blue-700 mb-2">Notification Types</h4>
                <div className="space-y-2">
                  {previewReminder.browserNotification && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <Bell className="h-4 w-4" />
                      <span>Browser notification (shown above as toast)</span>
                    </div>
                  )}
                  {previewReminder.voiceNotification && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <Volume2 className="h-4 w-4" />
                      <span>Voice notification (spoken aloud)</span>
                    </div>
                  )}
                  {previewReminder.emailNotification && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <Mail className="h-4 w-4" />
                      <span>Email notification</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h4 className="font-medium text-sm text-yellow-700 mb-2">Rudeness Level</h4>
                <Badge className={`${rudenessLevelColors[previewReminder.rudenessLevel as keyof typeof rudenessLevelColors]}`}>
                  {rudenessLevelLabels[previewReminder.rudenessLevel as keyof typeof rudenessLevelLabels]}
                </Badge>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => previewNotification(previewReminder)}
                  className="flex items-center gap-2"
                  variant="outline"
                >
                  <Play className="h-4 w-4" />
                  Preview Again
                </Button>
                <Button
                  onClick={() => setPreviewReminder(null)}
                  variant="secondary"
                  className="flex-1"
                >
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