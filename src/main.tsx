import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AuthWrapper from './AuthWrapper'
import { setupChunkLoadErrorRecovery } from './utils/chunkRecovery'
import { initVkMiniApp } from './services/vkMiniApp'

// Импортируем типы Telegram
import './types/telegram'

setupChunkLoadErrorRecovery()
// VK Mini App: обязательный хендшейк с контейнером ВК как можно раньше
initVkMiniApp()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthWrapper />
  </StrictMode>,
)
