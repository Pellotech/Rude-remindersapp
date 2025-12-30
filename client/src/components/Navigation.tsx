import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Settings, Home } from "lucide-react";
import SettingsModal from "./SettingsModal";
import { Link, useLocation } from "wouter";
import type { User } from "@shared/schema";
import logoImage from "@assets/translusant_logo2_1767108484844.png";

export default function Navigation() {
  const { user, isGuest } = useAuth() as { user: User | undefined; isGuest: boolean };
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [location] = useLocation();

  return (
    <>
      <header className="bg-[#C9A063] relative z-50 safe-area-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top row: utility buttons */}
          <div className="flex justify-end items-center pt-3 pb-2">
            <div className="flex items-center space-x-2">
              {/* Show Home button when not on home page */}
              {location !== "/" && (
                <Link href="/">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[#111827]/70 hover:text-[#111827] hover:bg-[#C9A063]/50 p-2"
                  >
                    <Home className="h-4 w-4" />
                  </Button>
                </Link>
              )}

              {!isGuest && (
                <Link href="/settings">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`text-[#111827]/70 hover:text-[#111827] hover:bg-[#C9A063]/50 p-2 ${location === "/settings" ? "bg-[#C9A063]/30 text-[#111827]" : ""}`}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </Link>
              )}

              {isGuest ? (
                <Button
                  onClick={() => window.location.href = '/login'}
                  className="bg-[#C53B3B] hover:bg-[#A83232] text-white text-sm px-4 py-2 font-semibold rounded-[12px] shadow-md"
                  data-testid="button-nav-signin"
                >
                  Sign In
                </Button>
              ) : (
                <div className="flex items-center space-x-2">
                  {user?.profileImageUrl && (
                    <img
                      src={user.profileImageUrl}
                      alt="Profile"
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  )}
                  <span className="text-sm font-medium text-[#111827] hidden sm:inline">
                    {user?.firstName || user?.email || "User"}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.location.href = '/api/logout'}
                    className="text-[#111827]/70 hover:text-[#111827] hover:bg-[#C9A063]/50 text-sm px-3 py-1"
                  >
                    Logout
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Center row: Logo - brand banner */}
          <div className="flex justify-center items-center py-6">
            <Link href="/">
              <img 
                src={logoImage} 
                alt="Rude Reminders" 
                className="w-[200px] sm:w-[240px] h-auto object-contain cursor-pointer"
                data-testid="nav-logo"
              />
            </Link>
          </div>
        </div>
        
        {/* Subtle bottom separator */}
        <div className="h-[1px] bg-gradient-to-r from-transparent via-[#111827]/10 to-transparent" />
      </header>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}
