import { useEffect } from "react";
import { StatusBar, Style } from "@capacitor/status-bar";
import { getPlatformInfo } from "@/utils/platformDetection";

export function useMobileStatusBar() {
  useEffect(() => {
    const platform = getPlatformInfo();
    
    if (platform.isNative) {
      // Set status bar style for mobile
      StatusBar.setStyle({ style: Style.Default });
      
      // Show status bar
      StatusBar.show();
      
      // Set background color to match app theme
      if (platform.isAndroid) {
        StatusBar.setBackgroundColor({ color: '#ffffff' });
      }
    }
  }, []);
}