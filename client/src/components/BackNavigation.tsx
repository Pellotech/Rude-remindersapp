import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import { Link } from "wouter";

interface BackNavigationProps {
  showMainPageButton?: boolean;
  customBackPath?: string;
  customBackLabel?: string;
}

export function BackNavigation({ 
  showMainPageButton = true, 
  customBackPath = "/",
  customBackLabel = "Back"
}: BackNavigationProps) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <Link href={customBackPath}>
        <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {customBackLabel}
        </Button>
      </Link>
      
      {showMainPageButton && customBackPath !== "/" && (
        <>
          <div className="h-4 border-l border-gray-300 dark:border-gray-600"></div>
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
              <Home className="h-4 w-4 mr-2" />
              Main Page
            </Button>
          </Link>
        </>
      )}
    </div>
  );
}