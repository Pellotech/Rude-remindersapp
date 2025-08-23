import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Clock, Target, Zap, Calendar, MessageSquare } from "lucide-react";
import ReminderForm from "@/components/ReminderForm";
import type { Reminder } from "@shared/schema";

export default function PageTwo() {
  const [showForm, setShowForm] = useState(false);

  const { data: reminders = [], isLoading: remindersLoading } = useQuery<Reminder[]>({
    queryKey: ["/api/reminders"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/stats"],
  });

  if (remindersLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-rude-red-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Page Two</h1>
          <p className="text-xl text-gray-600">Your brutally honest reminder companion</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white shadow-lg border-l-4 border-l-rude-red-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Reminders</CardTitle>
              <Bell className="h-4 w-4 text-rude-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rude-red-600">
                {stats?.activeReminders || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently scheduled
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
              <Target className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats?.completedToday || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Tasks finished
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Rudeness</CardTitle>
              <Zap className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {stats?.avgRudeness ? `${stats.avgRudeness}/5` : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">
                Motivation level
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Create Reminder Section */}
        <Card className="mb-8 bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-rude-red-600" />
              Create New Reminder
            </CardTitle>
            <CardDescription>
              Set up a new reminder and let AI transform it into motivational magic
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showForm ? (
              <Button
                onClick={() => setShowForm(true)}
                className="w-full bg-rude-red-600 hover:bg-rude-red-700"
                data-testid="button-create-reminder"
              >
                Create Your First Reminder
              </Button>
            ) : (
              <ReminderForm 
                onSuccess={() => setShowForm(false)}
                onCancel={() => setShowForm(false)}
              />
            )}
          </CardContent>
        </Card>

        {/* Active Reminders */}
        <Card className="bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-rude-red-600" />
              Your Active Reminders
            </CardTitle>
            <CardDescription>
              All your scheduled reminders with their rude transformations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reminders.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No reminders yet</h3>
                <p className="text-gray-500">Create your first reminder to get started!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    data-testid={`reminder-card-${reminder.id}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900">{reminder.title}</h4>
                      <Badge variant="outline" className="bg-rude-red-50 text-rude-red-700 border-rude-red-200">
                        Rudeness: {reminder.rudenessLevel}/5
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{reminder.message}</p>
                    {reminder.rudeMessage && (
                      <div className="bg-rude-red-50 border border-rude-red-200 rounded-md p-3 mb-2">
                        <p className="text-sm text-rude-red-800 font-medium">
                          💥 Rude Version: {reminder.rudeMessage}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>
                        {reminder.scheduledFor
                          ? new Date(reminder.scheduledFor).toLocaleString()
                          : "Not scheduled"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}