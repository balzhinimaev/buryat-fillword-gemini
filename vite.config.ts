import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: ['anoname.ru', 'dev.anoname.ru'],
    hmr: {
      host: 'anoname.ru',
      protocol: 'wss',
      clientPort: 443,
      path: '/__vite_hmr',
    }
  },
  preview: {
    allowedHosts: ['anoname.ru'],
  },
})
