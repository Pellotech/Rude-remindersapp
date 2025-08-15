import { Capacitor } from '@capacitor/core';

export interface PlatformInfo {
  isNative: boolean;
  isWeb: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  platform: string;
}

export function getPlatformInfo(): PlatformInfo {
  const platform = Capacitor.getPlatform();
  
  return {
    isNative: Capacitor.isNativePlatform(),
    isWeb: platform === 'web',
    isIOS: platform === 'ios',
    isAndroid: platform === 'android',
    platform: platform
  };
}

export function isMobile(): boolean {
  const platform = getPlatformInfo();
  return platform.isIOS || platform.isAndroid;
}

export function supportsCamera(): boolean {
  return Capacitor.isPluginAvailable('Camera');
}

export function supportsNotifications(): boolean {
  return Capacitor.isPluginAvailable('LocalNotifications');
}

export function supportsStatusBar(): boolean {
  return Capacitor.isPluginAvailable('StatusBar');
}