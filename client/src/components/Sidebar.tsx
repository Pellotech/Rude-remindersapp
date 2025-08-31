import { Bell, Calendar, CheckCircle, Clock, TrendingUp, Trophy, Zap, Target } from "lucide-react";
import { ShareButton } from "./ShareButton";

export default function Sidebar() {
  // Mock stats for demonstration purposes. In a real app, this would come from state or props.
  const stats = {
    completedToday: 5, // Example: User has completed 5 tasks today
    totalCompleted: 120,
    streak: 7,
    longestStreak: 15,
  };

  return (
    <div className="space-y-6">
      {/* Sidebar content can be added here if needed, e.g., navigation links */}
      <div className="text-center text-gray-500 text-sm py-8">
        <p>All settings and stats have been moved to the Settings page for better organization.</p>

        {/* Displaying some mock stats for context, even though they are moved to Settings */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Total Tasks Completed</span>
            <span className="text-sm text-muted-foreground">{stats.totalCompleted}</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Current Streak</span>
            <span className="text-sm text-muted-foreground">{stats.streak} days</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Longest Streak</span>
            <span className="text-sm text-muted-foreground">{stats.longestStreak} days</span>
          </div>
          {/* Daily Goal display with share button */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <span className="text-sm font-medium">Daily Goal</span>
            <span className="text-sm text-muted-foreground">
              {stats.completedToday}/{Math.max(3, stats.completedToday)}
            </span>
          </div>

          {stats.completedToday >= 3 && (
            <div className="mt-3 pt-3 border-t">
              <ShareButton
                title="🎉 Daily goal achieved!"
                message={`Just completed ${stats.completedToday} tasks today with Rude Reminders! This app keeps me on track with the perfect amount of motivation.`}
                hashtags={["RudeReminders", "ProductivityWin", "GoalAchieved", "Motivated"]}
                className="w-full text-xs"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}