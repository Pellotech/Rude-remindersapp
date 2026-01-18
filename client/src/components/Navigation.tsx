import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Settings, Home, LogOut } from "lucide-react";
import SettingsModal from "./SettingsModal";
import { Link, useLocation } from "wouter";
import type { User } from "@shared/schema";
import logoImage from "@assets/translusant_logo2_1767108484844.png";
import { clearAuthToken, getFullApiUrl } from "@/lib/queryClient";

export default function Navigation() {
  const { user, isGuest } = useAuth() as { user: User | undefined; isGuest: boolean };
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [location] = useLocation();

  return (
    <>
      <header className="bg-[#C9A063] relative z-50 safe-area-header">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Centered logo */}
          <div className="flex justify-center mb-4">
            <Link href="/">
              <img 
                src={logoImage} 
                alt="Rude Reminders" 
                className="w-[200px] sm:w-[240px] h-auto object-contain cursor-pointer"
                data-testid="nav-logo"
              />
            </Link>
          </div>

          {/* Action buttons below logo, aligned right */}
          <div className="flex justify-end items-center gap-2">
            {/* Show Home button when not on home page */}
            {location !== "/" && (
              <Link href="/">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white border border-gray-200 shadow-sm text-[#C53B3B] hover:bg-[#C53B3B] hover:text-white hover:border-[#C53B3B] active:bg-[#C53B3B] active:text-white h-9 w-9 p-0"
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
                    className={`bg-white border border-gray-200 shadow-sm text-[#C53B3B] hover:bg-[#C53B3B] hover:text-white hover:border-[#C53B3B] active:bg-[#C53B3B] active:text-white h-9 w-9 p-0 ${location === "/settings" ? "bg-[#C53B3B] text-white border-[#C53B3B]" : ""}`}
                    data-testid="button-nav-settings"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { clearAuthToken(); window.location.href = getFullApiUrl('/api/auth/logout'); }}
                  className="bg-white border border-gray-200 shadow-sm text-[#C53B3B] hover:bg-[#C53B3B] hover:text-white hover:border-[#C53B3B] active:bg-[#C53B3B] active:text-white h-9 w-9 p-0"
                  data-testid="button-nav-logout"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
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
