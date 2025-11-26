import { Capacitor } from '@capacitor/core';

export async function initializeSafeArea() {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const { SafeArea } = await import('capacitor-plugin-safe-area');
    
    const { insets } = await SafeArea.getSafeAreaInsets();
    
    for (const [key, value] of Object.entries(insets)) {
      document.documentElement.style.setProperty(
        `--safe-area-inset-${key}`,
        `${value}px`
      );
    }

    await SafeArea.addListener('safeAreaChanged', (data) => {
      const { insets } = data;
      for (const [key, value] of Object.entries(insets)) {
        document.documentElement.style.setProperty(
          `--safe-area-inset-${key}`,
          `${value}px`
        );
      }
    });

  } catch (error) {
    console.warn('Safe area plugin not available:', error);
  }
}
