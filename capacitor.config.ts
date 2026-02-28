import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ru.burlive.app',
  appName: 'Burlive',
  webDir: 'dist',
  server: {
    url: 'https://burlive.ru/webapp/',
    cleartext: false,
    allowNavigation: ['burlive.ru', '*.burlive.ru'],
  },
};

export default config;
