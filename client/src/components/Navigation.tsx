import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Settings, Home, Crown, Star, Bell, Shield } from "lucide-react";
import SettingsModal from "./SettingsModal";
import { HelpMenu } from "./HelpMenu";
import { Link, useLocation, useRoute } from "wouter";
import type { User } from "@shared/schema";

export default function Navigation() {
  const { user } = useAuth() as { user: User | undefined };
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [location, navigate] = useLocation();

  // Determine current mode based on URL
  const isCurrentlyPremium = location.includes('premium');
  const [developmentMode, setDevelopmentMode] = useState(isCurrentlyPremium);

  // Handle switching between free and premium pages
  const handleModeChange = (newMode: string) => {
    const isPremium = newMode === "premium";
    setDevelopmentMode(isPremium);

    // Navigate to appropriate page
    if (location === "/" || location === "/home-free" || location === "/home-premium") {
      navigate(isPremium ? "/home-premium" : "/home-free");
    }
  };

  return (
    <>
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 relative z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3 ml-2 flex-1 min-w-0">
              <div className="flex-shrink-0 flex items-center gap-3">
                <div className="p-2 bg-rude-red rounded-lg">
                  <Bell className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    Rude Reminders
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    AI-Powered Motivation
                  </p>
                </div>
              </div>

              {/* Removed the Premium Toggle Input as requested */}
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0 ml-4">{/* Removed HelpMenu from top nav to prevent header overlap */}

              {/* Show Home button when not on home page */}
              {location !== "/" && (
                <Link href="/">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-gray-700 p-2"
                  >
                    <Home className="h-4 w-4" />
                  </Button>
                </Link>
              )}

              <Link href="/admin">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-gray-500 hover:text-gray-700 p-2 ${location === "/admin" ? "bg-gray-100 text-gray-900" : ""}`}
                  title="Admin Panel"
                >
                  <Shield className="h-4 w-4" />
                </Button>
              </Link>

              <Link href="/settings">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-gray-500 hover:text-gray-700 p-2 ${location === "/settings" ? "bg-gray-100 text-gray-900" : ""}`}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>

              <div className="flex items-center space-x-1 sm:space-x-2 ml-1 sm:ml-2">
                {user?.profileImageUrl && (
                  <img
                    src={user.profileImageUrl}
                    alt="Profile"
                    className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover flex-shrink-0"
                  />
                )}
                <span className="text-xs sm:text-sm font-medium text-gray-700 truncate max-w-20 sm:max-w-none hidden sm:inline">
                  {user?.firstName || user?.email || "User"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.href = '/api/logout'}
                  className="text-gray-500 hover:text-gray-700 text-xs sm:text-sm px-2 py-1 flex-shrink-0"
                >
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </>
  );
}