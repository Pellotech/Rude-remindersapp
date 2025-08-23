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
  CircleSlash2
} from "lucide-react";
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

export default function RemindersList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

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
                <SelectItem value="all">All Reminders</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
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
          <div className="space-y-4">
            {filteredReminders.map((reminder: Reminder) => (
              <div
                key={reminder.id}
                className="p-3 sm:p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
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
                    "{reminder.rudeMessage}"
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
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
