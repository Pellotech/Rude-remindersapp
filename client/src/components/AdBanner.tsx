import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, ExternalLink, Smartphone } from "lucide-react";

interface AdBannerProps {
  isPremium: boolean;
  isMobile?: boolean;
}

export function AdBanner({ isPremium, isMobile = false }: AdBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Don't show ads for premium users
  if (isPremium || !isVisible) {
    return null;
  }

  const handleAdClick = () => {
    // Placeholder for ad tracking/analytics
    console.log("Ad clicked - track engagement");
  };

  const handleClose = () => {
    setIsVisible(false);
    // Store in localStorage to remember user preference for session
    localStorage.setItem('ad-banner-dismissed', 'true');
  };

  // Check if user previously dismissed ads this session
  if (localStorage.getItem('ad-banner-dismissed') === 'true') {
    return null;
  }

  return (
    <div className={`${
      isMobile 
        ? 'fixed bottom-16 left-2 right-2 z-40' 
        : 'fixed bottom-4 left-4 z-40 max-w-sm'
    }`}>
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 shadow-lg">
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Smartphone className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-medium text-blue-800">
                  Sponsored
                </span>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-900">
                  Boost Your Productivity
                </h4>
                <p className="text-xs text-gray-600 leading-tight">
                  Try TaskMaster Pro - Advanced project management with AI insights
                </p>
                
                <Button 
                  size="sm" 
                  className="w-full text-xs bg-blue-600 hover:bg-blue-700"
                  onClick={handleAdClick}
                  data-testid="ad-banner-cta"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Learn More
                </Button>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
              data-testid="ad-banner-close"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="mt-2 pt-2 border-t border-blue-100">
            <p className="text-xs text-blue-600 text-center">
              Ad-free experience with Premium
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}