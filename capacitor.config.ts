import type { CapacitorConfig } from '@capacitor/cli';

// Офлайн-сборка: server.url убран — приложение грузит встроенные ассеты (webDir),
// а не живой сайт. Работает без сети.
const config: CapacitorConfig = {
  appId: 'ru.burlive.app',
  appName: 'Burlive',
  webDir: 'dist',
};

export default config;
