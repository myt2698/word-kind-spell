import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wordmind.app',
  appName: '词音岛',
  webDir: 'dist/public',
  // 指向阿里云 ECS 的 HTTPS 地址，APK 才能访问后端 API
  server: {
    url: 'https://121.43.35.47',
    cleartext: false,
  },
};

export default config;
