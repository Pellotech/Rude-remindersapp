import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackNavigation } from "@/components/BackNavigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  BarChart3, 
  Calendar, 
  Clock, 
  Bell, 
  Volume2, 
  Mail,
  Search,
  Trash2,
  Check,
  CircleSlash2
} from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Reminder } from "@shared/schema";

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

export default function ReminderHistory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Get user stats
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
  });

  // Get reminders history
  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ["/api/reminders"],
  });

  const completeReminderMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("PATCH", `/api/reminders/${id}/complete`);
      return response.json();
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <BackNavigation 
          currentPage="Your Reminder History"
          settingsLandingPath="/settings"
          homePath="/"
        />
        
        <div className="space-y-6">
          {/* Stats Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Your Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {(stats as any).activeReminders}
                    </div>
                    <div className="text-sm text-gray-600">Active Reminders</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {(stats as any).completedToday}
                    </div>
                    <div className="text-sm text-gray-600">Completed Today</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {(stats as any).avgRudeness}
                    </div>
                    <div className="text-sm text-gray-600">Avg. Rudeness</div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="animate-pulse p-4 bg-gray-100 rounded-lg">
                    <div className="h-8 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                  </div>
                  <div className="animate-pulse p-4 bg-gray-100 rounded-lg">
                    <div className="h-8 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                  </div>
                  <div className="animate-pulse p-4 bg-gray-100 rounded-lg">
                    <div className="h-8 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reminders History Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Your Reminders History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search reminders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Reminders</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="past">Past Due</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reminders List */}
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 border rounded-lg animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                    </div>
                  ))}
                </div>
              ) : filteredReminders.length === 0 ? (
                <div className="text-center py-12">
                  <CircleSlash2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No reminders found</h3>
                  <p className="text-gray-600">
                    {searchTerm || filter !== "all" 
                      ? "Try adjusting your search or filter criteria"
                      : "Create your first reminder to get started!"
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredReminders.map((reminder: Reminder) => (
                    <div
                      key={reminder.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-base font-medium text-gray-900">
                              {reminder.title}
                            </h3>
                            <Badge 
                              className={rudenessLevelColors[reminder.rudenessLevel as keyof typeof rudenessLevelColors]}
                            >
                              {rudenessLevelLabels[reminder.rudenessLevel as keyof typeof rudenessLevelLabels]}
                            </Badge>
                            <div className="flex items-center space-x-1">
                              {reminder.browserNotification && (
                                <Bell className="text-gray-400 h-3 w-3" />
                              )}
                              {reminder.voiceNotification && (
                                <Volume2 className="text-gray-400 h-3 w-3" />
                              )}
                              {reminder.emailNotification && (
                                <Mail className="text-gray-400 h-3 w-3" />
                              )}
                            </div>
                            {reminder.completed && (
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                Completed
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-2">
                            "{reminder.rudeMessage}"
                          </p>
                          
                          <div className="flex items-center text-xs text-gray-500">
                            <Clock className="mr-1 h-3 w-3" />
                            <span>
                              {new Date(reminder.scheduledFor).toLocaleString()}
                            </span>
                            {!reminder.completed && (
                              <>
                                <span className="mx-2">•</span>
                                <span>{formatTimeRemaining(reminder.scheduledFor)}</span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          {!reminder.completed && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => completeReminderMutation.mutate(reminder.id)}
                              disabled={completeReminderMutation.isPending}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteReminderMutation.mutate(reminder.id)}
                            disabled={deleteReminderMutation.isPending}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}