import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor Configuration
 * 
 * To rename your app:
 * 1. Change `appId` (e.g., 'com.yourname.yourapp')
 * 2. Change `appName` (e.g., 'My Cool Mobile App')
 * 3. Run `npm run cap:sync`
 */
const config: CapacitorConfig = {
  appId: 'com.template.mobiledev',
  appName: 'Mobile Starter',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false
  },
  plugins: {
    CapacitorUpdater: {
      // Manual control: disable automatic background downloads and reloads
      // We handle the lifecycle deterministically via src/lib/otaUpdater.js
      autoUpdate: false,
      resetWhenUpdate: false,
      statsUrl: ''
    },
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#090d16',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#090d16'
    }
  }
};

export default config;
