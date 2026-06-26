import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Офлайн-сборка (нативное приложение) грузит ассеты из корня вебвью → база относительная.
  // Веб-деплой раздаётся под /webapp/ → база '/webapp/'.
  const base = env.VITE_OFFLINE_MODE === 'true' ? './' : '/webapp/'
  return {
  base,
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: ['burlive.ru', 'www.burlive.ru'],
    hmr: {
      host: 'burlive.ru',
      protocol: 'wss',
      clientPort: 443,
      path: '/__vite_hmr',
    }
  },
  preview: {
    allowedHosts: ['burlive.ru', 'www.burlive.ru', 'buryat-game.ru', 'www.buryat-game.ru'],
  },
  }
})
