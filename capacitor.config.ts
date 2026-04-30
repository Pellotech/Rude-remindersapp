import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rudereminders.app',
  appName: 'Rude Reminders',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    // COMMENTED OUT FOR APP STORE BUILDS - app loads from local bundle
    // url: 'https://b5ac04f4-914d-4b4c-9d0e-8469759b5af1-00-qkc03alh73v0.janeway.replit.dev',
    cleartext: true
  },
  plugins: {
    Camera: {
      permissions: ["camera", "photos"]
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#488AFF",
      sound: "beep.wav"
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#FDF3E3",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_INSIDE",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    }
  }
};

export default config;