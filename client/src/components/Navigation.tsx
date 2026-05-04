import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Settings, Home, LogOut } from "lucide-react";
import SettingsModal from "./SettingsModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Link, useLocation } from "wouter";
import type { User } from "@shared/schema";
import logoImage from "@assets/translusant_logo2_1767108484844.png";
import { clearAuthToken, apiRequest, queryClient } from "@/lib/queryClient";

export default function Navigation() {
  const { user } = useAuth() as { user: User | undefined };
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [location, navigate] = useLocation();
  
  const handleLogout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore errors - we're logging out anyway
    }
    try {
      const { revenueCatService } = await import('@/services/revenueCatService');
      await revenueCatService.logOut();
    } catch {
      // Ignore - logout shouldn't be blocked by RC errors
    }
    await clearAuthToken();
    await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    await queryClient.invalidateQueries({ queryKey: ['/api/user/premium-status'] });
    navigate('/login');
  };

  return (
    <>
      <header className="bg-[#C9A063] relative z-50 safe-area-header">
        <div className="relative max-w-7xl mx-auto px-4 pt-4 pb-4">
          {/* Centered logo — no bottom margin so header ends at logo bottom */}
          <div className="flex justify-center">
            <Link href="/">
              <img 
                src={logoImage} 
                alt="Rude Reminders" 
                className="w-[200px] sm:w-[240px] h-auto object-contain cursor-pointer"
                data-testid="nav-logo"
              />
            </Link>
          </div>

          {/* Action buttons — pinned to bottom-right of header */}
          <div className="absolute bottom-1 right-4 flex items-center gap-2">
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
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white border border-gray-200 shadow-sm text-[#C53B3B] hover:bg-[#C53B3B] hover:text-white hover:border-[#C53B3B] active:bg-[#C53B3B] active:text-white h-9 w-9 p-0"
                    data-testid="button-nav-logout"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#FDF3E3]">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You'll need to sign back in to see your reminders.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="button-logout-cancel">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleLogout}
                      className="bg-[#C53B3B] text-white hover:bg-[#a82f2f]"
                      data-testid="button-logout-confirm"
                    >
                      Log out
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
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
