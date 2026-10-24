import type { CapacitorConfig } from '@capacitor/cli';

// Офлайн-сборка: server.url убран — приложение грузит встроенные ассеты (webDir),
// а не живой сайт. Работает без сети.
const config: CapacitorConfig = {
  appId: 'ru.burlive.app',
  appName: 'Burlive',
  webDir: 'dist',
  plugins: {
    // OTA веб-обновления в ручном режиме (проверку/применение делаем сами из otaUpdate.ts).
    CapacitorUpdater: {
      autoUpdate: false,
    },
  },
};

export default config;
