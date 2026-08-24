import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.atrile.app',
  appName: 'Atrile',
  webDir: 'build',
  server: {
    androidScheme: 'https',
  },
};

export default config;
