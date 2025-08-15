import { useEffect, useState } from "react";
import { getPlatformInfo, supportsCamera, supportsNotifications } from "@/utils/platformDetection";
import { useMobileNotifications } from "@/components/MobileNotifications";
import { Device, DeviceInfo } from "@capacitor/device";

export interface MobileFeatures {
  isNative: boolean;
  isWeb: boolean;
  hasCamera: boolean;
  hasNotifications: boolean;
  deviceInfo: DeviceInfo | null;
  platformName: string;
}

export function useMobileFeatures(): MobileFeatures {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const platform = getPlatformInfo();
  
  useEffect(() => {
    if (platform.isNative) {
      Device.getInfo().then(setDeviceInfo);
    }
  }, [platform.isNative]);

  return {
    isNative: platform.isNative,
    isWeb: platform.isWeb,
    hasCamera: supportsCamera(),
    hasNotifications: supportsNotifications(),
    deviceInfo,
    platformName: platform.platform
  };
}

// Hook for mobile-optimized UI adjustments
export function useMobileUI() {
  const features = useMobileFeatures();
  
  return {
    ...features,
    // Mobile-specific UI configurations
    buttonSize: features.isNative ? "lg" : "default",
    touchTarget: features.isNative ? "min-h-12" : "min-h-10",
    fontSize: features.isNative ? "text-lg" : "text-base",
    spacing: features.isNative ? "space-y-6" : "space-y-4",
  };
}