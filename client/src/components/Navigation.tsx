import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Settings, Home, LogOut } from "lucide-react";
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
        <div className="relative h-[220px] sm:h-[240px] max-w-7xl mx-auto px-4">
          {/* Top-right action area - positioned absolutely within header */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            {/* Show Home button when not on home page */}
            {location !== "/" && (
              <Link href="/">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white border border-gray-200 shadow-sm text-[#C53B3B] hover:bg-[#C53B3B] hover:text-white hover:border-[#C53B3B] active:bg-[#C53B3B] active:text-white h-9 px-3"
                  data-testid="button-nav-home"
                >
                  <Home className="h-4 w-4" />
                </Button>
              </Link>
            )}

            {isGuest ? (
              <Button
                onClick={() => window.location.href = '/login'}
                className="bg-white border border-gray-200 shadow-sm text-[#C53B3B] hover:bg-[#C53B3B] hover:text-white hover:border-[#C53B3B] active:bg-[#C53B3B] active:text-white font-semibold h-9 px-4"
                data-testid="button-nav-signin"
              >
                Sign In
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                {user?.profileImageUrl && (
                  <img
                    src={user.profileImageUrl}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
                  />
                )}
                <Link href="/settings">
                  <Button
                    variant="outline"
                    size="sm"
                    className={`bg-white border border-gray-200 shadow-sm text-[#C53B3B] hover:bg-[#C53B3B] hover:text-white hover:border-[#C53B3B] active:bg-[#C53B3B] active:text-white h-9 px-3 ${location === "/settings" ? "bg-[#C53B3B] text-white border-[#C53B3B]" : ""}`}
                    data-testid="button-nav-settings"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = '/api/logout'}
                  className="bg-white border border-gray-200 shadow-sm text-[#C53B3B] hover:bg-[#C53B3B] hover:text-white hover:border-[#C53B3B] active:bg-[#C53B3B] active:text-white h-9 px-3"
                  data-testid="button-nav-logout"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Centered logo - both horizontally and vertically */}
          <div className="absolute inset-0 flex items-center justify-center">
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
