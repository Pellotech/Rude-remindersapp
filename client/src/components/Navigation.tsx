import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Megaphone, Settings } from "lucide-react";
import SettingsModal from "./SettingsModal";
import { Link } from "wouter";
import type { User } from "@shared/schema";

export default function Navigation() {
  const { user } = useAuth() as { user: User | undefined };
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Megaphone className="text-rude-red-600 text-xl mr-3" />
              <h1 className="text-xl font-bold text-gray-900">Rude Reminder</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/settings">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-700"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center space-x-3">
                {user?.profileImageUrl && (
                  <img
                    src={user.profileImageUrl}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                )}
                <span className="text-sm font-medium text-gray-700">
                  {user?.firstName || user?.email || "User"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.href = '/api/logout'}
                  className="text-gray-500 hover:text-gray-700"
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
