import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wordmind.app',
  appName: 'WordMind',
  webDir: 'dist/public',
  // 指向 Railway 公网地址，APK 才能访问后端 API
  server: {
    url: 'https://wordmind-production.up.railway.app',
    cleartext: false,
  },
};

export default config;
