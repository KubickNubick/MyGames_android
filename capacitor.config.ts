import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kubicknubick.bumpybuddy',
  appName: 'Bumpy Buddy',
  webDir: 'dist',
  backgroundColor: '#49a6e0',
  android: {
    allowMixedContent: false,
  },
};

export default config;
