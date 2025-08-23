import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Settings, Home, Crown, Star } from "lucide-react";
import SettingsModal from "./SettingsModal";
import { HelpMenu } from "./HelpMenu";
import { Link, useLocation } from "wouter";
import type { User } from "@shared/schema";

export default function Navigation() {
  const { user } = useAuth() as { user: User | undefined };
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [location] = useLocation();
  
  

  return (
    <>
      <nav className="bg-white shadow-sm border-b border-gray-200 w-full overflow-hidden">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-16 min-w-0">
            <div className="flex items-center min-w-0 flex-shrink-0">
              <Megaphone className="text-rude-red-600 text-xl mr-2 flex-shrink-0" />
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Rude Reminder</h1>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
              <HelpMenu />
              
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
