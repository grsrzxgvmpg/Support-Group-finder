import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.supportgroupfinder.app',
  appName: 'Support Groups',
  webDir: 'dist',
  android: {
    allowMixedContent: false
  },
  ios: {
    contentInset: 'automatic'
  },
  server: {
    androidScheme: 'https'
  }
};

export default config;
