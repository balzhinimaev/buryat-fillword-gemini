import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AuthWrapper from './AuthWrapper'
import { setupChunkLoadErrorRecovery } from './utils/chunkRecovery'

// Импортируем типы Telegram
import './types/telegram'

setupChunkLoadErrorRecovery()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthWrapper />
  </StrictMode>,
)
