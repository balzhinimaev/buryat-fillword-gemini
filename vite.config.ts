import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/webapp/',
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
    allowedHosts: ['burlive.ru', 'www.burlive.ru'],
  },
})
