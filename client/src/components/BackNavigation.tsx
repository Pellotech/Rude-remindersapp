import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import { useLocation } from "wouter";

interface BackNavigationProps {
  showMainPageButton?: boolean;
  customBackPath?: string;
  customBackLabel?: string;
  className?: string;
}

export function BackNavigation({ 
  showMainPageButton = true, 
  customBackPath = "/",
  customBackLabel = "Back",
  className = ""
}: BackNavigationProps) {
  const [, setLocation] = useLocation();

  const handleBackClick = () => {
    setLocation(customBackPath);
  };

  const handleHomeClick = () => {
    setLocation("/");
  };

  return (
    <header className={`bg-white dark:bg-gray-900 ${className}`} style={{ paddingTop: 'env(safe-area-inset-top, 20px)' }}>
      <div className="flex items-center gap-4 px-4 py-3 mb-3">
        <Button 
          onClick={handleBackClick}
          variant="ghost" 
          size="sm" 
          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {customBackLabel}
        </Button>
        
        {showMainPageButton && customBackPath !== "/" && (
          <>
            <div className="h-4 border-l border-gray-300 dark:border-gray-600"></div>
            <Button 
              onClick={handleHomeClick}
              variant="ghost" 
              size="sm" 
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              data-testid="button-main-page"
            >
              <Home className="h-4 w-4 mr-2" />
              Main Page
            </Button>
          </>
        )}
      </div>
    </header>
  );
}