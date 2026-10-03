import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.skystairs.app',
  appName: 'SkyStairs',
  webDir: 'dist',
  android: {
    backgroundColor: '#0d041f',
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;